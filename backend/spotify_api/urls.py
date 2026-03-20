from django.urls import path
from .views import (
    AddSongToLikedPlaylist,
    IsSpotifyAuthenticated,
    LoginSpotify,
    SpotifyAuthURL,
    SpotifyCallback,
    SpotifyLogout,
    SpotifyPlaylist,
    SpotifyPlaylistTracks,
)

urlpatterns = [
    path("get-auth-url/", SpotifyAuthURL.as_view()),
    path("token-request/", SpotifyCallback.as_view()),
    path("spotify-login/", LoginSpotify.as_view()),
    path("spotify-logout/", SpotifyLogout.as_view()),
    path("token/", IsSpotifyAuthenticated.as_view()),
    path("add-track/", AddSongToLikedPlaylist.as_view()),
    path("spotify-playlist/", SpotifyPlaylist.as_view()),
    path("spotify-playlist-tracks/", SpotifyPlaylistTracks.as_view()),
]
