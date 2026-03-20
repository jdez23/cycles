import logging

from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.responses import error_response
from feed.models import Playlist
from .models import AppleMusicToken
from .serializers import AppleMusicTokenSerializer
from .utils import execute_apple_music_request, get_developer_token

logger = logging.getLogger(__name__)

STOREFRONT = 'us'


class AppleMusicDeveloperToken(APIView):
    """Return Apple Developer Token for use with MusicKit JS (public endpoint)."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            token = get_developer_token()
            return Response({"developer_token": token}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Failed to generate Apple Developer Token")
            return error_response("Failed to generate developer token.", status.HTTP_500_INTERNAL_SERVER_ERROR)


class AppleMusicLogin(APIView):
    """Store Apple Music user token for the authenticated user."""

    def post(self, request):
        music_user_token = request.data.get('music_user_token')
        if not music_user_token:
            return error_response('music_user_token is required.')
        AppleMusicToken.objects.update_or_create(
            user=request.user,
            defaults={'music_user_token': music_user_token},
        )
        return Response({'authenticated': True}, status=status.HTTP_200_OK)


class IsAppleMusicAuthenticated(APIView):
    """Return whether the current user has a stored Apple Music token."""

    def get(self, request):
        has_token = AppleMusicToken.objects.filter(user=request.user).exists()
        return Response(has_token, status=status.HTTP_200_OK)


class AppleMusicLogout(APIView):
    """Remove stored Apple Music token for the current user."""

    def delete(self, request):
        AppleMusicToken.objects.filter(user=request.user).delete()
        return Response({'authenticated': False}, status=status.HTTP_200_OK)


class AppleMusicPlaylists(APIView):
    """Return user's Apple Music library playlists not yet shared on Cycles."""

    def get(self, request):
        user = request.user

        already_shared_ids = set(
            Playlist.objects.filter(user=user, source=Playlist.SOURCE_APPLE)
            .values_list('playlist_id', flat=True)
        )

        params = {'limit': 100, 'offset': 0}
        all_playlists = []
        while True:
            data = execute_apple_music_request(user, 'v1/me/library/playlists', params=params)
            if not data or 'data' not in data:
                logger.error("Invalid Apple Music playlists response: %s", data)
                break
            all_playlists.extend(data['data'])
            next_url = data.get('next')
            if not next_url:
                break
            params['offset'] += params['limit']

        unshared = [
            p for p in all_playlists
            if p.get('id') not in already_shared_ids
        ]

        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(unshared, request)
        return paginator.get_paginated_response(page)


class AppleMusicPlaylistTracks(APIView):
    """Return tracks for a given Apple Music library playlist, with preview URLs."""

    def get(self, request):
        playlist_id = request.GET.get('playlist_id')
        storefront = request.GET.get('storefront', STOREFRONT)
        if not playlist_id:
            return error_response('playlist_id is required.')

        data = execute_apple_music_request(
            request.user,
            f'v1/me/library/playlists/{playlist_id}/tracks',
        )
        if 'error' in data:
            return error_response('Failed to fetch playlist tracks.', status.HTTP_502_BAD_GATEWAY)

        tracks = data.get('data', [])
        enriched = []
        for track in tracks:
            attrs = track.get('attributes', {})
            catalog_id = attrs.get('playParams', {}).get('catalogId')
            preview_url = None
            if catalog_id:
                catalog_data = execute_apple_music_request(
                    request.user,
                    f'v1/catalog/{storefront}/songs/{catalog_id}',
                )
                previews = (catalog_data.get('data') or [{}])[0].get('attributes', {}).get('previews', [])
                if previews:
                    preview_url = previews[0].get('url')
            if preview_url:
                enriched.append({
                    'id': track.get('id'),
                    'name': attrs.get('name'),
                    'artist': attrs.get('artistName'),
                    'album': attrs.get('albumName'),
                    'preview_url': preview_url,
                    'artwork': (attrs.get('artwork') or {}).get('url', ''),
                })

        return Response({'tracks': enriched}, status=status.HTTP_200_OK)
