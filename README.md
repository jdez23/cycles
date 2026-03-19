# Cycles

Social playlist-sharing app. Users connect Spotify and Apple Music accounts, share playlists, follow other users, like and comment on playlists.

## Tech Stack

- **Backend**: Django 5.1 + Django REST Framework, PostgreSQL, AWS S3, Firebase Auth
- **Push Notifications**: Firebase Cloud Messaging (FCM HTTP v1)
- **Music Integrations**: Spotify Web API, Apple Music API (MusicKit)
- **Hosting**: Heroku (backend), S3 (media/static)

## Prerequisites

- Python 3.12
- PostgreSQL
- Firebase project with service account credentials (individual env vars)
- Spotify Developer App credentials
- Apple Developer account with MusicKit enabled

## Local Setup

```bash
git clone <repo>
cd cycles/backend
python -m venv env && source env/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env   # fill in values
python manage.py migrate
python manage.py runserver
```

## Environment Variables

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_TYPE` | Firebase service account type |
| `GOOGLE_PROJECT_ID` | Firebase project ID |
| `GOOGLE_PRIVATE_KEY_ID` | Firebase private key ID |
| `GOOGLE_PRIVATE_KEY` | Firebase private key (PEM) |
| `GOOGLE_CLIENT_EMAIL` | Firebase client email |
| `GOOGLE_CLIENT_ID` | Firebase client ID |
| `GOOGLE_TOKEN_URI` | Firebase token URI |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |
| `SPOTIFY_REDIRECT_URL` | Spotify OAuth redirect URI |
| `APPLE_MUSIC_KEY_ID` | Apple MusicKit key ID |
| `APPLE_MUSIC_TEAM_ID` | Apple Developer team ID |
| `APPLE_MUSIC_PRIVATE_KEY` | Apple MusicKit .p8 private key contents |
| `APPLE_MUSIC_STOREFRONT` | Apple Music storefront (default: `us`) |
| `AWS_ACCESS_KEY_ID` | S3 access key |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket name |
| `AWS_S3_REGION_NAME` | S3 region |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_HOST_USER` | SMTP username |
| `EMAIL_HOST_PASSWORD` | SMTP password |

## API Endpoints

| Prefix | App | Description |
|---|---|---|
| `/users/` | users | Registration, login, profile, follow |
| `/feed/` | feed | Playlists, likes, comments, search |
| `/spotify-api/` | spotify_api | Spotify OAuth + playlist fetch |
| `/apple-music/` | apple_music | Apple Music auth + playlist fetch |
| `/notifications/` | notifications | FCM tokens, push notifications |
| `/health/` | — | Health check |

## Running Tests

```bash
cd backend
pytest
```

## Deployment

Deployed to Heroku. Push to main triggers deploy. `collectstatic` runs via Procfile release phase.
