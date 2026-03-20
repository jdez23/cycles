from django.conf import settings
from django.db import models


class AppleMusicToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_index=True,
    )
    music_user_token = models.CharField(max_length=3000)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AppleMusicToken for {self.user}"
