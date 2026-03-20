# Cycles — Frontend

React Native app built with Expo. Users connect Spotify or Apple Music, share playlists, follow other users, and like/comment on playlists.

## Tech Stack

- **React Native** 0.74 / **Expo** 51
- **Expo Router** 3.5 — file-based navigation
- **Firebase** — phone authentication (OTP) + push notifications (FCM)
- **React Context + useReducer** — AuthContext, PlaylistContext, NotifContext
- **axios** — centralized HTTP client (`utils/api.js`)
- **Music:** Spotify Web API (server-side OAuth), Apple Music (MusicKit JS, client-side)

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- **iOS:** Xcode + iOS Simulator (Mac only)
- **Android:** Android Studio + Android Emulator
- A running backend — see `../README.md` or set `EXPO_PUBLIC_API_URL` to a staging URL

## Local Setup

```bash
cd frontend
npm install
# Create a .env.local file:
echo "EXPO_PUBLIC_API_URL=http://localhost:8000" > .env.local
npx expo start
```

Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with the Expo Go app.

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8000`) |

## Project Structure

```
frontend/
├── app/
│   ├── _layout.js           Root layout — auth guard, context providers, notification routing
│   ├── (auth)/
│   │   ├── sign-in.js       Phone number entry
│   │   └── confirm-code.js  OTP verification
│   ├── (tabs)/
│   │   ├── home.js          Following feed
│   │   ├── discover.js      Discover/search playlists & users
│   │   ├── new_playlist.js  Create playlist (Spotify or Apple Music)
│   │   ├── notifs.js        Notifications
│   │   └── profile.js       My profile
│   ├── onboard/
│   │   └── on-board.js      Username creation (new users)
│   └── screens/
│       ├── playlist-screen.js       Playlist details & tracks
│       ├── user-profile.js          Another user's profile
│       ├── comments.js              Playlist comments
│       ├── spotify-playlist.js      Select a Spotify playlist to share
│       ├── apple-music-playlist.js  Select an Apple Music playlist to share
│       ├── edit-profile.js          Edit user profile
│       ├── profile-settings.js      Logout / delete account
│       ├── followers-list.js        Followers list
│       ├── following-list.js        Following list
│       └── hashtag-playlists.js     Playlists by hashtag
├── context/
│   ├── context.js            Context + Provider factory
│   ├── auth-context.js       Auth state, Firebase auth, Spotify/Apple Music auth
│   ├── playlist-context.js   Playlists, feeds, likes, comments, follow
│   └── notif-context.js      Notifications, badge count
├── utils/
│   ├── api.js                Centralized axios instance — always import this
│   ├── token.js              getValidToken() with automatic Firebase token refresh
│   └── utils.js              wait(), getID() helpers
├── components/
│   ├── header.js             App header
│   └── playlist-data.js      Playlist card with audio player
├── firebase/
│   └── notifications.js      FCM token registration and push notification setup
└── assets/                   Images, logos
```

## Running on Device

```bash
npx expo start --tunnel   # required if device and machine aren't on the same network
```

Scan the QR code with the **Expo Go** app (iOS App Store / Google Play).

## Production Builds (EAS)

```bash
eas build --platform ios
eas build --platform android
```

EAS project ID: `0c4193b9-a315-4c42-8fbc-302ad47cb7c9`

## Key Architectural Notes

**Authentication:** Firebase phone auth (OTP). After `confirm.confirm(code)`, always call `res.user.getIdToken()` to get the real Firebase ID token JWT — never use `res.user.uid` as the auth token.

**HTTP:** Import `utils/api.js`, not `axios` directly. The axios instance auto-attaches a fresh `Authorization` header before every request via an interceptor.

**Music integrations:**
- Spotify: server-side OAuth redirect; callback captured via `Linking.addEventListener`
- Apple Music: client-side MusicKit JS; server provides developer token, client handles `music.authorize()`

See `frontend/CLAUDE.md` for full developer conventions.
