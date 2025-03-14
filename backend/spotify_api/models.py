from django.conf import settings
from django.db import models

# Create your models here.


class SpotifyToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE)
    access_token = models.CharField(max_length=3000)
    refresh_token = models.CharField(max_length=3000)
    expires_in = models.DateTimeField(max_length=3000)
    token_type = models.CharField(max_length=3000)
    created_at = models.DateTimeField(auto_now_add=True)
