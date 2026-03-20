from rest_framework import serializers

from .models import Follow, Subscription, User


class ContactMessageSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    message = serializers.CharField(max_length=5000)


class SearchUserSerializer(serializers.ModelSerializer):
    avi_pic = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'name', 'username', 'avi_pic')

    def get_avi_pic(self, obj):
        if obj.avi_pic:
            return obj.avi_pic.url
        return None


class UserLoginSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('firebase_id', 'id', 'username')


class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('firebase_id', 'id', 'username', 'avi_pic',
                  'name', 'location', 'bio', 'spotify_url')


class UserSerializer(serializers.ModelSerializer):
    following = serializers.SerializerMethodField()
    followers = serializers.SerializerMethodField()
    avi_pic = serializers.ImageField(required=False)

    class Meta:
        model = User
        fields = ['id', 'avi_pic', 'name', 'username', 'location',
                  'bio', 'spotify_url', 'following', 'followers']

    def get_following(self, obj):
        return FollowingSerializer(obj.follower.all(), many=True).data

    def get_followers(self, obj):
        return FollowerSerializer(obj.following.all(), many=True).data


class FollowSerializer(serializers.ModelSerializer):
    avi_pic = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()

    class Meta:
        model = Follow
        fields = '__all__'

    def get_username(self, follow):
        return follow.following_user.username

    def get_avi_pic(self, follow):
        avi_pic = follow.following_user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None


class FollowingSerializer(serializers.ModelSerializer):
    avi_pic = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = Follow
        fields = '__all__'

    def get_avi_pic(self, obj):
        avi_pic = obj.following_user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None

    def get_username(self, obj):
        return obj.following_user.username

    def get_name(self, obj):
        return obj.following_user.name


class FollowerSerializer(serializers.ModelSerializer):
    avi_pic = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = Follow
        fields = '__all__'

    def get_avi_pic(self, obj):
        avi_pic = obj.user.avi_pic
        if avi_pic:
            return avi_pic.url
        return None

    def get_username(self, obj):
        return obj.user.username

    def get_name(self, obj):
        return obj.user.name


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = '__all__'
