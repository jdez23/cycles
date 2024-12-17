from django.urls import path
from .views import send_contact_message
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny

# Apply permission classes directly to the view
send_contact_message_public = permission_classes(
    [AllowAny])(send_contact_message)

urlpatterns = [
    path('contact/', send_contact_message_public, name='send_contact_message'),
]
