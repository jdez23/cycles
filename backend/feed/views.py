from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from spotify_api.util import execute_spotify_api_request, is_spotify_authenticated
from django.db.models import Q
from rest_framework import generics
from .serializers import *
from .models import *
from django.http import JsonResponse
from users.models import Follow
from rest_framework.pagination import PageNumberPagination
import logging


logger = logging.getLogger(__name__)

# Create your views here.


# GET ALL PLAYLISTS (DISCOVER FEED)
class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = UserPlaylistSerializer
    pagination_class = None

    def get_queryset(self):
        try:
            playlist = Playlist.objects.all().order_by('?')

            return playlist
        except:
            return Response(status=500)


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
            playlist_serializer = PlaylistDetailSerializer(playlist)

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

            # Get the hashtags associated with the playlist
            hashtags = playlist.hashtags.values_list('hash', flat=True)

            response_data = {
                "playlist": playlist_serializer.data,
                "tracks": tracks_serializer.data,
                "hashtags": list(hashtags),
                "count": paginator.page.paginator.count,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
            }

            return Response(response_data, status=status.HTTP_200_OK)
        except Playlist.DoesNotExist:
            return JsonResponse({'error': 'Playlist not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)

    def put(self, request):
        try:
            user = self.request.user
            playlist_id = request.GET.get("playlist_id")
            playlist = Playlist.objects.get(id=playlist_id)
            spotify_playlistID = playlist.playlist_id

            # Update playlist
            is_spotify_authenticated(user)
            playlist_endpoint = "v1/playlists/"+spotify_playlistID
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

            playlist.save(update_fields=['user',
                                         'playlist_url', 'playlist_description', 'playlist_ApiURL', 'playlist_id', 'playlist_cover',
                                         'playlist_title', 'playlist_type', 'playlist_uri', 'playlist_tracks'])

            playlist_serializer = PlaylistDetailSerializer(playlist)

            # Get Spotify playlist tracks
            tracks = PlaylistTracks.objects.filter(playlist=playlist)
            tracks.delete()

            tracks_endpoint = 'v1/playlists/'+spotify_playlistID+"/tracks"
            tracks_response = execute_spotify_api_request(
                user, tracks_endpoint)

            # Check if tracks are successfully retrieved
            if "items" not in tracks_response:
                return JsonResponse({'error': 'Failed to retrieve playlist tracks from the Spotify API.'}, status=500)

            # # Initialize an empty list for the tracks
            tracks = []

            # # Loop through the items in the playlist
            for item in tracks_response["items"]:
                #     # Initialize an empty dictionary for the current track
                track = {}

                # Extract data from spotify api playlist
                track["artist"] = item["track"]["artists"][0]["name"]
                track["album"] = item["track"]["album"]["name"]
                track["name"] = item["track"]["name"]
                track["track_id"] = item["track"]["external_urls"]['spotify']
                track["uri"] = item["track"]["uri"]
                track["preview_url"] = item["track"]["preview_url"]
                track["images"] = item["track"]["album"]["images"][0]['url']

                # Add the current track to the list of tracks
                tracks.append(track)

            # Save tracks in db
            for track in tracks:
                playlist_track = PlaylistTracks.objects.create(
                    playlist=playlist, artist=track['artist'], album=track['album'],
                    name=track['name'], track_id=track['track_id'], uri=track['uri'],
                    preview_url=track["preview_url"], images=track['images']
                )
                playlist_track.save()
                PlaylistTracksSerializer(playlist_track)

            tracks = PlaylistTracks.objects.filter(playlist=playlist)
            tracks_serializer = PlaylistTracksSerializer(tracks, many=True)

            playlistDetails = {'playlistDetails': playlist_serializer.data,
                               'playlistTracks': tracks_serializer.data}

            return Response(playlistDetails, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('-----::', e)


# GET SPECIFIC USERS PLAYLISTS (PROFILE SCREEN)
class UserPlaylists(APIView):
    serializer_class = UserPlaylistSerializer

    def get(self, request):
        try:
            user = request.GET.get('id')
            playlist = Playlist.objects.filter(user_id=user).order_by('-date')
            serializer = UserPlaylistSerializer(playlist, many=True)

            # Implement pagination
            paginator = PageNumberPagination()
            paginator.page_size = 10  # Set the page size, can be adjusted or configured in settings
            result_page = paginator.paginate_queryset(
                serializer.data, request)

            return paginator.get_paginated_response(result_page)
        except:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)


# FILTER PLAYLIST BY HASHTAG
class PlaylistsByHashtag(APIView):
    def get(self, request, hashtag_name):
        try:
            # Get the hashtag object
            hashtag = Hashtag.objects.get(hash=hashtag_name)

            # Get all playlists associated with the hashtag
            playlists = hashtag.playlists.all()

            # Serialize the playlists
            serializer = UserPlaylistSerializer(playlists, many=True)

            # Implement pagination
            paginator = PageNumberPagination()
            paginator.page_size = 10  # Set the page size, can be adjusted or configured in settings
            result_page = paginator.paginate_queryset(
                serializer.data, request)

            return paginator.get_paginated_response(result_page)

        except Hashtag.DoesNotExist:
            return Response({"error": "Hashtag not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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
        try:
            form_data = request.data

            user = self.request.user
            # hashtags_data = form_data.get('hashtags', [])
            hashtags_data = request.POST.getlist('hashtags')
            playlist_url = form_data.get('playlist_url')
            playlist_ApiURL = form_data.get('playlist_ApiURL')
            playlist_id = form_data.get('playlist_id')
            playlist_cover = form_data.get('playlist_cover')
            playlist_title = form_data.get('playlist_title')
            playlist_description = form_data.get('playlist_description')
            playlist_type = form_data.get('playlist_type')
            playlist_uri = form_data.get('playlist_uri')
            playlist_tracks = form_data.get('playlist_tracks')

            # Get Spotify playlist tracks
            endpoint = 'v1/playlists/'+playlist_id+"/tracks"
            response = execute_spotify_api_request(user, endpoint)

            # Check if tracks are successfully retrieved
            if not response or "items" not in response:
                return Response(
                    {'error': 'Failed to retrieve playlist tracks from the Spotify API.'},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            # # Initialize an empty list for the tracks
            tracks = []

            # Loop through the items in the playlist
            for item in response["items"]:
                # Check if the track and its album images exist
                if item["track"] and item["track"]["album"]["images"]:
                    # Initialize an empty dictionary for the current track
                    track = {}

                    # Extract data from Spotify API playlist
                    track["artist"] = item["track"]["artists"][0]["name"]
                    track["album"] = item["track"]["album"]["name"]
                    track["name"] = item["track"]["name"]
                    track["track_id"] = item["track"]["external_urls"]["spotify"]
                    track["uri"] = item["track"]["uri"]
                    track["preview_url"] = item["track"]["preview_url"]

                    # Get the largest album image
                    track["images"] = item["track"]["album"]["images"][0]["url"]

                    # Add the current track to the list of tracks
                    tracks.append(track)

            # Save playlist to database
            playlist = Playlist.objects.create(
                user=user, playlist_url=playlist_url,
                playlist_ApiURL=playlist_ApiURL, playlist_id=playlist_id,
                playlist_cover=playlist_cover, playlist_title=playlist_title, playlist_description=playlist_description,
                playlist_type=playlist_type, playlist_uri=playlist_uri, playlist_tracks=playlist_tracks)
            playlist.save()

            # Add hashtags to the playlist
            for hashtag_name in hashtags_data:
                hashtag = Hashtag.objects.get_or_create(hash=hashtag_name)
                playlist.hashtags.add(hashtag)

            PlaylistSerializer(playlist)

            # Save tracks in db
            for track in tracks:
                playlist_track = PlaylistTracks.objects.create(
                    playlist=playlist, artist=track['artist'], album=track['album'],
                    name=track['name'], track_id=track['track_id'], uri=track['uri'],
                    preview_url=track["preview_url"], images=track['images']
                )
                playlist_track.save()
                PlaylistTracksSerializer(playlist_track)
            return Response(status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception("Error saving playlist and tracks")
            return Response(
                {'error': 'An error occurred while saving to the database.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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


# Get playlist description from Spotify
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
