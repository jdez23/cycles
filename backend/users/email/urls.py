from django.urls import path
from .views import send_contact_message
from rest_framework.decorators import permission_classes, authentication_classes
from rest_framework.permissions import AllowAny

urlpatterns = [
    path('contact/', authentication_classes([])
         (permission_classes([AllowAny])(send_contact_message)), name='send_contact_message'),
]
