from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check),
    path('feed/', include('feed.urls')),
    path('users/', include('users.urls')),
    path('spotify-api/', include('spotify_api.urls')),
    path('apple-music/', include('apple_music.urls')),
    path('notifications/', include('notifications.urls')),
]
