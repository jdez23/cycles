from rest_framework.permissions import BasePermission

from .models import AppleMusicToken


class HasAppleMusicToken(BasePermission):
    def has_permission(self, request, view):
        return AppleMusicToken.objects.filter(user=request.user).exists()
