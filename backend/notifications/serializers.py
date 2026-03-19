from rest_framework import serializers

from .models import FcmToken, Notification


class FcmTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = FcmToken
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    playlist_url = serializers.SerializerMethodField()
    playlist_cover = serializers.SerializerMethodField()
    playlist_title = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    avi_pic = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = '__all__'

    def get_username(self, notification):
        if notification.from_user:
            return notification.from_user.username
        return None

    def get_playlist_title(self, notification):
        if notification.comment:
            try:
                return notification.comment.playlist.playlist_title
            except Exception:
                return None
        return None

    def get_playlist_cover(self, notification):
        if notification.comment:
            try:
                return notification.comment.playlist.playlist_cover
            except Exception:
                return None
        return None

    def get_playlist_url(self, notification):
        if notification.comment:
            try:
                return notification.comment.playlist.playlist_url
            except Exception:
                return None
        return None

    def get_avi_pic(self, notification):
        if notification.from_user and notification.from_user.avi_pic:
            return notification.from_user.avi_pic.url
        return None

    def get_image(self, notification):
        if notification.image:
            return notification.image
        return None
