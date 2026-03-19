import logging
import os

import firebase_admin
from firebase_admin import auth, credentials
from rest_framework import authentication

from users.models import User
from .exceptions import FirebaseError, InvalidAuthToken, NoAuthToken

logger = logging.getLogger(__name__)

# Initialize Firebase app once, using individual env vars so no JSON file is needed.
if not firebase_admin._apps:
    cred = credentials.Certificate({
        "type": os.environ.get("GOOGLE_TYPE"),
        "project_id": os.environ.get("GOOGLE_PROJECT_ID"),
        "private_key_id": os.environ.get("GOOGLE_PRIVATE_KEY_ID"),
        "private_key": os.environ.get("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n"),
        "client_email": os.environ.get("GOOGLE_CLIENT_EMAIL"),
        "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
        "auth_uri": os.environ.get("GOOGLE_AUTH_URI"),
        "token_uri": os.environ.get("GOOGLE_TOKEN_URI"),
        "auth_provider_x509_cert_url": os.environ.get("GOOGLE_AUTH_PROVIDER_x509_CERT_URL"),
        "client_x509_cert_url": os.environ.get("GOOGLE_CLIENT_x509_CERT_URL"),
    })
    firebase_admin.initialize_app(cred)


class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        token = request.META.get("HTTP_AUTHORIZATION")
        if not token:
            raise NoAuthToken("No auth token provided")

        try:
            decoded = auth.verify_id_token(token)
        except auth.InvalidIdTokenError:
            raise InvalidAuthToken("Invalid auth token")
        except auth.ExpiredIdTokenError:
            raise InvalidAuthToken("Auth token has expired")
        except Exception:
            logger.exception("Firebase token verification failed")
            raise FirebaseError("Firebase authentication failed")

        try:
            user = User.objects.get(firebase_id=decoded["uid"])
        except User.DoesNotExist:
            raise InvalidAuthToken("No user found for this token")

        return (user, None)
