from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.conf import settings

# from django.dispatch import receiver

from django.utils.translation import gettext_lazy as _

# from firebase_auth.authentication import FirebaseAuthentication


user = settings.AUTH_USER_MODEL


class User(AbstractUser):
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    firebase_id = models.CharField(
        max_length=400, null=True, blank=True)
    avi_pic = models.ImageField(
        upload_to='avi/', default=None, blank=True, null=True)
    name = models.CharField(max_length=50, blank=True, null=True, default="")
    username = models.CharField(max_length=30, unique=True)
    location = models.CharField(
        max_length=80, null=True, blank=True, default='')
    bio = models.CharField(max_length=150, null=True, blank=True, default='')
    spotify_url = models.CharField(
        max_length=3000, null=True, blank=True, default='')

    def __str__(self):
        return self.username


class Follow(models.Model):
    user = models.ForeignKey(
        "User", related_name="follower", on_delete=models.CASCADE)
    following_user = models.ForeignKey(
        "User", related_name="following", blank=True, on_delete=models.CASCADE)
    date_followed = models.DateTimeField(editable=False, default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'following_user'],  name="unique_followers")
        ]

        ordering = ["-date_followed"]

    def __str__(self):
        return f"{self.user.username} follows {self.following_user.username}"


class Subscription(models.Model):
    email = models.EmailField(max_length=250, unique=True)

    def __str__(self):
        return self.email
