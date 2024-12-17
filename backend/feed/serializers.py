import os
from .models import *
from django.db.models import Q
from users.serializers import SearchUserSerializer
from rest_framework import serializers


class CombinedSearchSerializer(serializers.Serializer):
    users = serializers.SerializerMethodField()
    playlists = serializers.SerializerMethodField()

    def get_users(self, obj):
        queryset_users = User.objects.filter(
            Q(name__icontains=self.context['request'].query_params.get('q', '')) |
            Q(username__icontains=self.context['request'].query_params.get('q', '')))
        return SearchUserSerializer(queryset_users, many=True).data

    def get_playlists(self, obj):
        queryset_playlists = Playlist.objects.filter(
            Q(playlist_title__icontains=self.context['request'].query_params.get('q', '')))
        return SearchPlaylistSerializer(queryset_playlists, many=True).data


class SearchPlaylistSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')

    class Meta:
        model = Playlist
        fields = ('id', 'playlist_title', 'user',
                  'playlist_cover', 'username', 'playlist_type')


class HashtagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hashtag
        fields = ['hash']


class UserPlaylistSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField('get_username_from_user')
    avi_pic = serializers.SerializerMethodField('get_avi_pic')

    class Meta:
        model = Playlist
        fields = "__all__"

    def get_username_from_user(self, playlist):
        username = playlist.user.username
        return username

    def get_avi_pic(self, playlist):
        avi_pic = playlist.user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None


class PlaylistDetailSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField('get_username_from_user')
    isLiked = serializers.SerializerMethodField()
    hashtags = HashtagSerializer(many=True)

    class Meta:
        model = Playlist
        fields = "__all__"

    def get_username_from_user(self, playlist):
        username = playlist.user.username
        return username

    def get_isLiked(self, playlist):
        return self.context.get('is_liked', False)


class PlaylistTracksSerializer(serializers.ModelSerializer):

    class Meta:
        model = PlaylistTracks
        fields = "__all__"


class FollowingPlaylistSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField('get_username_from_user')
    location = serializers.SerializerMethodField('get_location_from_user')
    avi_pic = serializers.SerializerMethodField('get_avi_pic')

    class Meta:
        model = Playlist
        fields = "__all__"

    def get_username_from_user(self, playlist):
        username = playlist.user.username
        return username

    def get_location_from_user(self, playlist):
        location = playlist.user.location
        return location

    def get_avi_pic(self, playlist):
        avi_pic = playlist.user.avi_pic

        if avi_pic:
            return avi_pic.url
        return None


class PlaylistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Playlist
        fields = "__all__"


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField('get_username_from_user')
    avi_pic = serializers.SerializerMethodField('get_avi_pic')

    class Meta:
        model = Comment
        fields = '__all__'

    def get_username_from_user(self, comment):
        username = comment.user.username
        return username

    def get_avi_pic(self, comment):
        avi_pic = comment.user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None


class ReplySerializer(serializers.ModelSerializer):
    class Meta:
        model = Reply
        fields = "__all__"


class LikesSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField('get_username_from_user')
    avi_pic = serializers.SerializerMethodField('get_avi_pic')

    class Meta:
        model = Like
        fields = "__all__"

    def get_username_from_user(self, like):
        username = like.user.username
        return username

    def get_avi_pic(self, like):
        avi_pic = like.user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None


class CommentLikesSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField('get_username_from_user')
    avi_pic = serializers.SerializerMethodField('get_avi_pic')

    class Meta:
        model = CommentLike
        fields = "__all__"

    def get_username_from_user(self, like):
        username = like.user.username
        return username

    def get_avi_pic(self, like):
        avi_pic = like.user.avi_pic

        if avi_pic:
            return avi_pic.url
        return None
