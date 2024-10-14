from .credentials import *
from .util import *
import logging

from requests import Request, post

from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response

from feed.models import Playlist

logger = logging.getLogger(__name__)


class SpotifyAuthURL(APIView):

    def get(self, request):
        try:
            scopes = 'playlist-read-private user-read-private'
            url = Request('GET', 'https://accounts.spotify.com/authorize',
                          params={
                              'scope': scopes,
                              'response_type': 'code',
                              'redirect_uri': REDIRECT_URL,
                              'client_id': CLIENT_ID
                          }
                          ).prepare().url
            return Response(url, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("-------", e)


class SpotifyCallback(APIView):

    def post(self, request):
        try:
            code = request.data.get('code')

            if not code:
                return Response({'Error': 'Code not found in request'}, status=status.HTTP_400_BAD_REQUEST)

            response = post('https://accounts.spotify.com/api/token', data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': REDIRECT_URL,
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET
            }).json()

            if not response:
                return Response({'error': 'Spotify request failed!'}, status=response.status_code)
            return Response(response, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("-------", e)


class LoginSpotify(APIView):
    def post(self, request):
        try:
            access_token = request.data.get('access_token')
            refresh_token = request.data.get('refresh_token')
            expires_in = request.data.get('expires_in')
            token_type = request.data.get('token_type')

            user = self.request.user

            update_or_create_user_tokens(
                user, access_token, refresh_token, expires_in, token_type)

            return Response('true', status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("-------", e)

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        return serializer_class(*args, **kwargs)


class IsSpotifyAuthenticated(APIView):
    def get(self, request, format=None):
        try:
            user = self.request.user
            is_authenticated = is_spotify_authenticated(user)
            return Response(is_authenticated, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("-------", e)


class SpotifyLogout(APIView):
    def delete(self, request):
        try:
            user = self.request.user
            tokens = SpotifyToken.objects.filter(user=user)
            tokens.delete()
            return Response('false', status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("-------", e)


# get users playlists from spotify
class SpotifyPlaylist(APIView):
    def get(self, request, format=None):
        try:
            user = self.request.user
            endpoint = 'v1/me'
            spotify_username = execute_spotify_api_request(user, endpoint)
            me = spotify_username['id']
            selected_playlists = Playlist.objects.filter(user=user)

            # Extract the playlist IDs the user has already selected
            selected_playlist_ids = [
                playlist.playlist_id for playlist in selected_playlists]

            endpoint = "v1/me/playlists"
            params = {
                'limit': 50
            }
            response = execute_spotify_playlist_request(user, endpoint, params)

            res = response['items']

            my_playlists = [i for i in res if i['owner']['id'] == me]

            public_playlists = [i for i in my_playlists if i['public'] == True]

            # Return playlists that haven't been selected
            unselected_playlists = [
                playlist for playlist in public_playlists if playlist['id'] not in selected_playlist_ids]

            # Implement pagination
            paginator = PageNumberPagination()
            paginator.page_size = 10  # Set the page size, can be adjusted or configured in settings
            result_page = paginator.paginate_queryset(
                unselected_playlists, request)

            return paginator.get_paginated_response(result_page)
        except Exception as e:
            logger.exception("-------", e)


# get tracks in users spotify playlist
class SpotifyPlaylistTracks(APIView):
    def get(self, request, format=None):
        try:
            user = self.request.user
            spotify_playlist_id = request.GET.get('playlist_id')

            endpoint = 'v1/playlists/'+spotify_playlist_id+"/tracks"
            response = execute_spotify_api_request(user, endpoint)

            return Response(response, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("-------", e)


class SpotifySearch(APIView):
    def search(self, token):
        try:
            endpoint = "v1/search"
            access_token = self.get_access_token()
            headers = {
                "Authorization": f"Bearer {access_token}"
            }
            return Response(status=status.HTTP_200_OK)
        except:
            return Response({'error': 'An unexpected error occurred.'}, status=500)
