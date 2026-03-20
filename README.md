# Cycles

Social playlist-sharing app. Users connect Spotify or Apple Music, share playlists, follow other users, and like/comment on playlists.

---

## Backend

**Stack:** Django 5.1 + Django REST Framework, PostgreSQL, AWS S3, Firebase Auth
**Push notifications:** Firebase Cloud Messaging (FCM HTTP v1)
**Music:** Spotify Web API, Apple Music API (MusicKit)
**Hosting:** Heroku (backend), S3 (media/static)

### Prerequisites

- Python 3.12
- PostgreSQL
- Firebase project with service account credentials (individual env vars)
- Spotify Developer App credentials
- Apple Developer account with MusicKit enabled

### Local Setup

```bash
cd backend
python -m venv env && source env/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env   # fill in values
python manage.py migrate
python manage.py runserver
```

### Backend Environment Variables

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
| `APPLE_MUSIC_PRIVATE_KEY` | Apple MusicKit `.p8` private key contents |
| `APPLE_MUSIC_STOREFRONT` | Apple Music storefront (default: `us`) |
| `AWS_ACCESS_KEY_ID` | S3 access key |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket name |
| `AWS_S3_REGION_NAME` | S3 region |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_HOST_USER` | SMTP username |
| `EMAIL_HOST_PASSWORD` | SMTP password |

### API Endpoints

| Prefix | App | Description |
|---|---|---|
| `/users/` | users | Registration, login, profile, follow |
| `/feed/` | feed | Playlists, likes, comments, search |
| `/spotify-api/` | spotify_api | Spotify OAuth + playlist fetch |
| `/apple-music/` | apple_music | Apple Music auth + playlist fetch |
| `/notifications/` | notifications | FCM tokens, push notifications |
| `/health/` | — | Health check |

### Running Tests

```bash
cd backend
pytest
```

### Deployment

Deployed to Heroku. Push to main triggers deploy. `collectstatic` runs via Procfile release phase.

---

## Frontend

**Stack:** React Native 0.74 / Expo 51, Expo Router 3.5 (file-based navigation)
**Auth & notifications:** Firebase (phone auth via OTP, FCM push notifications)
**State:** React Context + `useReducer` (AuthContext, PlaylistContext, NotifContext)
**HTTP:** centralized axios client (`utils/api.js`) with automatic token refresh
**Music:** Spotify Web API (OAuth), Apple Music (MusicKit JS, client-side)

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode + iOS Simulator (Mac only)
- Android: Android Studio + Android Emulator
- A running backend (see above), or point `EXPO_PUBLIC_API_URL` at staging

### Local Setup

```bash
cd frontend
npm install
# create .env.local with EXPO_PUBLIC_API_URL=http://localhost:8000
npx expo start
```

Scan the QR code with Expo Go, or press `i`/`a` for simulator.

### Frontend Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8000`) |

### Project Structure

```
frontend/
├── app/
│   ├── (auth)/          Sign-in (phone), OTP confirmation
│   ├── (tabs)/          Home feed, Discover, Create playlist, Notifications, Profile
│   ├── onboard/         Username creation (new users)
│   └── screens/         Playlist detail, user profile, comments, music pickers
├── context/             AuthContext, PlaylistContext, NotifContext
├── utils/
│   ├── api.js           Centralized axios instance (always use this)
│   └── token.js         getValidToken() with auto-refresh
├── components/          Reusable UI components
├── firebase/            FCM token registration
└── assets/              Images and logos
```

### Running on Device

```bash
npx expo start --tunnel   # tunnel needed if device isn't on the same network
```

Scan QR code with the Expo Go app.

### Production Builds (EAS)

```bash
eas build --platform ios
eas build --platform android
```
