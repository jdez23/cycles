from rest_framework.response import Response
from rest_framework import status


def error_response(message: str, code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    return Response({"error": message}, status=code)


def success_response(data=None, code: int = status.HTTP_200_OK) -> Response:
    return Response(data or {}, status=code)
