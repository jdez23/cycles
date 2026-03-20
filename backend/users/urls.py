from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ContactView,
    CreateUser,
    FollowingView,
    Login,
    SubscriptionView,
    UserViewSet,
    UsersFollowers,
    UsersFollowing,
)

router = DefaultRouter()
router.register('user', UserViewSet, basename='user_view')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', CreateUser.as_view(), name='register'),
    path('login/', Login.as_view(), name='login'),
    path('following/', FollowingView.as_view()),
    path('user-following/', UsersFollowing.as_view()),
    path('user-followers/', UsersFollowers.as_view()),
    path('subscription/', SubscriptionView.as_view(), name='subscription'),
    path('contact/', ContactView.as_view(), name='contact'),
]
