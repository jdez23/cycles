import os
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from taggit.managers import TaggableManager

from users.models import User

# Create your models here.


class Playlist(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, default=None
    )
    hashtags = TaggableManager(blank=True)
    playlist_url = models.CharField(max_length=300, default='', blank=True)
    playlist_ApiURL = models.CharField(
        max_length=300, default=None, blank=True)
    playlist_id = models.CharField(max_length=300, default='', blank=True)
    playlist_cover = models.CharField(max_length=300, default='', blank=True)
    playlist_title = models.CharField(max_length=300, default='', blank=True)
    playlist_description = models.CharField(
        max_length=3000, default='', blank=True, null=True)
    playlist_type = models.CharField(max_length=300, default='', blank=True)
    playlist_uri = models.CharField(max_length=300, default='', blank=True)
    playlist_tracks = models.CharField(
        max_length=300, default=None, blank=True)
    date = models.DateTimeField(editable=False, auto_now_add=True)

    def __str__(self):
        return self.playlist_title


class PlaylistTracks(models.Model):
    playlist = models.ForeignKey(
        Playlist, on_delete=models.CASCADE)
    name = models.CharField(max_length=300, default='')
    artist = models.CharField(max_length=300, default='')
    album = models.CharField(max_length=300, default='')
    track_id = models.CharField(max_length=300, default='')
    track_url = models.CharField(max_length=1000, default='')
    uri = models.CharField(max_length=300, default='')
    preview_url = models.CharField(default='')
    images = models.CharField(max_length=700, default='')


class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE)
    playlist = models.ForeignKey(
        Playlist, on_delete=models.CASCADE, default=False, blank=False)
    like = models.BooleanField(default=False)
    date = models.DateTimeField(editable=False, auto_now_add=True)

    def __str__(self):
        return f"User={self.user.username}||Liked || Playlist={self.playlist}"


class Comment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE)
    playlist = models.ForeignKey(
        Playlist, on_delete=models.CASCADE, null=False, blank=False, default=None)
    title = models.TextField()
    date = models.DateTimeField(editable=False, auto_now_add=True)

    def __str__(self):
        return f"User={self.user.username}||Title={self.title} || Playlist={self.playlist}"


class CommentLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE)
    comment = models.ForeignKey(
        Comment, on_delete=models.CASCADE, null=False, blank=False, default=None)
    like = models.BooleanField(default=False)
    date = models.DateTimeField(editable=False, auto_now_add=True)

    def __str__(self):
        return f"User={self.user.username}||Liked || Comment={self.comment}"


class Reply(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE)
    title = models.TextField()
    date = models.DateTimeField(editable=False, auto_now_add=True)

    def __str__(self):
        return f"User={self.user.username}||Comment={self.comment}"
