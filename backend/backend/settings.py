"""
Django settings for backend project.
"""

from pathlib import Path
import os
import django_heroku
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ['SECRET_KEY']

DEBUG = False

ALLOWED_HOSTS = ['cycles-app-11ce5033b5eb.herokuapp.com']

CSRF_TRUSTED_ORIGINS = [
    'https://cycles-app-11ce5033b5eb.herokuapp.com',
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:8081",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
    "http://cycles-app-11ce5033b5eb.herokuapp.com",
    "https://cycles-app-11ce5033b5eb.herokuapp.com",
    "https://cyclesstudios.com",
]

INSTALLED_APPS = [
    "corsheaders",

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'storages',
    'rest_framework',
    'taggit',

    'feed',
    'users',
    'spotify_api',
    'apple_music',
    'notifications',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.authentication.FirebaseAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 12,
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

AUTH_USER_MODEL = 'users.User'

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

DATABASES = {
    'default': {
        **dj_database_url.parse(os.environ['DATABASE_URL']),
        'CONN_MAX_AGE': 60,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

ACCOUNT_EMAIL_REQUIRED = True

EMAIL_HOST = os.environ['EMAIL_HOST']
EMAIL_USE_TLS = True
EMAIL_PORT = os.environ['EMAIL_PORT']
EMAIL_HOST_USER = os.environ['EMAIL_HOST_USER']
EMAIL_HOST_PASSWORD = os.environ['EMAIL_HOST_PASSWORD']

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "access_key": os.environ.get("AWS_ACCESS_KEY_ID"),
            "secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY"),
            "bucket_name": os.environ.get("AWS_STORAGE_BUCKET_NAME"),
            "region_name": os.environ.get("AWS_S3_REGION_NAME"),
            "location": "media",
            "file_overwrite": False,
            "default_acl": os.environ.get("AWS_DEFAULT_ACL"),
            "querystring_auth": False,
        },
    },
    "staticfiles": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "access_key": os.environ.get("AWS_ACCESS_KEY_ID"),
            "secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY"),
            "bucket_name": os.environ.get("AWS_STORAGE_BUCKET_NAME"),
            "region_name": os.environ.get("AWS_S3_REGION_NAME"),
            "location": "static",
        },
    },
}

MEDIA_URL = f'https://cyclesapp.s3.amazonaws.com/media/'

# Apple Music settings
APPLE_MUSIC_KEY_ID = os.environ.get('APPLE_MUSIC_KEY_ID', '')
APPLE_MUSIC_TEAM_ID = os.environ.get('APPLE_MUSIC_TEAM_ID', '')
APPLE_MUSIC_PRIVATE_KEY = os.environ.get('APPLE_MUSIC_PRIVATE_KEY', '')
APPLE_MUSIC_STOREFRONT = os.environ.get('APPLE_MUSIC_STOREFRONT', 'us')

django_heroku.settings(locals(), staticfiles=False)
