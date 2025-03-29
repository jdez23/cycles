from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from spotify_api.util import execute_spotify_api_request, is_spotify_authenticated
from django.db.models import Q
from rest_framework import generics
from .serializers import *
from .models import *
from django.conf import settings
from django.http import JsonResponse
from users.models import Follow
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
import logging
# import openai
from django.db import transaction


logger = logging.getLogger(__name__)

# Create your views here.


# GET ALL PLAYLISTS (DISCOVER FEED)
class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = UserPlaylistSerializer
    pagination_class = None

    def list(self, request, *args, **kwargs):
        user = request.user
        has_uploaded = Playlist.objects.filter(user=user).exists()

        if has_uploaded:
            # Return all playlists if user has uploaded a playlist
            playlists = Playlist.objects.all().order_by('?')
        else:
            # Return only 4 playlists if the user hasn't uploaded a playlist
            playlists = Playlist.objects.all()[:6]

        serializer = self.serializer_class(playlists, many=True)
        return Response({
            "has_uploaded": has_uploaded,
            "playlists": serializer.data
        })


# GET PLAYLIST DETAILS /UPDATE PLAYLIST
class PlaylistDetails(APIView):
    queryset = Playlist.objects.all()

    def get(self, request):
        try:
            playlist_id = request.GET.get('id')
            if not playlist_id:
                return JsonResponse({'error': 'Playlist ID is required.'}, status=400)

            # Get the playlist object
            playlist = Playlist.objects.get(id=playlist_id)

            # Check if the current user has liked the playlist
            is_liked = Like.objects.filter(
                user=request.user, playlist=playlist, like=True).exists()

            # Serialize the playlist data
            playlist_serializer = PlaylistDetailSerializer(
                playlist, context={'is_liked': is_liked})

            # Get the tracks associated with the playlist
            tracks = PlaylistTracks.objects.filter(
                playlist_id=playlist.id).order_by('id')

            # Implement pagination for the tracks queryset
            paginator = PageNumberPagination()
            paginator.page_size = 10  # Set the page size, can be adjusted or configured in settings
            paginated_tracks = paginator.paginate_queryset(tracks, request)

            # Serialize the paginated data
            tracks_serializer = PlaylistTracksSerializer(
                paginated_tracks, many=True)

            response_data = {
                "playlist": playlist_serializer.data,
                "tracks": tracks_serializer.data,
                "count": paginator.page.paginator.count,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
            }

            return Response(response_data, status=status.HTTP_200_OK)
        except Playlist.DoesNotExist:
            return JsonResponse({'error': 'Playlist not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': 'An unexpected error occurred.' + e}, status=500)

    def put(self, request):
        try:
            user = self.request.user
            playlist_id = request.GET.get("playlist_id")
            playlist = Playlist.objects.get(id=playlist_id)
            spotify_playlistID = playlist.playlist_id

            # Update playlist
            is_spotify_authenticated(user)
            playlist_endpoint = f"v1/playlists/{spotify_playlistID}"
            response = execute_spotify_api_request(user, playlist_endpoint)

            if not response:
                return Response({'error': 'Failed to fetch playlist details from Spotify API.'}, status=status.HTTP_502_BAD_GATEWAY)

            playlist.playlist_url = response["external_urls"]["spotify"]
            playlist.playlist_description = response["description"]
            playlist.playlist_ApiURL = response["href"]
            playlist.playlist_id = response["id"]
            playlist.playlist_cover = response["images"][0]["url"]
            playlist.playlist_title = response["name"]
            playlist.playlist_type = response["type"]
            playlist.playlist_uri = response["uri"]
            playlist.playlist_tracks = playlist.playlist_tracks
            playlist.save(update_fields=[
                'user', 'playlist_url', 'playlist_description', 'playlist_ApiURL',
                'playlist_id', 'playlist_cover', 'playlist_title', 'playlist_type', 'playlist_uri', 'playlist_tracks'
            ])

            # Fetch Spotify playlist tracks with pagination
            tracks_endpoint = f'v1/playlists/{spotify_playlistID}/tracks'
            all_tracks = []

            while tracks_endpoint:
                tracks_response = execute_spotify_api_request(
                    user, tracks_endpoint)

                if not tracks_response or "items" not in tracks_response:
                    return Response({'error': 'Failed to retrieve tracks from Spotify API.'}, status=status.HTTP_502_BAD_GATEWAY)

                for item in tracks_response["items"]:
                    track = item.get("track")
                    # Skip if track is None or not of type "track" (e.g., it's an episode)
                    if not track or track.get("type") != "track":
                        logger.info("Skipping item because it is not a song.")
                        continue

                    # Skip track if preview_url is None or empty (since your DB requires it)
                    if not track.get("preview_url"):
                        logger.info(
                            "Skipping track because preview_url is missing.")
                        continue

                    try:
                        all_tracks.append({
                            "artist": track["artists"][0]["name"],
                            "album": track["album"]["name"],
                            "name": track["name"],
                            "track_id": track["id"],
                            "track_url": track["external_urls"]["spotify"],
                            "uri": track["uri"],
                            "preview_url": track["preview_url"],
                            "images": track["album"]["images"][0]['url'],
                        })
                    except (KeyError, IndexError) as e:
                        logger.warning(f"Skipping invalid track data: {e}")
                        continue

                tracks_endpoint = tracks_response.get(
                    "next")  # Handle pagination

            # Delete existing tracks and save new ones
            PlaylistTracks.objects.filter(playlist=playlist).delete()
            PlaylistTracks.objects.bulk_create([
                PlaylistTracks(
                    playlist=playlist,
                    artist=track['artist'],
                    album=track['album'],
                    name=track['name'],
                    track_id=track['track_id'],
                    track_url=track['track_url'],
                    uri=track['uri'],
                    preview_url=track['preview_url'],
                    images=track['images']
                )
                for track in all_tracks
            ])

            # Serialize updated playlist and tracks
            playlist_serializer = PlaylistDetailSerializer(playlist)
            tracks = PlaylistTracks.objects.filter(playlist=playlist)
            tracks_serializer = PlaylistTracksSerializer(tracks, many=True)

            return Response({
                'playlistDetails': playlist_serializer.data,
                'playlistTracks': tracks_serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Error updating playlist and tracks")
            return Response({'error': f'Failed to update playlist. {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# GET SPECIFIC USERS PLAYLISTS (PROFILE SCREEN)
class UserPlaylists(APIView):
    serializer_class = UserPlaylistSerializer

    def get(self, request):
        try:
            user = request.GET.get('id')
            playlist = Playlist.objects.filter(user_id=user).order_by('-date')

            # Implement pagination
            paginator = PageNumberPagination()
            paginator.page_size = 10

            result_page = paginator.paginate_queryset(
                playlist, request)

            serializer = UserPlaylistSerializer(result_page, many=True)

            return paginator.get_paginated_response(serializer.data)
        except:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)


# DELETE, GET & POST MY PLAYLISTS
class MyPlaylists(APIView):
    queryset = Playlist.objects.all()

    def get(self, request):
        try:
            user = self.request.user
            playlist = Playlist.objects.filter(user=user).order_by('-date')
            serializer = PlaylistSerializer(playlist, many=True)

            # Implement pagination
            paginator = PageNumberPagination()
            paginator.page_size = 10
            result_page = paginator.paginate_queryset(
                serializer.data, request)

            return paginator.get_paginated_response(result_page)
        except:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)

    def post(self, request):
        serializer = PlaylistSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data

                with transaction.atomic():  # Ensures all operations succeed together
                    # Create the playlist
                    playlist = Playlist.objects.create(
                        user=request.user,
                        playlist_url=data["playlist_url"],
                        playlist_ApiURL=data["playlist_ApiURL"],
                        playlist_id=data["playlist_id"],
                        playlist_cover=data["playlist_cover"],
                        playlist_title=data["playlist_title"],
                        playlist_description=data["playlist_description"],
                        playlist_type=data["playlist_type"],
                        playlist_uri=data["playlist_uri"],
                        playlist_tracks=data["playlist_tracks"],
                    )

                    # Add hashtags (tags)
                    playlist.hashtags.set(data["hashtags"])

                    # Fetch and filter tracks
                    endpoint = f'v1/playlists/{data["playlist_id"]}/tracks'
                    all_tracks = []
                    while endpoint:
                        response = execute_spotify_api_request(
                            request.user, endpoint)

                        if not response or "items" not in response:
                            break

                        for item in response["items"]:
                            track = item.get("track")

                            # Skip if track is None, not a "track", or missing preview URL
                            if not track or track.get("type") != "track":
                                logger.info(
                                    "Skipping item because it is not a song.")
                                continue

                            if not track.get("preview_url"):
                                logger.info(
                                    "Skipping track because preview_url is missing.")
                                continue

                            try:
                                all_tracks.append(PlaylistTracks(
                                    playlist=playlist,
                                    artist=track["artists"][0]["name"],
                                    album=track["album"]["name"],
                                    name=track["name"],
                                    track_id=track["id"],
                                    track_url=track["external_urls"]["spotify"],
                                    uri=track["uri"],
                                    preview_url=track["preview_url"],
                                    images=track["album"]["images"][0]["url"] if track["album"]["images"] else "",
                                ))
                            except (KeyError, IndexError) as e:
                                logger.warning(
                                    f"Skipping track due to missing data: {e}")
                                continue

                        # Handle pagination
                        endpoint = response.get("next")

                    # Bulk insert valid tracks
                    if all_tracks:
                        PlaylistTracks.objects.bulk_create(
                            all_tracks, batch_size=100)

                    return Response(
                        {'success': f'Playlist added with {len(all_tracks)} valid tracks.'},
                        status=status.HTTP_201_CREATED,
                    )

            except Exception as e:
                logger.exception("Error saving playlist and tracks")
                return Response(
                    {'error': f'Failed to save playlist. {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, format=None):
        playlist_id = request.GET.get("id")
        try:
            # Retrieve the playlist to be deleted
            playlist = Playlist.objects.get(id=playlist_id)

            # Get the hashtags associated with this playlist
            hashtags = playlist.hashtags.all()

            # Delete the playlist
            playlist.delete()

            # Delete hashtags that are no longer associated with any playlist
            for hashtag in hashtags:
                if hashtag.playlists.count() == 0:  # Check if the hashtag is orphaned
                    hashtag.delete()

            return Response(status=status.HTTP_200_OK)
        except Playlist.DoesNotExist:
            return JsonResponse({'error': 'Playlist not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)


# GET PLAYLIST FROM USERS I'M FOLLOWING + MINE (FOLLOWING FEED)
class FollowingPlaylists(generics.ListAPIView):
    serializer_class = FollowingPlaylistSerializer

    def get_queryset(self):
        try:
            user = self.request.user
            following = Follow.objects.filter(
                user_id=user).values('following_user_id')
            playlists = Playlist.objects.filter(
                user_id__in=following) | Playlist.objects.filter(user_id=user)

            if len(playlists) > 0:
                return playlists.order_by('-date')
            else:
                return Playlist.objects.none()
        except Exception as e:
            logger.exception("-------", e)


# Get playlists by hashtag
class PlaylistsByHashtagView(APIView):
    def get(self, request):
        hashtag = request.GET.get('hashtag', '').strip()
        try:
            # Filter playlists with the specific hashtag
            playlists = Playlist.objects.filter(
                hashtags__name__icontains=hashtag)

            # Serialize the playlists
            serializer = PlaylistbyHashtagSerializer(playlists, many=True)

            # Implement pagination
            paginator = PageNumberPagination()
            paginator.page_size = 10
            result_page = paginator.paginate_queryset(
                serializer.data, request)

            return paginator.get_paginated_response(result_page)

        except Exception as e:
            return Response(
                {'error': f'An error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# LIKE // UNLIKE // GET LIKE
class LikesViewSet(APIView):
    serializer_class = LikesSerializer

    # CHECKS IF CURRENT USER LIKES PLAYLIST
    def get(self, request):
        user = self.request.user
        playlist_id = request.GET.get('id')
        isLiked = Like.objects.filter(
            user=user).filter(playlist_id=playlist_id).values('like')

        if isLiked.exists():
            return Response(True, status=status.HTTP_200_OK)

        return Response(False, status=status.HTTP_200_OK)

    # LETS CURRENT USER LIKE PLAYLIST
    def post(self, request):
        try:
            user = self.request.user
            playlist = request.data.get('id')
            playlist = Playlist.objects.get(id=playlist)
            like = request.data.get('like')

            like = Like.objects.create(
                user=user, playlist=playlist, like=like)

            like.save()

            serializer = LikesSerializer(like)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)

    # LETS CURRENT USER UNLIKE PLAYLIST
    def delete(self, request, format=None):
        try:
            playlist_id = request.GET.get('id')
            user = self.request.user

            Like.objects.filter(user=user).filter(
                playlist=playlist_id).delete()

            return Response(False, status=status.HTTP_200_OK)
        except:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)


# POST // DELETE // GET COMMENTS
class CommentView(APIView):
    serializer_class = CommentSerializer

    # LETS CURRENT USER POST COMMENT
    def post(self, request):
        try:
            user = self.request.user
            playlist_id = request.data.get('id')
            title = request.data.get('title')
            playlist = Playlist.objects.get(id=playlist_id)

            comment = Comment.objects.create(
                user=user, playlist=playlist, title=title)
            comment.save()
            CommentSerializer(comment)

            return Response(status=status.HTTP_201_CREATED)
        except:
            return JsonResponse(status=500)

    # LETS USER DELETE SPECIFIC COMMENT
    def delete(self, request):
        try:
            comment_id = request.GET.get('id')
            Comment.objects.filter(id=comment_id).delete()
            return Response(status=status.HTTP_200_OK)
        except:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)

    # GETS ALL COMMENTS FOR CURRENT PLAYLIST
    def get(self, request):
        try:
            playlist_id = request.query_params.get('id')
            playlist = Playlist.objects.get(id=playlist_id)
            comment = Comment.objects.filter(
                playlist=playlist).order_by('-date')
            serializer = CommentSerializer(comment, many=True)

            # Implement pagination
            paginator = PageNumberPagination()
            paginator.page_size = 10
            result_page = paginator.paginate_queryset(
                serializer.data, request)

            return paginator.get_paginated_response(result_page)
        except:
            return JsonResponse({'error': 'An unexpected error occurred.'})


class SearchView(generics.ListAPIView):
    serializer_class = CombinedSearchSerializer

    def get_queryset(self):
        # Extract search query from request
        query = self.request.query_params.get('q', '')

        # Get users and playlists based on the search query
        queryset_users = User.objects.filter(
            Q(name__icontains=query) |
            Q(username__icontains=query)
        )

        queryset_playlists = Playlist.objects.filter(
            Q(playlist_title__icontains=query)
        )

        # Combine querysets into a unified list
        combined_results = list(queryset_users) + list(queryset_playlists)

        return combined_results


# Update playlist track_id and track_url from Spotify
class GetDescription(APIView):
    queryset = Playlist.objects.all()

    def put(self, request):
        try:
            playlists = Playlist.objects.all()
            user = self.request.user

            for playlist in playlists:
                id = playlist.playlist_id

                # Update playlist
                is_spotify_authenticated(user)
                playlist_endpoint = "v1/playlists/"+id
                response = execute_spotify_api_request(user, playlist_endpoint)

                playlist.playlist_url = response["external_urls"]["spotify"]
                playlist.playlist_description = response["description"]
                playlist.playlist_ApiURL = response["href"]
                playlist.playlist_id = response["id"]
                playlist.playlist_cover = response["images"][0]["url"]
                playlist.playlist_title = response["name"]
                playlist.playlist_type = response["type"]
                playlist.playlist_uri = response["uri"]
                playlist.playlist_tracks = playlist.playlist_tracks

                playlist.save(update_fields=['playlist_url', 'playlist_description', 'playlist_ApiURL', 'playlist_id', 'playlist_cover',
                                             'playlist_title', 'playlist_type', 'playlist_uri', 'playlist_tracks'])

                playlist_serializer = PlaylistDetailSerializer(playlist)

                playlistDetails = {'playlistDetails': playlist_serializer.data}

                print('---', playlist)

            return Response(playlistDetails, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('-----::', e)


# @api_view(['POST'])
# def generate_playlist(request):
#     user = request.user
#     original_playlist_id = request.data.get('playlist_id')
#     description = request.data.get('description')

#     # Step 1: Fetch first 20 tracks from Spotify playlist
#     spotify_headers = {
#         'Authorization': f'Bearer {user.spotify_token}'
#     }
#     spotify_url = f'https://api.spotify.com/v1/playlists/{original_playlist_id}/tracks?limit=20'
#     response = requests.get(spotify_url, headers=spotify_headers)
#     tracks = response.json()['items']
#     track_list = [
#         f"{track['track']['name']} by {track['track']['artists'][0]['name']}"
#         for track in tracks
#     ]

#     # Step 2: Use ChatGPT to generate similar tracks
#     prompt = (
#         f"Analyze the following playlist and user description to generate a similar playlist:\n"
#         f"Playlist:\n{', '.join(track_list)}\n"
#         f"User description: {description}"
#     )
#     openai.api_key = settings.OPENAI_API_KEY
#     ai_response = openai.ChatCompletion.create(
#         model="gpt-4",
#         messages=[{"role": "user", "content": prompt}]
#     )
#     generated_songs = ai_response['choices'][0]['message']['content'].splitlines()

#     # Step 3: Add generated songs to Spotify playlist
#     create_playlist_url = "https://api.spotify.com/v1/users/{user.spotify_id}/playlists"
#     playlist_response = requests.post(
#         create_playlist_url,
#         headers=spotify_headers,
#         json={"name": "Generated Playlist", "description": description}
#     )
#     new_playlist_id = playlist_response.json()['id']

#     # Search for each song and add to the playlist
#     search_url = "https://api.spotify.com/v1/search"
#     track_uris = []
#     for song in generated_songs:
#         query = song.replace(" by ", " ")
#         search_response = requests.get(search_url, headers=spotify_headers, params={"q": query, "type": "track", "limit": 1})
#         results = search_response.json().get('tracks', {}).get('items', [])
#         if results:
#             track_uris.append(results[0]['uri'])

#     add_tracks_url = f"https://api.spotify.com/v1/playlists/{new_playlist_id}/tracks"
#     requests.post(add_tracks_url, headers=spotify_headers, json={"uris": track_uris})

#     # Save the playlist and tracks in the database
#     new_playlist = Playlist.objects.create(
#         name="Generated Playlist",
#         description=description,
#         user=user,
#         spotify_id=new_playlist_id,
#     )
#     for song, uri in zip(generated_songs, track_uris):
#         title, artist = song.split(" by ")
#         Track.objects.create(
#             playlist=new_playlist,
#             title=title.strip(),
#             artist=artist.strip(),
#             spotify_id=uri
#         )

#     return Response({"message": "Playlist created successfully", "playlist_id": new_playlist.id})


# class GeneratePlaylistView(APIView):
#     openai.api_key = settings.OPEN_AI_KEY

#     def post(self, request):
#         """
#         Analyzes up to the first 20 tracks from the base playlist + user description,
#         asks ChatGPT for recommended songs, and then creates a new playlist on Spotify
#         with those recommended songs.
#         """
#         user = request.user
#         spotify_access_token = user.spotify_access_token
#         id_endpoint = 'v1/me'
#         spotify_username = execute_spotify_api_request(user, id_endpoint)
#         spotify_id = spotify_username['id']

#         base_playlist_id = request.data.get("playlist_id")
#         description = request.data.get("description")

#         if not base_playlist_id:
#             return Response({"error": "Missing base_playlist_id."}, status=400)

#         # 1. Get the first 20 tracks from the base playlist
#         url = f"https://api.spotify.com/v1/playlists/{base_playlist_id}/tracks?limit=20"
#         headers = {"Authorization": f"Bearer {spotify_access_token}"}
#         playlist_resp = requests.get(url, headers=headers)

#         if playlist_resp.status_code != 200:
#             return Response(
#                 {"error": "Could not fetch base playlist tracks."},
#                 status=playlist_resp.status_code
#             )

#         tracks_data = playlist_resp.json()
#         track_names_artists = []
#         for item in tracks_data.get("items", []):
#             track = item["track"]
#             # Format "Song Name" by "Artist Name"
#             track_names_artists.append(
#                 f"{track['name']} by {track['artists'][0]['name']}")

#         # 2. Prepare a prompt for ChatGPT
#         # Example prompt: You can refine this to be more detailed with the user's context
#         prompt = (
#             f"You are a music expert. The user wants a playlist described as: '{description}'.\n"
#             "Here are up to 20 tracks from the user's base playlist:\n"
#             + "\n".join(track_names_artists) +
#             "\nSuggest 30 recommended songs that fit this vibe (include artist and track name)."
#             "\nMake sure the songs are available on Spotify and return them in a bullet list."
#         )

#         # 3. Call ChatGPT
#         response = openai.ChatCompletion.create(
#             model="gpt-4",
#             messages=[
#                 {"role": "system",
#                     "content": "You are a helpful music recommendation assistant."},
#                 {"role": "user", "content": prompt}
#             ],
#             temperature=0.7
#         )

#         # The response from ChatGPT (example format). You must parse the text
#         recommended_text = response["choices"][0]["message"]["content"]

#         print('RECOMMENDED DATA---', recommended_text)

#         # 4. Parse recommended_text to extract track and artist data
#         # This heavily depends on how ChatGPT formats the response.
#         # For simplicity, let's assume it's a bullet list of "Song Name - Artist".
#         recommended_tracks = []
#         for line in recommended_text.split("\n"):
#             line = line.strip("-• ")
#             if not line:
#                 continue
#             # naive parsing: "Song - Artist"
#             parts = line.split(" - ")
#             if len(parts) == 2:
#                 song_name, artist_name = parts
#                 recommended_tracks.append(
#                     {"song_name": song_name, "artist_name": artist_name})

#         # 5. Search each recommended track on Spotify to get track IDs
#         track_uris = []
#         for rec in recommended_tracks:
#             query = f"{rec['song_name']} {rec['artist_name']}"
#             search_url = f"https://api.spotify.com/v1/search?q={query}&type=track&limit=1"
#             search_resp = requests.get(search_url, headers=headers)
#             if search_resp.status_code == 200:
#                 search_data = search_resp.json()
#                 items = search_data.get("tracks", {}).get("items", [])
#                 if items:
#                     track_uris.append(items[0]["uri"])

#         # 6. Create a new playlist in Spotify
#         create_url = f"https://api.spotify.com/v1/users/{spotify_id}/playlists"
#         create_payload = {
#             "name": f"Cycles-Generated: {description[:30]}",
#             "description": description,
#             "public": True
#         }
#         create_resp = requests.post(
#             create_url, headers=headers, json=create_payload)

#         if create_resp.status_code != 201:
#             return Response({"error": "Could not create Spotify playlist."}, status=create_resp.status_code)

#         new_playlist = create_resp.json()
#         new_playlist_id = new_playlist["id"]

#         # 7. Add tracks to the newly created playlist
#         add_url = f"https://api.spotify.com/v1/playlists/{new_playlist_id}/tracks"
#         add_payload = {
#             "uris": track_uris
#         }
#         add_resp = requests.post(add_url, headers=headers, json=add_payload)

#         if add_resp.status_code not in [201, 200]:
#             return Response({"error": "Could not add tracks to playlist."}, status=add_resp.status_code)

#         # Build preview data for each track to return to the frontend:
#         preview_info = []
#         for uri in track_uris:
#             track_id = uri.split(":")[-1]
#             track_info_url = f"https://api.spotify.com/v1/tracks/{track_id}"
#             info_resp = requests.get(track_info_url, headers=headers)
#             if info_resp.status_code == 200:
#                 track_json = info_resp.json()
#                 preview_info.append({
#                     "name": track_json["name"],
#                     "artist": track_json["artists"][0]["name"],
#                     "preview_url": track_json["preview_url"],
#                     "cover_url": track_json["album"]["images"][0]["url"] if track_json["album"]["images"] else None
#                 })

#         # Create a set of unique hashtags (demo purpose: #YourDescription #AI)
#         hashtags = [f"#{description.replace(' ', '')}", "#cycles"]

#         return Response({
#             "new_playlist_id": new_playlist_id,
#             "new_playlist": new_playlist,
#             "recommended_tracks": preview_info,
#             "hashtags": hashtags,
#             "spotify_playlist_url": new_playlist["external_urls"]["spotify"]
#         }, status=200)
