from django.urls import path

from .views import FcmTokenView, NotificationView

urlpatterns = [
    path('fcm-token/', FcmTokenView.as_view()),
    path('message/', NotificationView.as_view()),
]
