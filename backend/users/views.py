from .serializers import *
from .models import *

from rest_framework import viewsets, permissions, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.exceptions import ValidationError
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)


class CustomAuthToken(ObtainAuthToken):

    def post(self, request, *args, **kwargs):
        try:
            serializer = self.serializer_class(data=request.data,
                                               context={'request': request})
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user_id': user.pk,
            })
        except:
            return Response({'error': 'An unexpected error occurred.'}, status=500)


class CreateUser(APIView):
    queryset = User.objects.all()

    def post(self, request):
        fb_id = request.data.get('token')
        username = request.data.get('username')

        try:
            # Check if username already exists in the user database
            if User.objects.filter(username=username).exists():
                return Response({'error': 'Username is already taken.'}, status=status.HTTP_400_BAD_REQUEST)

            allowed_characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.'

            if any(char not in allowed_characters for char in username):
                return Response({'error': 'Invalid characters in username.'}, status=status.HTTP_400_BAD_REQUEST)

            # Create and save the new user
            user = User.objects.create(
                firebase_id=fb_id, username=username)
            user.save()

            serializer = UserRegisterSerializer(user)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Log the exception for debugging purposes
            print(f"Error: {e}")
            return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class Login(APIView):
    queryset = User.objects.all()

    def get(self, request):
        fb_id = self.request.GET.get('token')
        try:
            user = User.objects.get(firebase_id=fb_id)
            if user:
                serializer = UserLoginSerializer(user)
                return Response({'data': serializer.data})
            else:
                return Response(status=404)
        except User.DoesNotExist:
            return Response({'data': 'None'})
        except:
            return Response(status=500)


class UserViewSet(viewsets.ModelViewSet):
    permission_class = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    queryset = User.objects.all()

    def update(self, request, *args, **kwargs):
        try:
            user = self.request.user.id
            avi_pic = request.FILES.get('avi_pic')

            _user = User.objects.get(id=user)
            _user.name = request.data.get('name', _user.name)
            _user.username = request.data.get('username', _user.username)
            _user.bio = request.data.get('bio', _user.bio)
            _user.spotify_url = request.data.get(
                'spotify_url', _user.spotify_url)

            # Only update the avi_pic if a new one is uploaded
            if avi_pic:
                # Assign the new file to the model's avi_pic field
                _user.avi_pic = avi_pic

            # Save the user details (including avi_pic if uploaded)
            _user.save(update_fields=['avi_pic', 'name',
                       'username', 'bio', 'spotify_url'])

            return Response({"detail": "Profile updated successfully"}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Error updating profile: %s", e)
            return Response({"error": "An error occurred while updating the profile."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, pk):
        try:
            User.objects.get(pk=pk).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            logger.exception("-------", e)


# Follow or Unfollow user
class FollowingView(APIView):
    permission_class = [permissions.IsAuthenticated]
    queryset = Follow.objects.all()
    serializer_class = FollowSerializer

    def post(self, request):
        user = request.data.get('user')
        following_user = request.data.get('following_user')
        user = User.objects.get(id=user)
        following_user = User.objects.get(id=following_user)

        try:
            follow = Follow.objects.create(
                user=user, following_user=following_user)
            follow.save()

            serializer = FollowSerializer(follow)

            def __str__(self):
                return f"{self.request.username} follows {self.following_user_id.username}"

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except:
            return Response(status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.GET.get('user')
        following_user = request.GET.get('following_user')
        try:
            followers = Follow.objects.filter(following_user=following_user)
            user = followers.get(user=user).delete()
            return Response(status=status.HTTP_200_OK)
        except:
            return Response(status=status.HTTP_400_BAD_REQUEST)


# Get the users following
class UsersFollowing(generics.ListAPIView):
    permission_class = [permissions.IsAuthenticated]
    serializer_class = FollowingSerializer

    def get_queryset(self):
        try:
            user = self.request.GET.get('user_id')
            obj = Follow.objects.filter(user=user)
            if obj:
                return obj
            return []
        except:
            return Response({'error': 'An unexpected error occurred.'}, status=500)


# Get the users followers
class UsersFollowers(generics.ListAPIView):
    permission_class = [permissions.IsAuthenticated]
    serializer_class = FollowerSerializer

    def get_queryset(self):
        try:
            user = self.request.GET.get('user_id')
            obj = Follow.objects.filter(following_user=user)
            if obj:
                return obj
            return []
        except:
            return Response({'error': 'An unexpected error occurred.'}, status=500)


# POST & DELETE Subscription
class SubscriptionView(APIView):
    queryset = Subscription.objects.all()

    def post(self, request):
        email = request.data.get('email')

        save_email = Subscription.objects.create(email=email)
        save_email.save()

        if request.method == 'OPTIONS':
            response = JsonResponse({'message': 'Preflight request received'})
        else:
            response = JsonResponse({'message': 'Thank you!'})

        response['Access-Control-Allow-Methods'] = 'POST'
        response['Access-Control-Allow-Headers'] = 'Content-Type'

        return Response(response)

    def delete(request):
        email = request.data.get('email')

        Subscription.objects.filter(email=email).delete()

        return Response(status=status.HTTP_200_OK)
