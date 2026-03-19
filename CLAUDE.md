# CLAUDE.md — Cycles Backend

## Project Overview
Django REST API backend for Cycles, a social playlist-sharing app.
Users connect Spotify and Apple Music, share playlists, follow each other,
like and comment. Firebase handles auth; AWS S3 handles media/static storage.

## Architecture

| App | Responsibility |
|---|---|
| `core/` | Firebase authentication, shared exceptions, response helpers |
| `users/` | User model (extends AbstractUser), Follow, Subscription; contact email |
| `feed/` | Playlist, PlaylistTracks, Like, Comment, Reply, CommentLike; discover/following feeds |
| `spotify_api/` | Spotify OAuth tokens, playlist/track fetch, liked songs |
| `apple_music/` | Apple Music developer token, user music token, playlist/track fetch |
| `notifications/` | FCM tokens, Notification model; push via FCM HTTP v1 |

## Authentication

All endpoints require Firebase ID token in `Authorization` header.
`FirebaseAuthentication` in `core/authentication.py` verifies it via `auth.verify_id_token()`.
Public endpoints (register, login, contact, subscription, Apple developer token) set:
```python
authentication_classes = []
permission_classes = [AllowAny]
```

## Key Conventions

- All credentials come from environment variables — never hardcode secrets
- Use `select_related`/`prefetch_related` on all queryset → serializer paths
- Paginate querysets **before** serializing (not after)
- Long-running tasks (Spotify/Apple Music track sync) should use Celery, not inline blocking calls
- Errors: always return `{'error': 'message'}` via `core.responses.error_response()`
- Log with `logger.exception(...)` — never use `print()`
- Explicit imports only — no `from .models import *` or `from .views import *`

## Music Integration Pattern

Both Spotify and Apple Music follow the same flow:
1. **Auth/token endpoint** — client obtains token; server stores it
2. **List playlists endpoint** — returns user's playlists not yet shared on Cycles
3. **Playlist tracks endpoint** — returns tracks for a given playlist
4. **Track sync** — when posting a playlist, tracks are fetched and stored in `PlaylistTracks`

The `Playlist.source` field (`'spotify'` or `'apple_music'`) distinguishes between the two.

## Apple Music Auth Flow

Apple Music uses **MusicKit JS** (client-side) — the server never handles an OAuth redirect:
1. Client requests `GET /apple-music/developer-token/` — gets cached Apple Developer JWT
2. Client calls `music.authorize()` in MusicKit JS — user approves
3. Client POSTs `musicUserToken` to `POST /apple-music/login/` — backend stores it
4. All subsequent API calls use both the developer token and user token

## Running Locally

```bash
cd backend
source env/bin/activate
python manage.py runserver
```

## Running Tests

```bash
cd backend
pytest
```

## Do Not

- Commit `firebase-config.json`, `.env`, or any credentials file
- Use `from .models import *` or `from .views import *` — always use explicit imports
- Add business logic directly to views — use `services.py` or utility functions
- Use `order_by('?')` — catastrophically slow on large tables
- Paginate serialized data instead of querysets
- Call the legacy FCM API (`https://fcm.googleapis.com/fcm/send`) — use `firebase_admin.messaging`
- Add `default=''` to ForeignKey fields — use `default=None` with `null=True`
