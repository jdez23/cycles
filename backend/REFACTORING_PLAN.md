# Backend Refactoring Plan

## Executive Summary

This plan covers a systematic refactoring of the Cycles Django backend. Issues are categorized by priority — **Critical** (security/correctness), **High** (reliability/performance), and **Medium** (maintainability/standards). Each item includes the specific file/line reference, the problem, and the recommended fix.

---

## 1. Critical Security Issues

### 1.1 Firebase Authentication Does Not Verify Tokens

**File:** `firebase/authentication.py:21-25`

**Problem:** The `FirebaseAuthentication` class reads the raw `HTTP_AUTHORIZATION` header and treats it directly as a `firebase_id` lookup key. It never calls `firebase_admin.auth.verify_id_token()`. Firebase IDs are non-secret identifiers—any client that knows another user's `firebase_id` can impersonate them with zero cryptographic verification. This is a critical authentication bypass.

```python
# Current (INSECURE) — no token verification whatsoever
fb_id = request.META.get('HTTP_AUTHORIZATION')
user = User.objects.get(firebase_id=fb_id)
```

**Fix:** Verify the token with the Firebase Admin SDK. Extract the `uid` from the decoded token result.

```python
def authenticate(self, request):
    auth_header = request.META.get('HTTP_AUTHORIZATION')
    if not auth_header:
        raise NoAuthToken("No auth token provided")
    try:
        decoded_token = auth.verify_id_token(auth_header)
    except auth.InvalidIdTokenError:
        raise InvalidAuthToken("Invalid auth token")
    except Exception:
        raise FirebaseError("Firebase authentication failed")
    try:
        user = User.objects.get(firebase_id=decoded_token['uid'])
    except User.DoesNotExist:
        raise InvalidAuthToken("User not found")
    return (user, None)
```

---

### 1.2 Firebase App Double-Initialization Risk

**File:** `firebase/authentication.py:15-16`

**Problem:** Firebase is initialized at module import time with no guard:

```python
cred = credentials.Certificate(settings.FIREBASE_CONFIG)
firebase_admin.initialize_app(cred)
```

If `authentication.py` is imported more than once (e.g., during testing, hot reload, or by multiple workers sharing a module), `initialize_app` raises `ValueError: The default Firebase app already exists`. This will crash the server.

**Fix:** Use the standard guard pattern:

```python
if not firebase_admin._apps:
    cred = credentials.Certificate(settings.FIREBASE_CONFIG)
    firebase_admin.initialize_app(cred)
```

---

### 1.3 `firebase-config.json` Contains Private Keys — Must Not Be Committed

**File:** `backend/settings.py:171`

**Problem:** `FIREBASE_CONFIG = os.path.join(BASE_DIR, 'firebase-config.json')` points to a file inside the project directory. Firebase service account JSON files contain a private RSA key (`private_key` field). If this file is tracked by git (which the path strongly implies), the private key is committed to version history and must be considered permanently compromised.

**Fix:**
1. Add `firebase-config.json` to `.gitignore` immediately.
2. Rotate the Firebase service account key in the Firebase console.
3. Store the credentials as environment variables or use a secrets manager:

```python
# settings.py
import json, tempfile

firebase_creds = json.loads(os.environ['FIREBASE_CREDENTIALS_JSON'])
with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
    json.dump(firebase_creds, f)
    FIREBASE_CONFIG = f.name
```

Or use `firebase_admin.credentials.Certificate(dict)` which accepts a dictionary directly — no file needed.

---

### 1.4 Missing Authorization Checks on Destructive Operations

**Files:**
- `users/views.py:117-123` — `UserViewSet.destroy`: Any authenticated user can delete any user by providing their `pk`. No ownership check.
- `feed/views.py:328-349` — `MyPlaylists.delete`: Retrieves playlist by `id` from query params but never verifies `playlist.user == request.user`.
- `feed/views.py:469-476` — `CommentView.delete`: Any authenticated user can delete any comment by ID.
- `notifications/views.py:139-145` — `NotificationView.delete`: Any authenticated user can delete any notification.

**Fix:** Add ownership checks before every destructive operation:

```python
def delete(self, request, pk):
    obj = get_object_or_404(Playlist, pk=pk)
    if obj.user != request.user:
        return Response(status=status.HTTP_403_FORBIDDEN)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
```

---

### 1.5 Email Endpoint Is an Open Relay / Email Spoofing Vector

**File:** `users/email/views.py:35`

**Problem:** The contact form uses the user-supplied `email` as the `from_email` of the `EmailMessage`. This makes the server act as an open relay — any attacker can send arbitrary emails that appear to come from any address, delivered through the application's trusted SMTP credentials.

**Fix:** Use a fixed `from_email` (the application's own address) and include the user's email in the body only:

```python
email_message = EmailMessage(
    subject=subject,
    body=f"From: {name} <{email}>\n\n{message}",
    from_email='noreply@cyclesstudios.com',  # fixed sender
    to=[to_email],
    reply_to=[email],  # user's email as reply-to, not from
)
```

---

### 1.6 FCM Legacy API Is Shut Down — Push Notifications Are Broken

**File:** `notifications/views.py:93`

**Problem:** The notification system uses `https://fcm.googleapis.com/fcm/send` — the FCM Legacy HTTP API, which Google deprecated in June 2023 and **shut down on June 20, 2024**. All push notification calls are currently failing silently.

**Fix:** Migrate to the FCM HTTP v1 API using the Firebase Admin SDK:

```python
from firebase_admin import messaging

def send_push_notification(device_token, title, body):
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=device_token,
    )
    try:
        messaging.send(message)
    except messaging.UnregisteredError:
        # Token is invalid — delete it from DB
        fcmToken.objects.filter(token=device_token).delete()
    except Exception as e:
        logger.exception("Failed to send push notification")
```

---

### 1.7 `CSRF_TRUSTED_ORIGINS` Contains a Hostname Typo

**File:** `backend/settings.py:34`

**Problem:** `'https://*.cycles-11ce5033b5eb.herokuapp.com'` is missing `-app`. The actual hostname is `cycles-app-11ce5033b5eb.herokuapp.com`. CSRF protection for production is non-functional.

**Fix:**
```python
CSRF_TRUSTED_ORIGINS = ['https://*.cycles-app-11ce5033b5eb.herokuapp.com']
```

---

### 1.8 `User.firebase_id` Has No Uniqueness Constraint

**File:** `users/models.py:13`

**Problem:** `firebase_id = models.CharField(max_length=400, null=True, blank=True)` — no `unique=True`. Two accounts could share the same Firebase UID, and `User.objects.get(firebase_id=...)` would raise `MultipleObjectsReturned`, crashing authentication for both users. This also has no `db_index=True`, meaning every auth request does a full table scan.

**Fix:**
```python
firebase_id = models.CharField(max_length=400, null=True, blank=True, unique=True, db_index=True)
```

---

### 1.9 Manual CORS Headers and Broken Response in `SubscriptionView`

**File:** `users/views.py:200-213`

**Problems:**
1. The view manually appends CORS headers to a `JsonResponse`, then wraps it in `Response(response)` — passing a `JsonResponse` object as data to DRF's `Response`. This will serialize the response object itself, not the intended JSON content.
2. Manual CORS headers are redundant and inconsistent with `django-cors-headers`.
3. No validation on the `email` field — any string is accepted.

**Fix:**
```python
def post(self, request):
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
    Subscription.objects.get_or_create(email=email)
    return Response({'message': 'Thank you!'}, status=status.HTTP_201_CREATED)
```

---

## 2. Critical Runtime Bugs (Code Crashes in Production)

### 2.1 `is_spotify_authenticated` Silently Swallows Exceptions and Returns Wrong Value

**File:** `spotify_api/util.py:53-54`

**Problem:**
```python
try:
    if expiry <= timezone.now():
        refresh_spotify_token(user)
    return True
except:
    False  # ← bare expression, NOT `return False`
```

The bare `False` statement does nothing — it's not `return False`. If `refresh_spotify_token` raises any exception (e.g., Spotify is down, network timeout, invalid token), the exception is silently swallowed, the function falls through past the `except` block, and then... nothing. The function has no return statement after the `except`, so it implicitly returns `None`. This means callers checking `if is_spotify_authenticated(user)` will get a falsy `None` — which might hide what is actually a Spotify API failure.

**Fix:**
```python
def is_spotify_authenticated(user):
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
```

---

### 2.2 `update_user_token` Saves to Non-Existent Fields — Silent Data Loss

**File:** `spotify_api/util.py:35-42`

**Problem:**
```python
tokens.token = access_token          # field doesn't exist, it's `access_token`
tokens.save(update_fields=['token', 'token_secret', 'expires_at'])  # none of these exist
```

Django's `save(update_fields=...)` with non-existent field names will raise a `ValueError` or simply not update anything. This function silently fails. The function is also a duplicate of `update_or_create_user_tokens`.

**Fix:** Remove `update_user_token` entirely. It is fully superseded by `update_or_create_user_tokens`.

---

### 2.3 Multiple Views Return `None` on Exception Path

**Problem:** Several exception handlers `logger.exception(...)` and then fall off the end of the function with no `return` statement. Django will raise `ValueError: The view ... didn't return an HttpResponse object` resulting in a 500 with no body.

**Affected files:**
- `spotify_api/views.py:31-32` — `SpotifyAuthURL.get`
- `spotify_api/views.py:55-56` — `SpotifyCallback.post`
- `spotify_api/views.py:73-74` — `LoginSpotify.post`
- `spotify_api/views.py:88-89` — `IsSpotifyAuthenticated.get`
- `spotify_api/views.py:99-100` — `SpotifyLogout.delete`
- `spotify_api/views.py:151-152` — `SpotifyPlaylist.get`
- `spotify_api/views.py:166-167` — `SpotifyPlaylistTracks.get`
- `notifications/views.py:119-120` — `NotificationView.post`

**Fix:** Every exception handler must return a `Response`:
```python
except Exception as e:
    logger.exception("Error in SpotifyAuthURL")
    return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

---

### 2.4 `SpotifyCallback.post` References `response.status_code` on a Dict

**File:** `spotify_api/views.py:52-53`

**Problem:**
```python
response = post('https://accounts.spotify.com/api/token', ...).json()
if not response:
    return Response({'error': 'Spotify request failed!'}, status=response.status_code)
```

`.json()` returns a `dict`. Calling `.status_code` on a dict raises `AttributeError`. If Spotify returns an empty response, this error handler itself crashes.

**Fix:** Check the HTTP status before calling `.json()`:
```python
raw_response = post('https://accounts.spotify.com/api/token', ...)
if not raw_response.ok:
    return Response({'error': 'Spotify authentication failed.'}, status=status.HTTP_502_BAD_GATEWAY)
response = raw_response.json()
```

---

### 2.5 `PlaylistDetails.get` Concatenates Exception Object to String

**File:** `feed/views.py:93`

**Problem:**
```python
return JsonResponse({'error': 'An unexpected error occurred.' + e}, status=500)
```

`e` is an `Exception` object. Python cannot concatenate `str + Exception`. This raises `TypeError: can only concatenate str (not "Exception") to str`, masking the original error with a new one and returning a confusing 500.

**Fix:**
```python
except Exception as e:
    logger.exception("Error in PlaylistDetails.get: playlist_id=%s", playlist_id)
    return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)
```

---

### 2.6 `CommentView.post` Error Path Calls `JsonResponse` Without Required Arg

**File:** `feed/views.py:467`

**Problem:**
```python
except:
    return JsonResponse(status=500)
```

`JsonResponse` requires a `data` argument as its first positional parameter. `JsonResponse(status=500)` raises `TypeError: __init__() missing 1 required positional argument: 'data'`. Any error in comment creation throws a second uncaught exception.

**Fix:**
```python
except Exception as e:
    logger.exception("Error creating comment")
    return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)
```

---

### 2.7 `get_queryset` Returns a `Response` Object Instead of a Queryset

**Files:** `users/views.py:168-176`, `users/views.py:183-192`

**Problem:** Both `UsersFollowing` and `UsersFollowers` catch exceptions in `get_queryset` and return `Response(...)`. DRF's `ListAPIView` machinery calls `get_queryset()` and expects a queryset — passing it a `Response` object causes an `AttributeError` when DRF tries to paginate or filter it.

**Fix:** Let exceptions propagate to DRF's exception handler, or use `handle_exception`:
```python
def get_queryset(self):
    user_id = self.request.GET.get('user_id')
    return Follow.objects.filter(user=user_id)
```

---

### 2.8 `NotificationView.delete` Returns an Unserializable Tuple

**File:** `notifications/views.py:142-143`

**Problem:**
```python
notification = Notification.objects.get(id=notification_id)
return Response(notification.delete(), status=status.HTTP_200_OK)
```

`Model.delete()` returns a tuple `(rows_deleted, {model_label: count})`. DRF cannot serialize a tuple as a response body and will raise a `TypeError`.

The same bug exists in `fcmTokenView.delete` (`notifications/views.py:43`).

**Fix:**
```python
notification.delete()
return Response(status=status.HTTP_204_NO_CONTENT)
```

---

### 2.9 `CombinedSearchSerializer` Runs Duplicate Queries and Ignores `get_queryset` Results

**File:** `feed/serializers.py:9-22`, `feed/views.py:498-518`

**Problem:** `SearchView.get_queryset` builds a combined list of users + playlists and returns it. Then `CombinedSearchSerializer` completely ignores this list and independently runs its own two database queries with the same search term. The result is:
1. The search queries run twice (double DB load).
2. The combined list from `get_queryset` is passed to `CombinedSearchSerializer` one element at a time as `obj`, but the serializer calls `get_users` and `get_playlists` on every single element, running the full search queries N times (once per result).

This is an O(N²) query pattern.

**Fix:** Use a proper view structure — query once in the view, pass results to dedicated serializers:
```python
class SearchView(APIView):
    def get(self, request):
        q = request.query_params.get('q', '')
        users = User.objects.filter(Q(name__icontains=q) | Q(username__icontains=q))
        playlists = Playlist.objects.filter(playlist_title__icontains=q).select_related('user')
        return Response({
            'users': SearchUserSerializer(users, many=True).data,
            'playlists': SearchPlaylistSerializer(playlists, many=True).data,
        })
```

---

### 2.10 `SpotifyToken.expires_in` Has Invalid `max_length` on `DateTimeField`

**File:** `spotify_api/models.py:12`

**Problem:**
```python
expires_in = models.DateTimeField(max_length=3000)
```

`DateTimeField` does not accept `max_length`. While Django silently ignores this, it indicates confusion between field types, and could cause issues with future Django upgrades that may start raising errors for unknown kwargs.

**Fix:**
```python
expires_in = models.DateTimeField()
```

---

### 2.11 `Notification` ForeignKey Defaults Are Invalid

**File:** `notifications/models.py:28-32`

**Problem:**
```python
follow = models.ForeignKey(Follow, blank=True, null=True, on_delete=models.CASCADE, default='')
like = models.ForeignKey(Like, blank=True, null=True, on_delete=models.CASCADE, default='')
comment = models.ForeignKey(Comment, blank=True, null=True, on_delete=models.CASCADE, default='')
```

`default=''` on a `ForeignKey` field sets the default to an empty string `''`, not `None`. When Django tries to insert a `Notification` without specifying these fields, it will attempt to set the FK column to `''`, which fails the database's integer type constraint, causing an `IntegrityError`.

**Fix:** Use `default=None` on nullable ForeignKeys:
```python
follow = models.ForeignKey(Follow, blank=True, null=True, on_delete=models.SET_NULL, default=None)
```

(Also consider `SET_NULL` instead of `CASCADE` here — deleting a `Follow` should not cascade-delete the notification record.)

---

## 3. High Priority — Performance & Latency

### 3.1 `ORDER BY RANDOM()` on the Entire Playlist Table

**File:** `feed/views.py:35`

**Problem:** `Playlist.objects.all().order_by('?')` translates to `ORDER BY RANDOM()` in PostgreSQL. This forces a full sequential scan of the entire table plus a random sort. At 10,000 rows it already takes ~50ms. At 100,000 rows it takes seconds and becomes the dominant latency source for the main discovery feed.

**Fix Option A (fast, indexed):**
```python
import random
count = Playlist.objects.count()
offset = random.randint(0, max(count - 50, 0))
playlists = Playlist.objects.order_by('id')[offset:offset + 50]
```

**Fix Option B (best for production):** Cache a shuffled list in Redis, refreshed periodically via a scheduled task:
```python
from django.core.cache import cache

def get_shuffled_playlist_ids():
    ids = cache.get('shuffled_playlist_ids')
    if not ids:
        ids = list(Playlist.objects.values_list('id', flat=True))
        random.shuffle(ids)
        cache.set('shuffled_playlist_ids', ids, timeout=300)  # 5 min TTL
    return ids
```

---

### 3.2 Pagination Applied to Already-Serialized Data (Full Load into Memory)

**Problem:** Three views serialize the entire queryset into a Python list before paginating it. This loads all records into memory, serializes them all, then discards everything except one page.

**Affected files:**
- `feed/views.py:231-237` — `MyPlaylists.get`
- `feed/views.py:383-390` — `PlaylistsByHashtagView.get`
- `notifications/views.py:127-135` — `NotificationView.get`

**Fix:** Paginate the queryset first, then serialize only the page:
```python
queryset = Playlist.objects.filter(user=user).order_by('-date')
paginator = PageNumberPagination()
paginator.page_size = 10
result_page = paginator.paginate_queryset(queryset, request)  # ← queryset, not serializer.data
serializer = PlaylistSerializer(result_page, many=True)
return paginator.get_paginated_response(serializer.data)
```

---

### 3.3 N+1 Query Problem in Every Serializer With Nested User Data

**Problem:** Every serializer that accesses `playlist.user.username`, `playlist.user.avi_pic`, or `comment.user.username` triggers an additional SQL query per object. With a page size of 10, this is 11 queries instead of 2.

**Affected serializers:** `UserPlaylistSerializer`, `FollowingPlaylistSerializer`, `CommentSerializer`, `LikesSerializer`, `CommentLikesSerializer`, `FollowSerializer`, `FollowingSerializer`, `FollowerSerializer`

**Fix:** Add `select_related` to every queryset that feeds these serializers:
```python
# Playlists with user info
Playlist.objects.select_related('user').prefetch_related('hashtags').filter(...)

# Comments with user info
Comment.objects.select_related('user').filter(playlist=playlist).order_by('-date')

# Notifications with from_user info
Notification.objects.select_related('from_user', 'to_user').filter(to_user=user)

# Follow relationships
Follow.objects.select_related('user', 'following_user').filter(...)
```

---

### 3.4 Synchronous Spotify API Calls Block the Request/Response Cycle

**Files:** `feed/views.py:247-317` — `MyPlaylists.post`, `feed/views.py:95-191` — `PlaylistDetails.put`

**Problem:** Posting a playlist triggers sequential Spotify API calls to paginate through all tracks before responding. A playlist with 200 tracks requires 4+ HTTP round trips (each 100-300ms), making the total endpoint latency 500ms–2s+ before any DB work.

**Fix:** Accept the request immediately and process tracks asynchronously with Celery:
```python
# views.py
def post(self, request):
    serializer = PlaylistSerializer(data=request.data)
    if serializer.is_valid():
        with transaction.atomic():
            playlist = Playlist.objects.create(user=request.user, **serializer.validated_data)
            playlist.hashtags.set(serializer.validated_data['hashtags'])
        sync_playlist_tracks.delay(playlist.id, request.user.id)
        return Response({'playlist_id': playlist.id, 'status': 'syncing'}, status=HTTP_202_ACCEPTED)

# tasks.py
@shared_task(bind=True, max_retries=3)
def sync_playlist_tracks(self, playlist_id, user_id):
    ...
```

---

### 3.5 `GetDescription.put` — Unbounded Sync Loop Will Always Timeout

**File:** `feed/views.py:522-560`

**Problem:** This admin endpoint iterates every playlist in the database, issuing a Spotify API call per playlist. With 100+ playlists, this takes 10-30+ seconds and exceeds Gunicorn's 30-second worker timeout. There's no error recovery, no rate limiting (Spotify has a 100 req/30s limit), and the final `playlistDetails` variable only holds the last playlist's data.

**Fix:** Convert to a Celery task:
```python
@shared_task(rate_limit='100/m')
def update_all_playlists():
    for playlist_id in Playlist.objects.values_list('id', flat=True).iterator():
        update_single_playlist.delay(playlist_id)
```

---

### 3.6 Three Near-Identical Spotify Request Functions — Triple DB Load Per Request

**File:** `spotify_api/util.py:76-122`

**Problem:** `execute_spotify_api_request`, `execute_add_track_request`, and `execute_spotify_playlist_request` are three nearly identical functions. Each calls `is_spotify_authenticated(user)` first, which itself calls `get_user_tokens(user)` (a DB query) and potentially `refresh_spotify_token(user)` (another DB write). Then each calls `get_user_tokens(user)` again to get the access token. This is 2-3 DB queries before a single Spotify request, multiplied across every API call in a single view.

**Fix:** Consolidate into one function that passes the token in:
```python
def get_valid_spotify_token(user) -> str:
    """Returns a valid access token, refreshing if needed. Single DB read path."""
    tokens = get_user_tokens(user)
    if not tokens:
        raise SpotifyNotAuthenticated("User has no Spotify token")
    if tokens.expires_in <= timezone.now():
        refresh_spotify_token(user)
        tokens = get_user_tokens(user)  # re-fetch after refresh
    return tokens.access_token

def execute_spotify_request(user, endpoint, method='GET', params=None, json=None):
    access_token = get_valid_spotify_token(user)
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.request(method, BASE_URL + endpoint, headers=headers, params=params, json=json)
    try:
        return response.json()
    except ValueError:
        logger.error("Non-JSON Spotify response: %s %s", response.status_code, endpoint)
        return {'error': 'Invalid response from Spotify'}
```

---

### 3.7 Missing Database Indexes on All Frequently-Queried Fields

**Problem:** The following fields are used in `WHERE` clauses on every request but have no index (only Django's auto-created FK indexes apply):

| Table | Field | Used in |
|---|---|---|
| `users_user` | `firebase_id` | Every authenticated request |
| `feed_playlist` | `user_id`, `date` | Following feed, profile |
| `feed_like` | `user_id`, `playlist_id` | Like status per request |
| `feed_comment` | `playlist_id`, `date` | Comment listings |
| `users_follow` | `user_id`, `following_user_id` | Feed queries |
| `spotify_api_spotifytoken` | `user_id` | Every Spotify API call |
| `notifications_notification` | `to_user_id`, `date` | Notification inbox |
| `notifications_fcmtoken` | `user_id` | Every push notification |

**Fix:** Add `Meta.indexes` to models:
```python
class Like(models.Model):
    class Meta:
        unique_together = ('user', 'playlist')  # also prevents duplicate likes
        indexes = [models.Index(fields=['user', 'playlist'])]

class Playlist(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['user', '-date']),
            models.Index(fields=['playlist_id']),
        ]
```

---

### 3.8 Enable Database Connection Pooling

**File:** `backend/settings.py:119`

**Problem:** `DATABASES = {'default': dj_database_url.parse(os.environ['DATABASE_URL'])}` — no `CONN_MAX_AGE`. Django creates a new PostgreSQL connection per request (adds 20-50ms on Heroku).

**Fix:**
```python
DATABASES = {
    'default': {
        **dj_database_url.parse(os.environ['DATABASE_URL']),
        'CONN_MAX_AGE': 60,
    }
}
```

---

### 3.9 `UserSerializer` Triggers Full Follow Queries on Profile Load

**File:** `users/serializers.py:62-76`

**Problem:** `UserSerializer.get_following` calls `FollowSerializer(obj.follower.all(), many=True).data` and `get_follower` calls `FollowSerializer(obj.following.all(), many=True).data`. Each of these loads all follow relationships for the user and then for every follow, fetches the related user's `avi_pic` (another query each). A user with 500 followers triggers 500+ queries just to load their profile.

**Fix:** Return counts instead of full serialized follow data in the profile endpoint, and provide separate paginated endpoints for followers/following lists (which already exist):
```python
def get_following(self, obj):
    return obj.follower.count()

def get_followers(self, obj):
    return obj.following.count()
```

---

## 4. Code Quality, Architecture & Structure Issues

### 4.1 Duplicated Contact Form Implementation

**File:** `users/email/views.py`

**Problem:** Both `send_contact_message` (function-based view, line 11) and `ContactView` (class-based view, line 47) implement identical contact form logic. Only one is registered in the URL config but both exist, causing confusion and maintenance burden.

**Fix:** Delete `send_contact_message` (the function-based version). Keep only `ContactView`.

---

### 4.2 `storage_backend.py` at Project Root Is Unused

**File:** `storage_backend.py`

**Problem:** This file defines a custom S3 storage backend but S3 configuration is already handled inline in `settings.py` via the `STORAGES` dict. This file is never imported anywhere.

**Fix:** Delete `storage_backend.py`.

---

### 4.3 `media/avi/` Local Directory Is Unnecessary With S3 Storage

**Problem:** A `media/avi/` directory exists locally, but all media is stored in S3. Local media directory writes will silently fail in production and are meaningless.

**Fix:** Delete `media/` from the repository and add it to `.gitignore`.

---

### 4.4 `users/email/` Sub-App Is Overly Fragmented

**Problem:** The `users/email/` sub-directory contains `views.py`, `serializers.py`, and `urls.py` for a single endpoint. This creates unnecessary nesting and import complexity. It should be part of the `users` app.

**Fix:** Move contact email logic into `users/views.py` and `users/serializers.py`. Remove the `users/email/` subdirectory.

---

### 4.5 Wildcard Imports Obscure Dependencies and Cause Subtle Bugs

**Problem:** All views use `from .models import *` and `from .serializers import *`. This:
- Pollutes the namespace (e.g., `type` in `notifications/views.py:63` shadows the Python built-in)
- Makes it unclear which symbols are available without reading all model/serializer files
- Causes re-exports of unrelated symbols (e.g., `notifications/views.py` imports `User`, `Follow`, `Comment`, `Like` via `from .models import *`, but those are not defined in `notifications/models.py` — they're transitively imported there, making this fragile and confusing)

**Fix:** Replace all wildcard imports with explicit imports everywhere.

---

### 4.6 `PlaylistbyHashtagSerializer` Has Methods Defined Inside `Meta`

**File:** `feed/serializers.py:124-131`

**Problem:**
```python
class PlaylistbyHashtagSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer()

    class Meta:
        model = Playlist
        fields = [...]

        def get_username_from_user(self, playlist):  # ← inside Meta, not the serializer
            ...
        def get_avi_pic(self, playlist):              # ← inside Meta, not the serializer
            ...
```

These two methods are defined inside `Meta`, not on `PlaylistbyHashtagSerializer`. They are dead code — never called.

**Fix:** Either remove them (they're not in `fields`) or move them to the serializer class body.

---

### 4.7 `UserSerializer` Exposes `email` Field

**File:** `users/serializers.py:68`

**Problem:** `UserSerializer` includes the `email` field in its output. This is the public-facing profile serializer used when viewing any user. Exposing email addresses to all authenticated users is a privacy violation.

**Fix:** Remove `email` from `UserSerializer.Meta.fields`.

---

### 4.8 `FollowSerializer` Uses `fields = '__all__'` and Returns Wrong User Data

**File:** `users/serializers.py:89-100`

**Problem:** `FollowSerializer.get_username` and `get_avi_pic` return data for `follow.user` (the follower), not `follow.following_user` (the person being followed). When used to populate the `following` list on a profile, this returns the viewer's own username and avatar for every person they follow.

**Fix:** The correct field depends on context. `FollowingSerializer` (line 103) and `FollowerSerializer` (line 127) already handle this properly. `FollowSerializer` should be simplified or removed.

---

### 4.9 Middleware Order Is Incorrect

**File:** `backend/settings.py:81-91`

**Problem:** `SecurityMiddleware` must be first in the stack (it handles HTTPS redirects, HSTS). `WhiteNoiseMiddleware` must be directly after `SecurityMiddleware` per its documentation. Currently both are placed after `CorsMiddleware`.

**Current order:**
```python
"corsheaders.middleware.CorsMiddleware",       # 1 ← wrong position for CORS
"whitenoise.middleware.WhiteNoiseMiddleware",  # 2 ← must be after SecurityMiddleware
'django.middleware.security.SecurityMiddleware', # 3 ← must be first
```

**Fix:**
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',         # 1 — must be first
    "whitenoise.middleware.WhiteNoiseMiddleware",            # 2 — right after Security
    "corsheaders.middleware.CorsMiddleware",                 # 3 — before CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

---

### 4.10 WhiteNoise and S3 for Static Files Are Configured Simultaneously

**File:** `backend/settings.py:187-196`

**Problem:** `STORAGES["staticfiles"]` is set to `S3Boto3Storage`, but `WhiteNoiseMiddleware` is also in the middleware stack. WhiteNoise serves static files from the local filesystem. With S3 as the staticfiles backend, there are no local static files to serve, so WhiteNoise does nothing and the middleware is wasted overhead on every request. Additionally, `django_heroku.settings(locals(), staticfiles=False)` disables Heroku's automatic static file configuration, which may cause `collectstatic` to behave unexpectedly.

**Fix:** Pick one approach consistently:
- **S3 only** (recommended for production): Remove `WhiteNoiseMiddleware` from `MIDDLEWARE`. Set `STORAGES["staticfiles"]` to S3.
- **WhiteNoise only**: Remove `STORAGES["staticfiles"]` S3 config. Use `whitenoise.storage.CompressedManifestStaticFilesStorage`.

---

### 4.11 `django_heroku.settings(locals())` Magic Mutation

**File:** `backend/settings.py:201`

**Problem:** `django_heroku.settings(locals())` modifies the local variable dict of `settings.py` at runtime. This can silently override `DATABASES`, `ALLOWED_HOSTS`, `LOGGING`, and other settings that were explicitly configured earlier in the file. The behavior is unpredictable and makes debugging very hard.

**Fix:** Replace with explicit configuration using `dj-database-url` and whitenoise (already partially done). Remove the `django-heroku` dependency and replace the one-liner with explicit settings.

---

### 4.12 `permission_class` Typo Throughout (Permissions Silently Not Applied)

**Files:** `users/views.py:86, 128, 164, 180` and feed views

**Problem:** `permission_class = [...]` (singular) is not a recognized DRF attribute. The correct attribute is `permission_classes` (plural). The typo means local permission overrides are silently ignored. All these views fall back to the global `IsAuthenticated` default — which happens to be correct — but if a developer changes the global default, these views will unexpectedly follow.

**Fix:** Rename to `permission_classes` everywhere.

---

### 4.13 `CORS_ALLOWED_ORIGINS` Contains HTTP Origins in Production

**File:** `backend/settings.py:40-41`

**Problem:**
```python
"http://cycles-app-11ce5033b5eb.herokuapp.com",   # HTTP — insecure
```

Production origins should always be HTTPS. Allowing HTTP origins in CORS config means the browser may permit cross-origin requests over unencrypted connections.

**Fix:** Remove all `http://` production origins. Keep only `https://`.

---

### 4.14 No Service/Business Logic Layer

**Problem:** All business logic lives directly in views. This makes unit testing impossible (every test requires a full HTTP request), creates duplicate logic (track-fetching in `MyPlaylists.post` vs. `PlaylistDetails.put` is ~80 lines of identical code), and tightly couples business rules to HTTP handling.

**Fix:** Introduce a `services.py` module in each app:

```
users/services.py       # create_user(), follow_user(), unfollow_user()
feed/services.py        # create_playlist(), delete_playlist(), get_discover_feed()
spotify_api/services.py # sync_playlist_tracks(), refresh_token_if_needed()
notifications/services.py # send_notification(), create_notification()
```

---

### 4.15 Inconsistent Error Response Format

**Problem:** The API returns errors in inconsistent shapes:
- `{'error': 'message'}` — most common
- `{'Error': 'message'}` — uppercase key (Spotify views)
- `Response(status=400)` — no body
- `Response('false')` / `Response('true')` — bare strings (Spotify views)

This makes client-side error handling impossible to standardize.

**Fix:** Define a consistent response schema and enforce it project-wide:
```python
# utils/responses.py
def error_response(message: str, status_code: int = 400) -> Response:
    return Response({'error': message}, status=status_code)
```

---

### 4.16 Dead Code Should Be Removed

**Files to clean up:**
- `feed/views.py:562-779` — ~200 lines of commented-out OpenAI integration
- `feed/views.py:15` — `# import openai`
- `users/views.py:16-30` — `CustomAuthToken` view (uses DRF token auth, superseded by Firebase)
- `users/views.py:7-8` — Unused imports (`Token`, `ObtainAuthToken`)
- `users/serializers.py:8-13` — `TokenSerializer` (unused)
- `users/serializers.py:55-58` — Commented-out duplicate `UserRegisterSerializer`
- `feed/views.py:16` — Duplicate `from django.db import transaction` import
- `spotify_api/views.py:185-195` — Non-functional `SpotifySearch` class
- `users/views.py:144-146` — `__str__` method defined inside `FollowingView.post` (does nothing)
- `spotify_api/util.py:35-42` — `update_user_token` function (broken duplicate of `update_or_create_user_tokens`)
- `notifications/views.py:113` — `else: None` (bare `None` expression, does nothing)

---

### 4.17 Add Security Headers to Settings

**Problem:** Django security headers are not configured.

**Fix:**
```python
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

---

### 4.18 Add Rate Limiting

**Problem:** No throttling on any endpoint allows brute force attacks, subscription spam, and exhaustion of Spotify API quota.

**Fix:**
```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/hour',
        'user': '200/hour',
    }
}
```

Apply tighter per-view throttles to `CreateUser` and contact/subscription endpoints.

---

### 4.19 Add Structured Logging

**Problem:** Views use `print()` statements (`users/views.py:63`, `notifications/views.py:39`, `feed/views.py:555`) and placeholder log messages (`logger.exception("-------", e)`, `logger.exception("-----::", e)`) that are useless in production log aggregation.

**Fix:** Replace all `print()` with `logger` calls. Use meaningful log messages with context:
```python
logger.exception("Failed to send push notification to user %s", to_user.id)
```

Configure structured JSON logging in `settings.py`.

---

### 4.20 Add API Versioning

**Problem:** No versioning means any breaking API change immediately breaks all clients.

**Fix:** Add URL namespace versioning:
```python
urlpatterns = [
    path('api/v1/', include([
        path('users/', include('users.urls')),
        path('feed/', include('feed.urls')),
        path('spotify_api/', include('spotify_api.urls')),
        path('notifications/', include('notifications.urls')),
    ])),
]
```

---

### 4.21 Add a Health Check Endpoint

**Problem:** No health check endpoint for load balancers and uptime monitors.

**Fix:**
```python
# backend/urls.py
from django.http import JsonResponse

urlpatterns = [
    path('health/', lambda r: JsonResponse({'status': 'ok'})),
    ...
]
```

---

### 4.22 Split Settings into Dev/Prod

**Problem:** A single `settings.py` with `DEBUG = False` hardcoded prevents local development without manual overrides. `ALLOWED_HOSTS` is hardcoded to the Heroku hostname.

**Fix:**
```
backend/settings/
  base.py         # shared settings
  development.py  # DEBUG=True, local DB, console email
  production.py   # HTTPS, S3, Heroku DB, strict ALLOWED_HOSTS
```

---

## 5. Model-Level Improvements

### 5.1 `Like` Model Allows Duplicate Likes

**File:** `feed/models.py:48-54`

**Problem:** No `unique_together` constraint on `(user, playlist)`. A user can like the same playlist multiple times.

**Fix:**
```python
class Meta:
    unique_together = ('user', 'playlist')
```

### 5.2 `fcmToken` Model Naming Does Not Follow PEP 8

**File:** `notifications/models.py:9`

The model `fcmToken` should be `FcmToken` (PascalCase). This propagates throughout views and serializers, creating confusing references.

### 5.3 `Playlist.playlist_tracks` Is a CharField Storing Ambiguous Data

**File:** `feed/models.py:27-28`

`playlist_tracks = models.CharField(max_length=300, default=None, blank=True)` appears to store a count or Spotify API URL. The field name implies tracks but it's a `CharField`. This should be either an `IntegerField` for count, or removed if derivable from `PlaylistTracks.objects.filter(playlist=self).count()`.

### 5.4 `AbstractUser` Password Fields Are Unused

**File:** `users/models.py:12`

`User` extends `AbstractUser`, which includes Django's built-in password authentication (`password`, `last_login`, `is_superuser`, `groups`, `user_permissions`). Since authentication is 100% Firebase-based, all these fields are vestigial. They waste storage and create a misleading model that suggests Django's auth system is in use.

**Fix (long-term):** Switch to `AbstractBaseUser` with only the fields that are actually used, removing the Django auth overhead.

---

## 6. Testing Strategy

**Problem:** Zero test coverage across all four apps.

### 6.1 Recommended Test Structure
```
tests/
  conftest.py              # UserFactory, PlaylistFactory, Firebase mock
  users/
    test_authentication.py  # auth bypass, invalid token, missing token
    test_registration.py    # username validation, duplicate usernames
    test_follow.py          # follow/unfollow, authorization
  feed/
    test_playlists.py       # CRUD, ownership enforcement, pagination
    test_likes.py           # duplicate like prevention
    test_search.py          # query correctness, no duplicate DB hits
  spotify_api/
    test_oauth.py           # token storage, refresh logic
    test_util.py            # unit tests for consolidated request function
  notifications/
    test_fcm.py             # FCM v1 API integration
```

### 6.2 Priority Test Cases

**Critical (must pass before any deployment):**
- Request with no token → 401
- Request with crafted `firebase_id` without a valid JWT → 401
- DELETE user account as a different authenticated user → 403
- DELETE playlist as a different authenticated user → 403
- Like same playlist twice → 400/409 (once unique constraint is added)

**Performance:**
- Search endpoint executes ≤2 SQL queries regardless of result count
- Profile endpoint executes ≤3 SQL queries
- Playlist list endpoint executes ≤2 SQL queries

### 6.3 Dependencies to Add
```
pytest-django==4.9.0
factory-boy==3.3.1
pytest-mock==3.14.0
responses==0.25.0      # mock Spotify HTTP calls
freezegun==1.5.1       # mock timezone.now() for token expiry tests
```

---

## 7. Infrastructure Additions

| Addition | Purpose |
|---|---|
| **Celery + Redis** | Async Spotify track sync, push notifications, bulk updates |
| **django-redis** | Cache discovery feed, token validity, follower counts |
| **django-ratelimit** or DRF throttling | Rate limit auth, subscription, Spotify endpoints |
| **sentry-sdk** | Error tracking and performance monitoring |
| **python-json-logger** | Structured log output for log aggregation |

---

## 8. Recommended Implementation Order

| Phase | Items | Outcome |
|---|---|---|
| **Phase 1 — Security & Crashes** | §1.1–1.9, §2.1–2.11 | App is secure and doesn't crash |
| **Phase 2 — Performance** | §3.1–3.9 | Latency reduced, DB load reduced |
| **Phase 3 — Quality** | §4.5–4.22, §5.1–5.4 | Code is clean and maintainable |
| **Phase 4 — Testing** | §6.1–6.3 | Regression protection |
| **Phase 5 — Infrastructure** | §7 | Production-ready scale |
| **Phase 6 — File Structure** | §9 | Clean, standard Django project layout |
| **Phase 7 — Apple Music** | §12 | Apple Music parity with Spotify |

---

## 9. File Structure

The current layout has several structural problems that deviate from Django conventions and best practices.

### 9.1 Current Problems

**`firebase/` is listed in `INSTALLED_APPS` but is not a Django app**

`firebase/` has no `models.py`, `admin.py`, `apps.py`, `migrations/`, or `urls.py`. Django will attempt to call `AppConfig.ready()` on it and may emit warnings. It is a utility module masquerading as an app. It should become a plain Python package named `core/` and be removed from `INSTALLED_APPS`.

**`users/email/` is an unnecessary sub-package**

The `users/email/` directory contains `views.py`, `serializers.py`, and `urls.py` for exactly one endpoint — the contact form. It also contains two duplicate implementations of the same view (`send_contact_message` function-based + `ContactView` class-based). Everything here belongs directly in the `users/` app.

**`storage_backend.py` at the project root is unused**

This file defines `MediaStorage(S3Boto3Storage)` but S3 is already configured inline in `settings.py`'s `STORAGES` dict. It is never imported anywhere. Delete it.

**`credentials.py` files inside app directories**

`spotify_api/credentials.py` and `notifications/credentials.py` hold API keys imported via `from .credentials import *`. Credentials should never live as Python modules inside app packages. They belong in `settings.py` loaded from `os.environ`, or in a secrets manager.

**`media/` directory is tracked in git**

`media/avi/default_avi.jpg` (the default avatar) is committed. The `media/` directory is for user-uploaded content and should be gitignored. The default avatar static asset should be stored in `static/img/` or on S3, not in the media upload directory.

**`requirements.txt` has conflicting and misplaced dependencies**

- Both `psycopg2==2.9.9` and `psycopg2-binary==2.9.9` are installed — these conflict. Use only one: `psycopg2-binary` for development, compiled `psycopg2` for production (or use `psycopg2-binary` everywhere and document the trade-off).
- `autopep8==2.3.1` is a dev-only code formatter mixed with production dependencies.
- `python-environ==0.4.54` is a little-known package that appears unused — `settings.py` uses `os.environ` directly and `python-dotenv` is already present for `.env` file loading.
- `google-cloud-firestore==2.17.2` — the Firebase Admin SDK is used, but Cloud Firestore directly is never called. Likely an unnecessary 10+ transitive dependency chain.

**`spotify_api/util.py` vs `notifications/utils.py` — inconsistent naming**

Django convention is `utils.py`. `util.py` is non-standard and inconsistent with the rest of the project.

**URL configs use `from .views import *` everywhere**

`users/urls.py`, `feed/urls.py`, `notifications/urls.py`, and `spotify_api/urls.py` all use wildcard imports. This makes it impossible to know which views are available without reading all view files.

**`users/urls.py` applies permissions via inline decorator factories**

```python
path('register/', authentication_classes([])(permission_classes([AllowAny])(CreateUser)).as_view())
```

This is fragile and non-standard. Permissions and authentication classes should be set as class attributes on the view itself:
```python
class CreateUser(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
```

**URL prefix `spotify_api/` uses underscore**

REST API URL conventions use hyphens or plain names — not underscores. Should be `/api/v1/spotify/` once versioning is added.

**No `tests/` directory — test files are co-located empty placeholders**

Four empty `tests.py` files exist, one per app, with no `conftest.py`, `pytest.ini`, or fixture factories. Tests should live in a structured `tests/` directory at the project level.

---

### 9.2 Recommended Target Structure

```
cycles/
├── .gitignore                       ← add media/, __pycache__, *.pyc
├── README.md                        ← NEW (see §10)
├── CLAUDE.md                        ← NEW (see §11)
└── backend/
    ├── manage.py
    ├── Procfile
    ├── runtime.txt
    ├── requirements.txt             ← production only
    ├── requirements-dev.txt         ← NEW: dev/test tools
    ├── pytest.ini                   ← NEW
    ├── backend/
    │   ├── __init__.py
    │   ├── urls.py                  ← add health check, api/v1/ prefix
    │   ├── wsgi.py
    │   ├── asgi.py
    │   └── settings/                ← SPLIT from settings.py
    │       ├── __init__.py
    │       ├── base.py
    │       ├── development.py
    │       └── production.py
    ├── core/                        ← RENAMED from firebase/ (removed from INSTALLED_APPS)
    │   ├── __init__.py
    │   ├── authentication.py        ← FirebaseAuthentication (with verify_id_token fix)
    │   ├── exceptions.py            ← NoAuthToken, InvalidAuthToken, FirebaseError
    │   ├── responses.py             ← NEW: error_response(), success_response() helpers
    │   └── utils.py                 ← merge firebase/utils.py here
    ├── users/
    │   ├── __init__.py
    │   ├── models.py
    │   ├── views.py                 ← absorb ContactView from email/views.py
    │   ├── urls.py                  ← absorb email/urls.py; fix permission pattern
    │   ├── serializers.py           ← absorb ContactMessageSerializer from email/serializers.py
    │   ├── services.py              ← NEW: create_user(), follow_user(), etc.
    │   ├── admin.py
    │   ├── apps.py
    │   └── migrations/
    ├── feed/
    │   ├── __init__.py
    │   ├── models.py
    │   ├── views.py
    │   ├── urls.py
    │   ├── serializers.py
    │   ├── services.py              ← NEW: playlist CRUD, source-aware track sync dispatch
    │   ├── admin.py
    │   ├── apps.py
    │   └── migrations/
    ├── spotify_api/
    │   ├── __init__.py
    │   ├── models.py
    │   ├── views.py
    │   ├── urls.py
    │   ├── serializers.py
    │   ├── utils.py                 ← RENAMED from util.py; 3 request fns consolidated to 1
    │   ├── permissions.py
    │   ├── services.py              ← NEW: token refresh, fetch_and_store_tracks()
    │   ├── admin.py
    │   ├── apps.py
    │   └── migrations/
    ├── apple_music/                 ← NEW (see §12)
    │   ├── __init__.py
    │   ├── models.py
    │   ├── views.py
    │   ├── urls.py
    │   ├── serializers.py
    │   ├── utils.py
    │   ├── permissions.py
    │   ├── services.py
    │   ├── admin.py
    │   ├── apps.py
    │   └── migrations/
    ├── notifications/
    │   ├── __init__.py
    │   ├── models.py
    │   ├── views.py
    │   ├── urls.py
    │   ├── serializers.py
    │   ├── utils.py
    │   ├── services.py              ← NEW: FCM HTTP v1 send logic
    │   ├── admin.py
    │   ├── apps.py
    │   └── migrations/
    └── tests/                       ← NEW: top-level structured test directory
        ├── conftest.py
        ├── factories.py
        ├── users/
        │   ├── test_auth.py
        │   ├── test_profile.py
        │   └── test_follow.py
        ├── feed/
        │   ├── test_playlists.py
        │   └── test_search.py
        ├── spotify_api/
        │   └── test_utils.py
        ├── apple_music/
        │   └── test_utils.py
        └── notifications/
            └── test_notifications.py
```

---

### 9.3 Files to Delete

| File | Reason |
|---|---|
| `storage_backend.py` | Unused; S3 already configured in `settings.py` |
| `spotify_api/credentials.py` | Credentials → `os.environ` via `settings.py` |
| `notifications/credentials.py` | Credentials → `os.environ` via `settings.py` |
| `users/email/views.py` | Merge `ContactView` into `users/views.py` |
| `users/email/serializers.py` | Merge `ContactMessageSerializer` into `users/serializers.py` |
| `users/email/urls.py` | Merge contact URL into `users/urls.py` |
| `users/email/__init__.py` | Sub-package dissolved |
| `media/avi/default_avi.jpg` | Move to `static/img/` or host on S3; add `media/` to `.gitignore` |

---

### 9.4 Files to Rename

| From | To | Reason |
|---|---|---|
| `firebase/` directory | `core/` directory | Not a Django app; utility module; remove from `INSTALLED_APPS` |
| `spotify_api/util.py` | `spotify_api/utils.py` | Django convention |
| `backend/settings.py` | `backend/settings/base.py` | Split into dev/prod settings package |

---

### 9.5 `requirements.txt` Cleanup

**Remove from `requirements.txt`:**
- `psycopg2==2.9.9` — conflicts with `psycopg2-binary`; keep only one
- `autopep8==2.3.1` — dev tool, move to `requirements-dev.txt`
- `python-environ==0.4.54` — unused; `python-dotenv` already handles `.env` loading
- `google-cloud-firestore==2.17.2` — not used directly; only Firebase Admin SDK is needed

**Create `requirements-dev.txt`:**
```
autopep8
pytest-django
factory-boy
pytest-mock
responses
freezegun
```

---

## 10. README.md

The repository has no `README.md`. Create `/home/user/cycles/README.md`:

```markdown
# Cycles

Social playlist-sharing app. Users connect their Spotify or Apple Music accounts,
share playlists, follow other users, and like and comment on playlists.

## Tech Stack

- **Backend:** Django 5.1, Django REST Framework, PostgreSQL
- **Auth:** Firebase Authentication
- **Storage:** AWS S3 (media + static files)
- **Push Notifications:** Firebase Cloud Messaging (FCM HTTP v1)
- **Music:** Spotify Web API, Apple Music API (MusicKit)
- **Hosting:** Heroku

## Prerequisites

- Python 3.12
- PostgreSQL
- Firebase project (service account)
- Spotify Developer App
- Apple Developer account with MusicKit enabled
- AWS S3 bucket

## Local Setup

\`\`\`bash
git clone <repo>
cd cycles/backend
python -m venv env && source env/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env        # fill in values
python manage.py migrate
python manage.py runserver
\`\`\`

## Environment Variables

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DATABASE_URL` | PostgreSQL connection string |
| `FIREBASE_CREDENTIALS_JSON` | Firebase service account JSON (stringified) |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket name |
| `AWS_S3_REGION_NAME` | S3 region |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |
| `SPOTIFY_REDIRECT_URL` | Spotify OAuth redirect URI |
| `APPLE_MUSIC_PRIVATE_KEY` | Apple MusicKit `.p8` key contents |
| `APPLE_MUSIC_KEY_ID` | Apple MusicKit key ID |
| `APPLE_MUSIC_TEAM_ID` | Apple Developer Team ID |
| `APPLE_MUSIC_STOREFRONT` | Apple Music storefront (e.g. `us`) |
| `FCM_CREDENTIALS` | FCM server key |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_HOST_USER` | SMTP user |
| `EMAIL_HOST_PASSWORD` | SMTP password |

## API Endpoints

| Prefix | App |
|---|---|
| `/api/v1/users/` | User profiles, auth, follow |
| `/api/v1/feed/` | Playlists, likes, comments, search |
| `/api/v1/spotify/` | Spotify OAuth and playlist fetch |
| `/api/v1/apple-music/` | Apple Music token and playlist fetch |
| `/api/v1/notifications/` | FCM tokens, push notifications |
| `/health/` | Health check |

## Running Tests

\`\`\`bash
cd backend && pytest
\`\`\`

## Deployment

Heroku deployment. Set all environment variables in Heroku config vars.
Static files are served from S3. Media files are stored in S3.
```

---

## 11. CLAUDE.md

Create `/home/user/cycles/CLAUDE.md` at the repository root to give Claude Code persistent context about this project:

```markdown
# Cycles — Claude Code Context

## Project Overview

Django REST API backend for Cycles, a social playlist-sharing app.
Users connect Spotify and Apple Music, share playlists, follow each other,
like and comment. Firebase handles authentication; AWS S3 handles media storage.

## Directory Map

| Directory | Purpose |
|---|---|
| `backend/backend/` | Django settings package, root URL config |
| `backend/core/` | Firebase auth class, shared exceptions, response helpers |
| `backend/users/` | User model, Follow, Subscription, contact email |
| `backend/feed/` | Playlist, PlaylistTracks, Like, Comment models; discover/following feed |
| `backend/spotify_api/` | Spotify OAuth, playlist/track fetch |
| `backend/apple_music/` | Apple Music developer token, user token, playlist/track fetch |
| `backend/notifications/` | FCM tokens, Notification model, push via FCM HTTP v1 |
| `backend/tests/` | All tests, factories, fixtures |

## Authentication

All endpoints require a Firebase ID token in the `Authorization` header.
`FirebaseAuthentication` in `core/authentication.py` calls `auth.verify_id_token()`.
Public endpoints set `authentication_classes = []` and `permission_classes = [AllowAny]`
directly on the view class — never via URL config decorators.

## Music Integration Pattern

Both Spotify and Apple Music follow the same server-side flow:
1. Client authenticates with the music service and sends token(s) to backend
2. Backend stores token in `SpotifyToken` / `AppleMusicToken`
3. `GET /playlists/` returns user's music service playlists not yet shared on Cycles
4. `GET /playlist-tracks/` returns tracks for a given playlist
5. `POST /feed/my-playlists/` triggers async track sync via Celery

## Key Conventions

- **No wildcard imports.** Always use explicit imports.
- **Paginate querysets, not serialized data.** Call `paginator.paginate_queryset(queryset, request)` before serializing.
- **Always use `select_related`/`prefetch_related`** on querysets that feed serializers with nested foreign key access.
- **Business logic belongs in `services.py`**, not in views. Views handle HTTP; services handle logic.
- **Long-running tasks use Celery.** Never call Spotify or Apple Music APIs synchronously during POST requests.
- **All credentials from `os.environ`.** Never commit credential files or hardcode keys.
- **Consistent error format:** `{'error': 'message'}` with appropriate HTTP status code.
- **Log with `logger.exception(...)`.** Never use `print()`.
- **`permission_classes`** (plural) — not `permission_class`. The typo silently disables the check.

## Database

PostgreSQL. Run `python manage.py migrate` after any model change.
`CONN_MAX_AGE = 60` for connection pooling.

## Do Not

- Commit `firebase-config.json`, `.env`, `.p8` files, or any credentials
- Use `from .models import *` or `from .serializers import *`
- Add `order_by('?')` — use indexed random sampling or a cached shuffled list
- Put business logic directly in views
- Make synchronous external API calls inside POST/PUT view handlers
- Use the FCM Legacy API (`fcm.googleapis.com/fcm/send`) — it was shut down June 2024
```

---

## 12. Apple Music Integration

### Overview

Add Apple Music playlist sharing that mirrors the existing Spotify flow end-to-end.
Users connect their Apple Music account, browse their library playlists, pick one,
and post it to Cycles exactly as they do with Spotify. The same `Playlist`,
`PlaylistTracks`, `Like`, `Comment`, and feed endpoints serve both sources.

A new `source` field on `Playlist` distinguishes origin. Track-fetching logic
in `feed/services.py` dispatches to the appropriate music service based on this field.

---

### New App: `apple_music/`

Structure mirrors `spotify_api/` exactly:

```
backend/apple_music/
├── __init__.py
├── models.py        ← AppleMusicToken
├── views.py         ← 6 API views
├── urls.py
├── serializers.py
├── utils.py         ← developer token generation, API request helper
├── services.py      ← token management, fetch_and_store_tracks()
├── permissions.py   ← HasAppleMusicToken
├── admin.py
├── apps.py
└── migrations/
```

Add `'apple_music'` to `INSTALLED_APPS` in `settings/base.py`.
Add `path('apple-music/', include('apple_music.urls'))` to root `urls.py`.

---

### Model

```python
# apple_music/models.py
class AppleMusicToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_index=True,
        unique=True,  # one token per user
    )
    music_user_token = models.CharField(max_length=3000)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AppleMusicToken(user={self.user_id})"
```

Apple Music user tokens do not expire server-side — MusicKit JS renews them
on the client as needed. No `expires_in` field is required.

---

### Auth Flow

Apple Music uses **MusicKit JS** (client-side) instead of a server-side OAuth redirect:

1. Client requests Apple Developer Token from `GET /apple-music/developer-token/`
2. Client initializes MusicKit JS with the developer token
3. Client calls `music.authorize()` — Apple handles the auth UI natively
4. MusicKit JS returns a `musicUserToken` string to the client
5. Client POSTs `musicUserToken` to `POST /apple-music/login/`
6. Server stores the token linked to the authenticated user

The server **never handles an OAuth redirect** — only token storage.

---

### Apple Developer Token

A short-lived JWT (up to 6 months) signed with an ES256 private key from
Apple Developer Portal → Certificates, Identifiers & Profiles → Keys → MusicKit.

```python
# apple_music/utils.py
import jwt
import time
import os
from django.core.cache import cache

DEVELOPER_TOKEN_CACHE_KEY = 'apple_music_developer_token'

def generate_developer_token() -> str:
    cached = cache.get(DEVELOPER_TOKEN_CACHE_KEY)
    if cached:
        return cached
    private_key = os.environ['APPLE_MUSIC_PRIVATE_KEY']
    key_id = os.environ['APPLE_MUSIC_KEY_ID']
    team_id = os.environ['APPLE_MUSIC_TEAM_ID']
    now = int(time.time())
    expiry = 15777000  # ~6 months in seconds
    payload = {'iss': team_id, 'iat': now, 'exp': now + expiry}
    token = jwt.encode(payload, private_key, algorithm='ES256',
                       headers={'kid': key_id})
    cache.set(DEVELOPER_TOKEN_CACHE_KEY, token, timeout=expiry - 86400)  # expire 1 day early
    return token

def get_apple_music_headers(user) -> dict:
    """Returns auth headers for Apple Music API calls."""
    from .models import AppleMusicToken
    token_obj = AppleMusicToken.objects.get(user=user)
    return {
        'Authorization': f'Bearer {generate_developer_token()}',
        'Music-User-Token': token_obj.music_user_token,
    }

def execute_apple_music_request(user, endpoint: str, params: dict = None) -> dict:
    import requests
    import logging
    logger = logging.getLogger(__name__)
    headers = get_apple_music_headers(user)
    url = f'https://api.music.apple.com/{endpoint}'
    response = requests.get(url, headers=headers, params=params)
    try:
        return response.json()
    except ValueError:
        logger.error("Non-JSON Apple Music response: %s %s", response.status_code, url)
        return {'error': 'Invalid response from Apple Music'}
```

---

### New Environment Variables

| Variable | Description |
|---|---|
| `APPLE_MUSIC_PRIVATE_KEY` | Full contents of the `.p8` private key file |
| `APPLE_MUSIC_KEY_ID` | 10-character key identifier from Apple Developer Portal |
| `APPLE_MUSIC_TEAM_ID` | 10-character Apple Developer Team ID |
| `APPLE_MUSIC_STOREFRONT` | Storefront code for catalog lookups (e.g. `us`) |

---

### API Endpoints

| URL | Method | Auth | Description |
|---|---|---|---|
| `/apple-music/developer-token/` | GET | AllowAny | Return cached Apple Developer JWT |
| `/apple-music/login/` | POST | IsAuthenticated | Store `musicUserToken` for current user |
| `/apple-music/token/` | GET | IsAuthenticated | Check if current user is Apple Music authenticated |
| `/apple-music/logout/` | DELETE | IsAuthenticated | Delete stored token |
| `/apple-music/playlists/` | GET | HasAppleMusicToken | List library playlists not yet shared on Cycles |
| `/apple-music/playlist-tracks/` | GET | HasAppleMusicToken | Get tracks for a given playlist ID |

---

### Apple Music API Reference

**Base URL:** `https://api.music.apple.com`

**Required headers on every call:**
```
Authorization: Bearer {developer_token}
Music-User-Token: {music_user_token}
```

**Get user's library playlists (paginated):**
```
GET /v1/me/library/playlists?limit=25&offset=0
```
Response: `data[].id`, `data[].attributes.name`, `data[].attributes.artwork`

**Get tracks for a library playlist (paginated):**
```
GET /v1/me/library/playlists/{id}/tracks?limit=100
```
Response: `data[].attributes.name`, `data[].attributes.artistName`, `data[].attributes.albumName`, `data[].attributes.playParams.catalogId`

**Preview URLs** — library tracks do not include preview URLs. Cross-reference via catalog:
```
GET /v1/catalog/{storefront}/songs/{catalogId}
```
Response: `data[0].attributes.previews[0].url` — 30-second preview MP3.

Only store tracks where a preview URL exists (same filter as Spotify integration).

---

### Feed Model Change

Add `source` field to `Playlist` (requires migration):

```python
# feed/models.py
class Playlist(models.Model):
    SOURCE_SPOTIFY = 'spotify'
    SOURCE_APPLE = 'apple_music'
    SOURCE_CHOICES = [
        (SOURCE_SPOTIFY, 'Spotify'),
        (SOURCE_APPLE, 'Apple Music'),
    ]
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default=SOURCE_SPOTIFY,
        db_index=True,
    )
    # ... existing fields unchanged
```

---

### Track Sync Dispatch in `feed/services.py`

```python
# feed/services.py
def fetch_and_store_tracks(playlist: Playlist, user) -> int:
    """Dispatches to the correct music service based on playlist.source."""
    if playlist.source == Playlist.SOURCE_SPOTIFY:
        from spotify_api.services import fetch_spotify_tracks
        return fetch_spotify_tracks(playlist, user)
    elif playlist.source == Playlist.SOURCE_APPLE:
        from apple_music.services import fetch_apple_music_tracks
        return fetch_apple_music_tracks(playlist, user)
    raise ValueError(f"Unknown playlist source: {playlist.source}")
```

---

### Celery Task for Async Track Sync

```python
# feed/tasks.py
from celery import shared_task
from .models import Playlist
from .services import fetch_and_store_tracks
from users.models import User

@shared_task(bind=True, max_retries=3)
def sync_playlist_tracks(self, playlist_id: int, user_id: int):
    try:
        playlist = Playlist.objects.get(id=playlist_id)
        user = User.objects.get(id=user_id)
        count = fetch_and_store_tracks(playlist, user)
        return {'playlist_id': playlist_id, 'tracks_synced': count}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
```

---

### Differences vs Spotify

| Aspect | Spotify | Apple Music |
|---|---|---|
| Auth flow | Server-side OAuth redirect | Client-side MusicKit JS |
| Server token work | Exchange code → access + refresh tokens | Generate developer JWT; store user token |
| Token refresh | Server auto-refreshes when expired | Client handles; server just stores latest |
| Preview URLs | Included in track response | Separate catalog API lookup per track |
| Playlist scope | Public + private playlists | Library playlists only |
| Pagination | `next` URL in response | `next` URL in response (same pattern) |
| Dependencies | None new | None new (PyJWT + cryptography already present) |
