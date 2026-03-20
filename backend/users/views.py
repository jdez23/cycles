import logging

from rest_framework import generics, permissions, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.responses import error_response
from .models import Follow, Subscription, User
from .serializers import (
    FollowerSerializer,
    FollowingSerializer,
    FollowSerializer,
    SubscriptionSerializer,
    UserLoginSerializer,
    UserRegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class CreateUser(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        fb_id = request.data.get("token")
        username = request.data.get("username")

        if not fb_id or not username:
            return error_response("token and username are required.")

        allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.")
        if any(c not in allowed for c in username):
            return error_response("Invalid characters in username.")

        if User.objects.filter(username=username).exists():
            return error_response("Username is already taken.")

        try:
            user = User.objects.create(firebase_id=fb_id, username=username)
            return Response(UserRegisterSerializer(user).data, status=status.HTTP_201_CREATED)
        except Exception:
            logger.exception("Error creating user")
            return error_response("An unexpected error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)


class Login(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        fb_id = request.GET.get("token")
        try:
            user = User.objects.get(firebase_id=fb_id)
            return Response({"data": UserLoginSerializer(user).data})
        except User.DoesNotExist:
            return Response({"data": "None"})
        except Exception:
            logger.exception("Error during login lookup")
            return error_response("An unexpected error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    queryset = User.objects.all()

    def update(self, request, *args, **kwargs):
        user = request.user
        try:
            user.name = request.data.get("name", user.name)
            user.username = request.data.get("username", user.username)
            user.bio = request.data.get("bio", user.bio)
            user.spotify_url = request.data.get("spotify_url", user.spotify_url) or None
            avi_pic = request.FILES.get("avi_pic")
            if avi_pic:
                user.avi_pic = avi_pic
            user.save(update_fields=["avi_pic", "name", "username", "bio", "spotify_url"])
            return Response({"detail": "Profile updated successfully"}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Error updating profile for user %s", user.id)
            return error_response("An error occurred while updating the profile.", status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk=None):
        if str(request.user.pk) != str(pk):
            return Response(status=status.HTTP_403_FORBIDDEN)
        try:
            User.objects.get(pk=pk).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return error_response("User not found.", status.HTTP_404_NOT_FOUND)


class FollowingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user_id = request.data.get("user")
        following_id = request.data.get("following_user")
        try:
            user = User.objects.get(id=user_id)
            following_user = User.objects.get(id=following_id)
            follow, created = Follow.objects.get_or_create(user=user, following_user=following_user)
            return Response(FollowSerializer(follow).data, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return error_response("User not found.", status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("Error following user")
            return error_response("An unexpected error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        user_id = request.GET.get("user")
        following_id = request.GET.get("following_user")
        try:
            Follow.objects.filter(user=user_id, following_user=following_id).delete()
            return Response(status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Error unfollowing user")
            return error_response("An unexpected error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)


class UsersFollowing(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FollowingSerializer

    def get_queryset(self):
        user_id = self.request.GET.get("user_id")
        return Follow.objects.filter(user_id=user_id).select_related("following_user")


class UsersFollowers(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FollowerSerializer

    def get_queryset(self):
        user_id = self.request.GET.get("user_id")
        return Follow.objects.filter(following_user_id=user_id).select_related("user")


class SubscriptionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        if not email:
            return error_response("Email is required.")
        Subscription.objects.get_or_create(email=email)
        return Response({"message": "Thank you!"}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        email = request.data.get("email", "").strip()
        Subscription.objects.filter(email=email).delete()
        return Response(status=status.HTTP_200_OK)


class ContactView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        from .serializers import ContactMessageSerializer
        from django.core.mail import EmailMessage

        serializer = ContactMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        name = serializer.validated_data["name"]
        email = serializer.validated_data["email"]
        message = serializer.validated_data["message"]

        try:
            EmailMessage(
                subject=f"New Contact Form Message from {name}",
                body=f"From: {name} <{email}>\n\n{message}",
                from_email="noreply@cyclesstudios.com",
                to=["cycles@cyclesstudios.com"],
                reply_to=[email],
            ).send()
            return Response({"message": "Message sent successfully!"}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Error sending contact email")
            return error_response("Failed to send message. Try again later.", status.HTTP_500_INTERNAL_SERVER_ERROR)
