from rest_framework import serializers

from .models import AppleMusicToken


class AppleMusicTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppleMusicToken
        fields = ('id', 'user', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')
