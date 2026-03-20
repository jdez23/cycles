from django.utils import timezone
from django.db import models
from users.models import User, Follow
from feed.models import Comment, Like

# Create your models here.


class FcmToken(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, null=True, blank=True)
    token = models.CharField(max_length=300)
    date = models.DateTimeField(editable=False, default=timezone.now)

    class Meta:
        db_table = 'notifications_fcmtoken'


class Notification(models.Model):
    to_user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='to_user')
    from_user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='from_user')
    title = models.CharField(max_length=100, default='', blank=True)
    image = models.CharField(default='', null=True, blank=True, max_length=3000)
    body = models.TextField(default='', blank=True)
    playlist_id = models.TextField(default='', null=True, blank=True)
    follow = models.ForeignKey(
        Follow, blank=True, null=True, on_delete=models.CASCADE, default=None)
    like = models.ForeignKey(
        Like, blank=True, null=True, on_delete=models.CASCADE, default=None)
    comment = models.ForeignKey(
        Comment, blank=True, null=True, on_delete=models.CASCADE, default=None)
    date = models.DateTimeField(editable=False, default=timezone.now)
    type = models.CharField(max_length=15, default='', null=False, blank=False)
