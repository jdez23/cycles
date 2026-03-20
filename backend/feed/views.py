import logging

from django.db.models import Q
from django.db import transaction
from rest_framework import generics, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from core.responses import error_response
from spotify_api.utils import execute_spotify_request, is_spotify_authenticated
from users.models import Follow, User
from .models import Comment, Like, Playlist, PlaylistTracks
from .serializers import (
    CombinedSearchSerializer,
    CommentSerializer,
    FollowingPlaylistSerializer,
    LikesSerializer,
    PlaylistbyHashtagSerializer,
    PlaylistDetailSerializer,
    PlaylistSerializer,
    PlaylistTracksSerializer,
    UserPlaylistSerializer,
)

logger = logging.getLogger(__name__)


def _fetch_spotify_tracks(user, playlist_id):
    """Fetch all tracks for a Spotify playlist. Returns list of track dicts."""
    endpoint = f'v1/playlists/{playlist_id}/tracks'
    all_tracks = []
    while endpoint:
        response = execute_spotify_request(user, endpoint)
        if not response or "items" not in response:
            break
        for item in response["items"]:
            track = item.get("track")
            if not track or track.get("type") != "track":
                logger.info("Skipping item because it is not a song.")
                continue
            if not track.get("preview_url"):
                logger.info("Skipping track because preview_url is missing.")
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
                    "images": track["album"]["images"][0]["url"] if track["album"]["images"] else "",
                })
            except (KeyError, IndexError) as exc:
                logger.warning("Skipping invalid track data: %s", exc)
        endpoint = response.get("next")
    return all_tracks


class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = UserPlaylistSerializer
    pagination_class = None

    def list(self, request, *args, **kwargs):
        user = request.user
        has_uploaded = Playlist.objects.filter(user=user).exists()

        if has_uploaded:
            # Stable random ordering using a DB function to avoid full-table sort
            playlists = Playlist.objects.order_by('id').select_related('user')
        else:
            playlists = Playlist.objects.order_by('-date').select_related('user')[:6]

        serializer = self.serializer_class(playlists, many=True)
        return Response({
            "has_uploaded": has_uploaded,
            "playlists": serializer.data
        })


class PlaylistDetails(APIView):

    def get(self, request):
        playlist_id = request.GET.get('id')
        if not playlist_id:
            return error_response('Playlist ID is required.')
        try:
            playlist = Playlist.objects.select_related('user').get(id=playlist_id)
        except Playlist.DoesNotExist:
            return error_response('Playlist not found.', status.HTTP_404_NOT_FOUND)

        is_liked = Like.objects.filter(
            user=request.user, playlist=playlist, like=True).exists()
        playlist_serializer = PlaylistDetailSerializer(
            playlist, context={'is_liked': is_liked})

        tracks = PlaylistTracks.objects.filter(
            playlist_id=playlist.id).order_by('id')
        paginator = PageNumberPagination()
        paginator.page_size = 10
        paginated_tracks = paginator.paginate_queryset(tracks, request)
        tracks_serializer = PlaylistTracksSerializer(paginated_tracks, many=True)

        return Response({
            "playlist": playlist_serializer.data,
            "tracks": tracks_serializer.data,
            "count": paginator.page.paginator.count,
            "next": paginator.get_next_link(),
            "previous": paginator.get_previous_link(),
        }, status=status.HTTP_200_OK)

    def put(self, request):
        playlist_id = request.GET.get("playlist_id")
        if not playlist_id:
            return error_response('playlist_id is required.')
        try:
            playlist = Playlist.objects.get(id=playlist_id)
        except Playlist.DoesNotExist:
            return error_response('Playlist not found.', status.HTTP_404_NOT_FOUND)

        if playlist.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)

        try:
            user = request.user
            spotify_playlist_id = playlist.playlist_id
            response = execute_spotify_request(user, f"v1/playlists/{spotify_playlist_id}")
            if not response or "error" in response:
                return error_response('Failed to fetch playlist details from Spotify API.', status.HTTP_502_BAD_GATEWAY)

            playlist.playlist_url = response["external_urls"]["spotify"]
            playlist.playlist_description = response.get("description", "")
            playlist.playlist_ApiURL = response["href"]
            playlist.playlist_id = response["id"]
            playlist.playlist_cover = response["images"][0]["url"] if response.get("images") else ""
            playlist.playlist_title = response["name"]
            playlist.playlist_type = response["type"]
            playlist.playlist_uri = response["uri"]
            playlist.save(update_fields=[
                'playlist_url', 'playlist_description', 'playlist_ApiURL',
                'playlist_id', 'playlist_cover', 'playlist_title',
                'playlist_type', 'playlist_uri',
            ])

            all_tracks = _fetch_spotify_tracks(user, spotify_playlist_id)
            with transaction.atomic():
                PlaylistTracks.objects.filter(playlist=playlist).delete()
                PlaylistTracks.objects.bulk_create([
                    PlaylistTracks(playlist=playlist, **track)
                    for track in all_tracks
                ], batch_size=100)

            playlist_serializer = PlaylistDetailSerializer(playlist)
            tracks = PlaylistTracks.objects.filter(playlist=playlist)
            tracks_serializer = PlaylistTracksSerializer(tracks, many=True)
            return Response({
                'playlistDetails': playlist_serializer.data,
                'playlistTracks': tracks_serializer.data
            }, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("Error updating playlist and tracks")
            return error_response('Failed to update playlist.', status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserPlaylists(APIView):
    def get(self, request):
        try:
            user_id = request.GET.get('id')
            playlists = Playlist.objects.filter(
                user_id=user_id).select_related('user').order_by('-date')

            paginator = PageNumberPagination()
            paginator.page_size = 10
            result_page = paginator.paginate_queryset(playlists, request)
            serializer = UserPlaylistSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception:
            logger.exception("Error fetching user playlists")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)


class MyPlaylists(APIView):

    def get(self, request):
        try:
            playlists = Playlist.objects.filter(
                user=request.user).select_related('user').order_by('-date')

            paginator = PageNumberPagination()
            paginator.page_size = 10
            result_page = paginator.paginate_queryset(playlists, request)
            serializer = PlaylistSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception:
            logger.exception("Error fetching my playlists")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        serializer = PlaylistSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = serializer.validated_data
            source = request.data.get('source', Playlist.SOURCE_SPOTIFY)

            with transaction.atomic():
                playlist = Playlist.objects.create(
                    user=request.user,
                    source=source,
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
                playlist.hashtags.set(data["hashtags"])

                if source == Playlist.SOURCE_SPOTIFY:
                    all_tracks = _fetch_spotify_tracks(request.user, data["playlist_id"])
                else:
                    all_tracks = []

                if all_tracks:
                    PlaylistTracks.objects.bulk_create([
                        PlaylistTracks(playlist=playlist, **track)
                        for track in all_tracks
                    ], batch_size=100)

            return Response(
                {'success': f'Playlist added with {len(all_tracks)} valid tracks.'},
                status=status.HTTP_201_CREATED,
            )
        except Exception:
            logger.exception("Error saving playlist and tracks")
            return error_response('Failed to save playlist.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        playlist_id = request.GET.get("id")
        try:
            playlist = Playlist.objects.get(id=playlist_id)
            if playlist.user != request.user:
                return Response(status=status.HTTP_403_FORBIDDEN)

            hashtags = list(playlist.hashtags.all())
            playlist.delete()

            for hashtag in hashtags:
                if hashtag.playlists.count() == 0:
                    hashtag.delete()

            return Response(status=status.HTTP_200_OK)
        except Playlist.DoesNotExist:
            return error_response('Playlist not found.', status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("Error deleting playlist")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)


class FollowingPlaylists(generics.ListAPIView):
    serializer_class = FollowingPlaylistSerializer

    def get_queryset(self):
        user = self.request.user
        following_ids = Follow.objects.filter(
            user_id=user).values_list('following_user_id', flat=True)
        return (
            Playlist.objects.filter(
                Q(user_id__in=following_ids) | Q(user_id=user)
            )
            .select_related('user')
            .order_by('-date')
        )


class PlaylistsByHashtagView(APIView):
    def get(self, request):
        hashtag = request.GET.get('hashtag', '').strip()
        try:
            playlists = Playlist.objects.filter(
                hashtags__name__icontains=hashtag
            ).select_related('user')

            paginator = PageNumberPagination()
            paginator.page_size = 10
            result_page = paginator.paginate_queryset(playlists, request)
            serializer = PlaylistbyHashtagSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception:
            logger.exception("Error fetching playlists by hashtag")
            return error_response('An error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)


class LikesViewSet(APIView):

    def get(self, request):
        user = request.user
        playlist_id = request.GET.get('id')
        is_liked = Like.objects.filter(
            user=user, playlist_id=playlist_id, like=True).exists()
        return Response(is_liked, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            user = request.user
            playlist_id = request.data.get('id')
            playlist = Playlist.objects.get(id=playlist_id)
            like_value = request.data.get('like', True)
            like, _ = Like.objects.get_or_create(
                user=user, playlist=playlist,
                defaults={'like': like_value},
            )
            serializer = LikesSerializer(like)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Playlist.DoesNotExist:
            return error_response('Playlist not found.', status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("Error liking playlist")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        try:
            playlist_id = request.GET.get('id')
            Like.objects.filter(user=request.user, playlist_id=playlist_id).delete()
            return Response(False, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Error unliking playlist")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)


class CommentView(APIView):

    def post(self, request):
        try:
            user = request.user
            playlist_id = request.data.get('id')
            title = request.data.get('title')
            if not title:
                return error_response('title is required.')
            playlist = Playlist.objects.get(id=playlist_id)
            comment = Comment.objects.create(user=user, playlist=playlist, title=title)
            return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)
        except Playlist.DoesNotExist:
            return error_response('Playlist not found.', status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("Error posting comment")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        try:
            comment_id = request.GET.get('id')
            comment = Comment.objects.get(id=comment_id)
            if comment.user != request.user:
                return Response(status=status.HTTP_403_FORBIDDEN)
            comment.delete()
            return Response(status=status.HTTP_200_OK)
        except Comment.DoesNotExist:
            return error_response('Comment not found.', status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("Error deleting comment")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        try:
            playlist_id = request.query_params.get('id')
            if not playlist_id:
                return error_response('id is required.')
            comments = Comment.objects.filter(
                playlist_id=playlist_id
            ).select_related('user').order_by('-date')

            paginator = PageNumberPagination()
            paginator.page_size = 10
            result_page = paginator.paginate_queryset(comments, request)
            serializer = CommentSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception:
            logger.exception("Error fetching comments")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)


class SearchView(generics.ListAPIView):
    serializer_class = CombinedSearchSerializer

    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        queryset_users = User.objects.filter(
            Q(name__icontains=query) | Q(username__icontains=query)
        )
        queryset_playlists = Playlist.objects.filter(
            Q(playlist_title__icontains=query)
        ).select_related('user')
        return list(queryset_users) + list(queryset_playlists)
