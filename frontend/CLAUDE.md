# CLAUDE.md — Cycles Frontend

## Project Overview

React Native + Expo app for Cycles, a social playlist-sharing app. Users connect Spotify or Apple Music, share playlists, follow each other, like and comment. Firebase handles phone authentication and push notifications (FCM).

## Architecture

| Directory / File | Responsibility |
|---|---|
| `app/(auth)/` | Sign-in (phone number entry), OTP confirmation |
| `app/(tabs)/` | Home feed, Discover, Create playlist, Notifications, Profile |
| `app/onboard/` | Username creation for new users |
| `app/screens/` | Detail screens: playlist, user profile, comments, Spotify/Apple Music pickers |
| `context/auth-context.js` | Auth state, Firebase phone auth, Spotify/Apple Music auth, token management |
| `context/playlist-context.js` | Playlists, feeds, likes, comments, follow, Spotify/Apple Music playlists |
| `context/notif-context.js` | Notifications, badge count |
| `utils/api.js` | Centralized axios instance — use this for **ALL** HTTP calls |
| `utils/token.js` | `getValidToken()` — always returns a valid Firebase ID token (auto-refreshes) |
| `firebase/notifications.js` | FCM token registration |

## Authentication

Firebase phone authentication flow:
1. User enters phone → `firebase.auth().signInWithPhoneNumber(phone)`
2. User enters OTP → `confirm.confirm(code)` returns `res`
3. **Get the real ID token JWT:** `const idToken = await res.user.getIdToken()` — **NOT** `res.user.uid`
4. `GET /users/login/?token={res.user.uid}` (public endpoint, `authentication_classes = []`) to look up user
5. Store `idToken` in SecureStore as `"token"` — this JWT goes in the `Authorization` header
6. All subsequent API calls send this token via the `utils/api.js` interceptor

Firebase ID tokens expire after 1 hour. `getValidToken()` in `utils/token.js` calls `firebase.auth().currentUser.getIdToken()` which auto-refreshes when needed — always use `api.js` rather than reading SecureStore directly.

## HTTP Calls

Always use the centralized axios instance — **never import `axios` directly**:

```js
import api from '../utils/api';

// GET
const res = await api.get('/feed/playlist/');

// POST
const res = await api.post('/feed/my-playlists/', { hashtags, playlist_id, ... });

// DELETE
await api.delete(`/feed/like-playlist/?id=${id}`);

// Paginated next page (next is an absolute URL from the API)
const res = await api.get(nextPageUrl);
```

The interceptor automatically attaches `Authorization: <Firebase ID token>` before every request.

## State Management

Three Context providers using `context/context.js` factory:
- State is managed by `useReducer`
- Action creators receive `dispatch` as their first argument
- Both `state` and `dispatch` are exposed on the context value

**Error dispatch from components:** use `authContext.setError("message")` — do not call `dispatch({ type: "error_1" })` directly from screens.

**Clearing errors:** `dispatch({ type: "clear_error_message" })` or `authContext.setError("")`.

## Music Integrations

### Spotify

- **Auth:** server-side OAuth redirect — call `authContext.authSpotify()` → `Linking.openURL(url)`
- **Callback:** captured via `Linking.addEventListener("url", handler)` in `new_playlist.js` — always clean up with `return () => subscription.remove()`
- **Playlist images:** `item.images?.[0]?.url` — `images` is an array `[{url, width, height}]`, not a string
- **Source field:** `"spotify"` when posting to `/feed/my-playlists/`

### Apple Music

- **Auth:** client-side MusicKit JS — the server only provides the developer token
- **Flow:**
  1. `authContext.getDeveloperToken()` → `GET /apple-music/developer-token/`
  2. Client initializes MusicKit JS with the developer token
  3. Client calls `music.authorize()` → user approves in Apple's native UI
  4. Client gets `musicUserToken` string
  5. `playlistContext.appleMusicLogin(musicUserToken)` → `POST /apple-music/login/`
- **Playlist images:** `item.attributes.artwork.url` contains `{w}` and `{h}` placeholders — replace them: `.replace("{w}", "500").replace("{h}", "500")`
- **Source field:** `"apple_music"` when posting to `/feed/my-playlists/`

## Backend API Reference

Base URL: `process.env.EXPO_PUBLIC_API_URL` (set in `.env.local`). All paths in `api.js` calls are relative.

| Endpoint | Method | Description |
|---|---|---|
| `/users/login/` | GET `?token={uid}` | Look up user by Firebase UID (public) |
| `/users/register/` | POST | Create new user (public); body: `{token: uid, username}` |
| `/users/user/{id}/` | GET/PUT/DELETE | User profile |
| `/users/following/` | POST/DELETE | Follow / unfollow |
| `/users/user-followers/` | GET `?user_id=` | List followers |
| `/users/user-following/` | GET `?user_id=` | List following |
| `/feed/playlist/` | GET | Discover feed (paginated) |
| `/feed/following-playlists/` | GET | Following feed (paginated) |
| `/feed/my-playlists/` | GET / POST / DELETE | My playlists |
| `/feed/user-playlists/` | GET `?id=` | A user's playlists |
| `/feed/playlist-details/` | GET `?id=` / PUT `?playlist_id=` | Playlist + tracks |
| `/feed/like-playlist/` | GET / POST / DELETE | Like state |
| `/feed/comments-playlist/` | GET / POST / DELETE | Comments |
| `/feed/playlists/hashtag/` | GET `?hashtag=` | Playlists by hashtag |
| `/spotify-api/token/` | GET | Check Spotify auth |
| `/spotify-api/get-auth-url/` | GET | Get Spotify OAuth URL |
| `/spotify-api/token-request/` | POST | Exchange OAuth code for tokens |
| `/spotify-api/spotify-login/` | POST | Store Spotify tokens |
| `/spotify-api/spotify-logout/` | DELETE | Revoke Spotify auth |
| `/spotify-api/spotify-playlist/` | GET | User's Spotify playlists |
| `/apple-music/developer-token/` | GET | Apple Developer JWT (public) |
| `/apple-music/login/` | POST | Store music user token |
| `/apple-music/token/` | GET | Check Apple Music auth |
| `/apple-music/logout/` | DELETE | Revoke Apple Music auth |
| `/apple-music/playlists/` | GET | User's Apple Music playlists |
| `/apple-music/playlist-tracks/` | GET `?playlist_id=` | Tracks for a playlist |
| `/notifications/message/` | GET / POST / DELETE | Notifications |
| `/notifications/fcm-token/` | POST / DELETE | FCM token registration |

## Key Conventions

- **HTTP:** import `utils/api.js`, never raw `axios`
- **Token:** never call `SecureStore.getItemAsync("token")` in action creators — the api interceptor handles it via `getValidToken()`
- **Spotify images:** `item.images?.[0]?.url` — not `item.images`
- **Apple Music images:** replace `{w}` and `{h}` in `item.attributes.artwork.url`
- **Dates:** use the `timeAgo()` helper pattern (see `app/(tabs)/home.js`) — do not use `moment.js`
- **ActionSheet:** render **one** instance outside `FlatList`, reference via a single `ref` — never inside `renderItem`
- **Pagination:** the `next` field in paginated responses is an absolute URL — pass it directly to `api.get(next)`
- **Errors from components:** call `authContext.setError("message")` — not raw dispatch

## Running Locally

```bash
cd frontend
npm install
npx expo start
```

## Do Not

- Import `axios` directly in any context or screen — use `utils/api.js`
- Store Firebase UID as the auth token — store the ID token JWT from `res.user.getIdToken()`
- Use `moment.js` — use a native helper or `Intl.RelativeTimeFormat`
- Render `ActionSheet` inside `FlatList` `renderItem` — it mounts one instance per item
- Call `SecureStore.getItemAsync("token")` inside action creators
- Call `dispatch({ type: "error_1" })` directly from component/screen files — use `setError()`
- Pass `item.images` directly as an `<Image source>` — it's an array, not a URI
