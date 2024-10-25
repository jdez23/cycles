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
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        # Ensure users can only access their own data
        return User.objects.filter(id=self.request.user.id)

    def update(self, request, *args, **kwargs):
        # Use the built-in update method with the serializer
        kwargs['partial'] = True  # Allow partial updates
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Use the built-in destroy method
        return super().destroy(request, *args, **kwargs)


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
        print(email)
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
