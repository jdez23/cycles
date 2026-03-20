from django.urls import path

from .views import (
    AppleMusicDeveloperToken,
    AppleMusicLogin,
    AppleMusicLogout,
    AppleMusicPlaylistTracks,
    AppleMusicPlaylists,
    IsAppleMusicAuthenticated,
)

urlpatterns = [
    path('developer-token/', AppleMusicDeveloperToken.as_view()),
    path('login/', AppleMusicLogin.as_view()),
    path('token/', IsAppleMusicAuthenticated.as_view()),
    path('logout/', AppleMusicLogout.as_view()),
    path('playlists/', AppleMusicPlaylists.as_view()),
    path('playlist-tracks/', AppleMusicPlaylistTracks.as_view()),
]
