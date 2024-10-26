from .models import *
import os
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from django.core.exceptions import ImproperlyConfigured


class TokenSerializer(serializers.ModelSerializer):

    class Meta:
        model = Token
        fields = ('key', 'user')


class SearchUserSerializer(serializers.ModelSerializer):
    avi_pic = serializers.SerializerMethodField('get_avi_pic')

    class Meta:
        model = User
        fields = ('id', 'name', 'username', 'avi_pic')

    def get_avi_pic(self, obj):
        avi_pic = obj.avi_pic
        if avi_pic:
            return avi_pic.url
        return None


class UserLoginSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('firebase_id', 'id', 'username')


class UserRegisterSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ('firebase_id', 'id', 'username')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username is already taken.")
        allowed_characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.'
        if any(char not in allowed_characters for char in value):
            raise serializers.ValidationError(
                "Invalid characters in username.")
        return value

    def create(self, validated_data):
        return User.objects.create(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    following = serializers.SerializerMethodField('get_following')
    followers = serializers.SerializerMethodField('get_follower')
    avi_pic = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'avi_pic', 'email',
                  'name', 'username', 'location',
                  'bio', 'spotify_url', 'following', 'followers']

    def validate_username(self, value):
        user = self.instance
        if user and user.username != value:
            if User.objects.filter(username=value).exists():
                raise serializers.ValidationError("Username is already taken.")
        allowed_characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.'
        if any(char not in allowed_characters for char in value):
            raise serializers.ValidationError(
                "Invalid characters in username.")
        return value

    def get_following(self, obj):
        return FollowSerializer(obj.following.all(), many=True).data

    def get_followers(self, obj):
        return FollowSerializer(obj.followers.all(), many=True).data

    def get_avi_pic(self, obj):
        if obj.avi_pic:
            return obj.avi_pic.url
        return "https://cyclesapp.s3.amazonaws.com/media/avi/default_avatar.png"


class FollowSerializer(serializers.ModelSerializer):
    avi_pic = serializers.SerializerMethodField('get_avi_pic')
    username = serializers.SerializerMethodField('get_username')

    class Meta:
        model = Follow
        fields = '__all__'

    def get_username(self, follow):
        username = follow.user.username
        return username

    def get_avi_pic(self, follow):
        avi_pic = follow.user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None


class FollowingSerializer(serializers.ModelSerializer):
    avi_pic = serializers.SerializerMethodField('get_avi_pic')
    username = serializers.SerializerMethodField('get_username')
    name = serializers.SerializerMethodField('get_name')

    def get_avi_pic(self, obj):
        avi_pic = obj.following_user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None

    def get_username(self, obj):
        username = obj.following_user.username
        return username

    def get_name(self, obj):
        name = obj.following_user.name
        return name

    class Meta:
        model = Follow
        fields = "__all__"


class FollowerSerializer(serializers.ModelSerializer):
    avi_pic = serializers.SerializerMethodField('get_avi_pic')
    username = serializers.SerializerMethodField('get_username')
    name = serializers.SerializerMethodField('get_name')

    class Meta:
        model = Follow
        fields = "__all__"

    def get_avi_pic(self, obj):
        avi_pic = obj.user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None

    def get_username(self, obj):
        username = obj.user.username
        return username

    def get_name(self, obj):
        name = obj.user.name
        return name


class SubscriptionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Subscription
        fields = '__all__'
