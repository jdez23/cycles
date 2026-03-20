import logging
import os
import time

import jwt
import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)

APPLE_MUSIC_API_BASE = "https://api.music.apple.com/"
DEVELOPER_TOKEN_CACHE_KEY = "apple_music_developer_token"


def generate_developer_token() -> str:
    """Generate a signed Apple Developer Token (JWT, valid ~6 months)."""
    private_key = os.environ.get('APPLE_MUSIC_PRIVATE_KEY', '')
    key_id = os.environ.get('APPLE_MUSIC_KEY_ID', '')
    team_id = os.environ.get('APPLE_MUSIC_TEAM_ID', '')

    now = int(time.time())
    expiry = now + 15_777_000  # ~6 months in seconds

    token = jwt.encode(
        {'iss': team_id, 'iat': now, 'exp': expiry},
        private_key,
        algorithm='ES256',
        headers={'kid': key_id},
    )
    return token


def get_developer_token() -> str:
    """Return cached Apple Developer Token, regenerating if expired."""
    token = cache.get(DEVELOPER_TOKEN_CACHE_KEY)
    if not token:
        token = generate_developer_token()
        # Cache for 5 months to give buffer before 6-month expiry
        cache.set(DEVELOPER_TOKEN_CACHE_KEY, token, timeout=13_132_800)
    return token


def get_music_user_token(user) -> str | None:
    """Return the stored Apple Music user token for this user."""
    from .models import AppleMusicToken
    try:
        return AppleMusicToken.objects.get(user=user).music_user_token
    except AppleMusicToken.DoesNotExist:
        return None


def execute_apple_music_request(user, endpoint: str, method: str = "GET",
                                 params: dict | None = None, body: dict | None = None) -> dict:
    """Make an authenticated Apple Music API request."""
    developer_token = get_developer_token()
    music_user_token = get_music_user_token(user)

    headers = {
        "Authorization": f"Bearer {developer_token}",
        "Music-User-Token": music_user_token or "",
    }

    url = APPLE_MUSIC_API_BASE + endpoint
    response = requests.request(
        method, url, headers=headers, params=params, json=body, timeout=15
    )

    try:
        return response.json()
    except ValueError:
        logger.error("Non-JSON Apple Music response: %s %s", response.status_code, url)
        return {"error": "Invalid response from Apple Music"}
