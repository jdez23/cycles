import logging
import os

import requests
from django.utils import timezone
from datetime import timedelta

from .models import SpotifyToken

logger = logging.getLogger(__name__)

BASE_URL = "https://api.spotify.com/"

CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")
REDIRECT_URL = os.environ.get("SPOTIFY_REDIRECT_URL")


def get_user_tokens(user):
    return SpotifyToken.objects.filter(user=user).first()


def update_or_create_user_tokens(user, access_token, refresh_token, expires_in, token_type):
    expires_at = timezone.now() + timedelta(seconds=int(expires_in))
    SpotifyToken.objects.update_or_create(
        user=user,
        defaults={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_at,
            "token_type": token_type,
        },
    )


def refresh_spotify_token(user):
    tokens = get_user_tokens(user)
    if not tokens:
        return
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": tokens.refresh_token,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
    )
    data = response.json()
    access_token = data.get("access_token")
    expires_in = data.get("expires_in", 3600)
    token_type = data.get("token_type", tokens.token_type)
    # Spotify may or may not return a new refresh token
    refresh_token = data.get("refresh_token", tokens.refresh_token)
    update_or_create_user_tokens(user, access_token, refresh_token, expires_in, token_type)


def get_valid_access_token(user) -> str:
    """Returns a valid Spotify access token, refreshing if expired. Single DB read path."""
    tokens = get_user_tokens(user)
    if not tokens:
        raise ValueError("User has no Spotify token")
    if tokens.expires_in <= timezone.now():
        refresh_spotify_token(user)
        tokens = get_user_tokens(user)
    return tokens.access_token


def is_spotify_authenticated(user) -> bool:
    tokens = get_user_tokens(user)
    if not tokens:
        return False
    try:
        if tokens.expires_in <= timezone.now():
            refresh_spotify_token(user)
        return True
    except Exception:
        logger.exception("Failed to refresh Spotify token for user %s", user.id)
        return False


def execute_spotify_request(user, endpoint: str, method: str = "GET", params: dict = None, body: dict = None):
    """Single consolidated Spotify API request function."""
    access_token = get_valid_access_token(user)
    headers = {"Authorization": f"Bearer {access_token}"}
    url = BASE_URL + endpoint
    response = requests.request(method, url, headers=headers, params=params, json=body)
    try:
        return response.json()
    except ValueError:
        logger.error("Non-JSON Spotify response: %s %s", response.status_code, url)
        return {"error": "Invalid response from Spotify"}
