# CLAUDE.md — Cycles

## Project Overview

Cycles is a social playlist-sharing app with a Django REST API backend and a React Native / Expo frontend. Users connect Spotify or Apple Music, share playlists, follow each other, like and comment. Firebase handles authentication; AWS S3 handles media/static storage.

```
cycles/
├── backend/    Django REST API
└── frontend/   React Native / Expo app
```

---

## Backend

### Architecture

| App | Responsibility |
|---|---|
| `core/` | Firebase authentication, shared exceptions, response helpers |
| `users/` | User model (extends AbstractUser), Follow, Subscription; contact email |
| `feed/` | Playlist, PlaylistTracks, Like, Comment, Reply, CommentLike; discover/following feeds |
| `spotify_api/` | Spotify OAuth tokens, playlist/track fetch, liked songs |
| `apple_music/` | Apple Music developer token, user music token, playlist/track fetch |
| `notifications/` | FCM tokens, Notification model; push via FCM HTTP v1 |

### Authentication

All endpoints require a Firebase ID token in the `Authorization` header.
`FirebaseAuthentication` in `core/authentication.py` verifies it via `auth.verify_id_token()`.
Public endpoints (register, login, contact, subscription, Apple developer token) set:
```python
authentication_classes = []
permission_classes = [AllowAny]
```

### Music Integration Pattern

Both Spotify and Apple Music follow the same flow:
1. **Auth/token endpoint** — client obtains token; server stores it
2. **List playlists endpoint** — returns user's playlists not yet shared on Cycles
3. **Playlist tracks endpoint** — returns tracks for a given playlist
4. **Track sync** — when posting a playlist, tracks are fetched and stored in `PlaylistTracks`

The `Playlist.source` field (`'spotify'` or `'apple_music'`) distinguishes between the two.

### Apple Music Auth Flow

Apple Music uses **MusicKit JS** (client-side) — the server never handles an OAuth redirect:
1. Client requests `GET /apple-music/developer-token/` — gets cached Apple Developer JWT
2. Client calls `music.authorize()` in MusicKit JS — user approves
3. Client POSTs `musicUserToken` to `POST /apple-music/login/` — backend stores it
4. All subsequent Apple Music API calls use both the developer token and user token

### Key Backend Conventions

- All credentials come from environment variables — never hardcode secrets
- Use `select_related`/`prefetch_related` on all queryset → serializer paths
- Paginate querysets **before** serializing (not after)
- Long-running tasks (Spotify/Apple Music track sync) should use Celery, not inline blocking calls
- Errors: always return `{'error': 'message'}` via `core.responses.error_response()`
- Log with `logger.exception(...)` — never use `print()`
- Explicit imports only — no `from .models import *` or `from .views import *`

### Running the Backend

```bash
cd backend
source env/bin/activate
python manage.py runserver
```

### Running Backend Tests

```bash
cd backend
pytest
```

### Do Not (backend)

- Commit `firebase-config.json`, `.env`, or any credentials file
- Use `from .models import *` or `from .views import *` — always use explicit imports
- Add business logic directly to views — use `services.py` or utility functions
- Use `order_by('?')` — catastrophically slow on large tables
- Paginate serialized data instead of querysets
- Call the legacy FCM API (`https://fcm.googleapis.com/fcm/send`) — use `firebase_admin.messaging`
- Add `default=''` to ForeignKey fields — use `default=None` with `null=True`

---

## Frontend

### Architecture

| Directory | Responsibility |
|---|---|
| `app/(auth)/` | Sign-in (phone number entry), OTP confirmation |
| `app/(tabs)/` | Home feed, Discover, Create playlist, Notifications, Profile |
| `app/onboard/` | Username creation for new users |
| `app/screens/` | Detail screens: playlist, user profile, comments, Spotify/Apple Music pickers |
| `context/auth-context.js` | Auth state, Firebase phone auth, Spotify/Apple Music auth, token management |
| `context/playlist-context.js` | Playlists, feeds, likes, comments, follow, Spotify/Apple Music playlists |
| `context/notif-context.js` | Notifications, badge count |
| `utils/api.js` | Centralized axios instance — use this for ALL HTTP calls |
| `utils/token.js` | `getValidToken()` — always returns a valid Firebase ID token (auto-refreshes) |

### Authentication Flow

Firebase phone authentication:
1. User enters phone → `firebase.auth().signInWithPhoneNumber(phone)`
2. User enters OTP → `confirm.confirm(code)` returns `res`
3. Get real ID token JWT: `const idToken = await res.user.getIdToken()` — **NOT** `res.user.uid`
4. `GET /users/login/?token={res.user.uid}` (public endpoint) to check if user exists
5. Store `idToken` in SecureStore as `"token"`
6. All subsequent API calls send this token via `utils/api.js` interceptor

Firebase ID tokens expire after 1 hour. `getValidToken()` calls `firebase.auth().currentUser.getIdToken()` which auto-refreshes — use `api.js` rather than reading SecureStore directly.

### HTTP Calls

Always use the centralized axios instance — never import `axios` directly:
```js
import api from '../utils/api';
const res = await api.get('/feed/playlist/');
const res = await api.post('/feed/my-playlists/', data);
```

The interceptor automatically attaches the `Authorization` header with a fresh Firebase ID token.

### State Management

Three Context providers, each following the factory pattern in `context/context.js`:
- State lives in `useReducer`; action creators receive `dispatch` as first argument
- `dispatch` is also exposed on the context value for clearing errors in components

Error dispatch from components: use `authContext.setError("message")` — do not call `dispatch({ type: "error_1" })` directly from component files.

### Music Integrations

**Spotify:**
- Auth: server-side OAuth redirect via `Linking.openURL(authUrl)`
- Callback: captured via `Linking.addEventListener("url", handler)` — clean up on unmount
- Playlist image: `item.images?.[0]?.url` — `images` is an array `[{url, width, height}]`
- Source field: `"spotify"` when posting to `/feed/my-playlists/`

**Apple Music:**
- Auth: client-side MusicKit JS — server only provides the developer token
- Flow: `getDeveloperToken()` → client calls `music.authorize()` → POST `musicUserToken` to `/apple-music/login/`
- Playlist image: `item.attributes.artwork.url` with `{w}` and `{h}` placeholders replaced
- Source field: `"apple_music"` when posting to `/feed/my-playlists/`

### Key Frontend Conventions

- Use `utils/api.js` for all HTTP — auth header is injected automatically
- Never import `axios` directly in contexts or screens
- Never call `SecureStore.getItemAsync("token")` inside context action creators
- Spotify images: `item.images?.[0]?.url` — `images` is an array, not a URL string
- Apple Music artwork: replace `{w}` and `{h}` placeholders (e.g. `.replace("{w}", "500")`)
- Dates: use the `timeAgo()` helper pattern (see `home.js`) — do not use `moment.js`
- ActionSheet: render **one** instance outside `FlatList`, not inside `renderItem`
- Pagination: pass the full `next` URL from the API response directly to `api.get(nextUrl)`

### Running the Frontend

```bash
cd frontend
npm install
npx expo start
```

### Do Not (frontend)

- Import `axios` directly in any context or screen — use `utils/api.js`
- Store Firebase UID as the auth token — store the ID token JWT from `res.user.getIdToken()`
- Use `moment.js` for dates
- Render ActionSheet inside FlatList `renderItem` — causes N mounted instances
- Call `SecureStore.getItemAsync("token")` inside action creators — the api interceptor handles this
- Use `dispatch` directly from component files for errors — use `setError()`
