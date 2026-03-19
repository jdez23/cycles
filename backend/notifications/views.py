import logging

from firebase_admin import messaging
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from core.responses import error_response
from feed.models import Comment, Like
from users.models import Follow, User
from .models import FcmToken, Notification
from .serializers import FcmTokenSerializer, NotificationSerializer
from .utils import get_update_or_create_fcm_token

logger = logging.getLogger(__name__)


class FcmTokenView(APIView):

    def post(self, request):
        try:
            token = request.data.get('token')
            if not token:
                return error_response('token is required.')
            fcm_token = get_update_or_create_fcm_token(request.user, token)
            return Response(FcmTokenSerializer(fcm_token).data, status=status.HTTP_201_CREATED)
        except Exception:
            logger.exception("Error saving FCM token")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        try:
            FcmToken.objects.filter(user=request.user).delete()
            return Response(status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Error deleting FCM token")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationView(APIView):

    def post(self, request):
        try:
            user = request.user
            to_user_id = request.data.get('to_user')
            title = request.data.get('title', '')
            image = request.data.get('image', '')
            body = request.data.get('body', '')
            playlist_id = request.data.get('playlist_id', '')
            notification_type = request.data.get('type', '')
            comment_id = request.data.get('comment')
            follow_id = request.data.get('follow')
            like_id = request.data.get('like')

            to_user = User.objects.get(id=to_user_id)

            if user.id == to_user.id:
                return Response(status=status.HTTP_200_OK)

            notification_kwargs = dict(
                from_user=user, to_user=to_user,
                title=title, image=image, body=body,
                playlist_id=playlist_id, type=notification_type,
            )

            if notification_type == 'follow':
                notification_kwargs['follow'] = Follow.objects.get(id=follow_id)
                notification_kwargs['image'] = ''
            elif notification_type == 'like':
                notification_kwargs['like'] = Like.objects.get(id=like_id)
            elif notification_type == 'comment':
                notification_kwargs['comment'] = Comment.objects.get(id=comment_id)

            Notification.objects.create(**notification_kwargs)

            try:
                device_token = FcmToken.objects.get(user=to_user).token
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=f"{user.username} {body}",
                    ),
                    token=device_token,
                )
                messaging.send(message)
            except FcmToken.DoesNotExist:
                pass
            except Exception:
                logger.exception("Failed to send FCM push notification to user %s", to_user.id)

            return Response(status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return error_response('User not found.', status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("Error creating notification")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        try:
            notifications = Notification.objects.filter(
                to_user=request.user
            ).select_related('from_user').order_by('-date')

            paginator = PageNumberPagination()
            paginator.page_size = 10
            result_page = paginator.paginate_queryset(notifications, request)
            serializer = NotificationSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception:
            logger.exception("Error fetching notifications")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        try:
            notification_id = request.GET.get('id')
            notification = Notification.objects.get(id=notification_id)
            if notification.to_user != request.user:
                return Response(status=status.HTTP_403_FORBIDDEN)
            notification.delete()
            return Response(status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return error_response('Notification not found.', status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("Error deleting notification")
            return error_response('An unexpected error occurred.', status.HTTP_500_INTERNAL_SERVER_ERROR)
