import logging
import os

import requests
from requests import Request

from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response

from feed.models import Playlist
from .models import SpotifyToken
from .utils import (
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL,
    execute_spotify_request,
    get_user_tokens,
    is_spotify_authenticated,
    update_or_create_user_tokens,
)

logger = logging.getLogger(__name__)


class SpotifyAuthURL(APIView):
    def get(self, request):
        scopes = (
            "playlist-read-private user-read-private "
            "playlist-modify-public playlist-modify-private user-library-modify"
        )
        url = Request(
            "GET",
            "https://accounts.spotify.com/authorize",
            params={
                "scope": scopes,
                "response_type": "code",
                "redirect_uri": REDIRECT_URL,
                "client_id": CLIENT_ID,
            },
        ).prepare().url
        return Response(url, status=status.HTTP_200_OK)


class SpotifyCallback(APIView):
    def post(self, request):
        code = request.data.get("code")
        if not code:
            return Response({"error": "Code not found in request"}, status=status.HTTP_400_BAD_REQUEST)

        raw = requests.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URL,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
        )
        if not raw.ok:
            return Response({"error": "Spotify token exchange failed."}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(raw.json(), status=status.HTTP_200_OK)


class LoginSpotify(APIView):
    def post(self, request):
        access_token = request.data.get("access_token")
        refresh_token = request.data.get("refresh_token")
        expires_in = request.data.get("expires_in")
        token_type = request.data.get("token_type")

        if not all([access_token, refresh_token, expires_in, token_type]):
            return Response({"error": "Missing token fields."}, status=status.HTTP_400_BAD_REQUEST)

        update_or_create_user_tokens(
            request.user, access_token, refresh_token, expires_in, token_type
        )
        return Response({"authenticated": True}, status=status.HTTP_200_OK)


class IsSpotifyAuthenticated(APIView):
    def get(self, request):
        return Response(is_spotify_authenticated(request.user), status=status.HTTP_200_OK)


class SpotifyLogout(APIView):
    def delete(self, request):
        SpotifyToken.objects.filter(user=request.user).delete()
        return Response({"authenticated": False}, status=status.HTTP_200_OK)


class SpotifyPlaylist(APIView):
    """Returns user's Spotify playlists that have not yet been shared on Cycles."""

    def get(self, request):
        user = request.user

        me_data = execute_spotify_request(user, "v1/me")
        if "error" in me_data:
            return Response({"error": "Failed to fetch Spotify profile."}, status=status.HTTP_502_BAD_GATEWAY)
        spotify_user_id = me_data["id"]

        already_shared_ids = set(
            Playlist.objects.filter(user=user, source=Playlist.SOURCE_SPOTIFY)
            .values_list("playlist_id", flat=True)
        )

        params = {"limit": 50, "offset": 0}
        all_playlists = []
        while True:
            data = execute_spotify_request(user, "v1/me/playlists", params=params)
            if not data or "items" not in data:
                logger.error("Invalid Spotify playlists response: %s", data)
                break
            all_playlists.extend(data["items"])
            if len(data["items"]) < params["limit"]:
                break
            params["offset"] += params["limit"]

        unshared = [
            p for p in all_playlists
            if p.get("owner", {}).get("id") == spotify_user_id
            and p.get("public") is True
            and p["id"] not in already_shared_ids
        ]

        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(unshared, request)
        return paginator.get_paginated_response(page)


class SpotifyPlaylistTracks(APIView):
    def get(self, request):
        playlist_id = request.GET.get("playlist_id")
        if not playlist_id:
            return Response({"error": "playlist_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        data = execute_spotify_request(request.user, f"v1/playlists/{playlist_id}/tracks")
        return Response(data, status=status.HTTP_200_OK)


class AddSongToLikedPlaylist(APIView):
    def put(self, request):
        track_id = request.data.get("track_id")
        if not track_id:
            return Response({"error": "track_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        execute_spotify_request(
            request.user, f"v1/me/tracks", method="PUT", body={"ids": [track_id]}
        )
        return Response({"message": "Added!"}, status=status.HTTP_200_OK)
