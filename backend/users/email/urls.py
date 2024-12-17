from django.urls import path
from .views import send_contact_message

urlpatterns = [
    path('contact/', send_contact_message, name='send_contact_message'),
]
