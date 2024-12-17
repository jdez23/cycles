from django.urls import path
from .views import ContactView
from rest_framework.decorators import permission_classes, authentication_classes
from rest_framework.permissions import AllowAny

urlpatterns = [
    path('contact/', authentication_classes([])
         (permission_classes([AllowAny])(ContactView)).as_view(), name='Contact'),
]
