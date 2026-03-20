from .models import FcmToken


def get_fcm_token(user):
    try:
        return FcmToken.objects.get(user=user)
    except FcmToken.DoesNotExist:
        return None


def get_update_or_create_fcm_token(user, token):
    fcm_token, created = FcmToken.objects.get_or_create(user=user, defaults={'token': token})
    if not created and fcm_token.token != token:
        fcm_token.token = token
        fcm_token.save(update_fields=['token'])
    return fcm_token
