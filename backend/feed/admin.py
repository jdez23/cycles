from django.contrib import admin
from .models import *

# Register your models here.

admin.site.register(Like)
admin.site.register(Comment)
admin.site.register(Reply)
admin.site.register(Hashtag)
admin.site.register(Playlist)
admin.site.register(PlaylistTracks)
