import os
from .models import *
from rest_framework import serializers
from google.oauth2 import service_account
# from django.conf import settings


class fcmTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = fcmToken
        fields = "__all__"


class NotificationSerializer(serializers.ModelSerializer):
    playlist_url = serializers.SerializerMethodField('get_playlist_url')
    playlist_cover = serializers.SerializerMethodField('get_playlist_cover')
    playlist_title = serializers.SerializerMethodField('get_playlist_title')
    username = serializers.SerializerMethodField('get_username_from_user')
    avi_pic = serializers.SerializerMethodField('get_avi_pic')
    image = serializers.SerializerMethodField('get_image')

    class Meta:
        model = Notification
        fields = "__all__"

    def get_username_from_user(self, notification):
        username = notification.from_user.username
        return username

    def get_playlist_title(self, notification):
        if notification.comment:
            try:
                playlist_title = notification.comment.playlist.playlist_title
                return playlist_title
            except:
                return None

    def get_playlist_cover(self, notification):
        if notification.comment:
            try:
                playlist_cover = notification.comment.playlist.playlist_cover
                return playlist_cover
            except:
                return None

    def get_playlist_url(self, notification):
        if notification.comment:
            try:
                playlist_url = notification.comment.playlist.playlist_url
                return playlist_url
            except:
                return None

    def get_avi_pic(self, notification):
        avi_pic = notification.from_user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None

    def get_image(self, notification):
        if notification.image:
            return notification.image.url
        return None
