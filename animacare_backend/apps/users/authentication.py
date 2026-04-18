import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication
from rest_framework import exceptions

User = get_user_model()
SECRET = settings.SECRET_KEY

class CustomJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        if not auth_header.startswith('Bearer '):
            return None

        try:
            token = auth_header.split(' ', 1)[1]
            payload = jwt.decode(token, SECRET, algorithms=['HS256'])
            user = User.objects.get(id=payload['user_id'])
            return (user, None)
        except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist):
            raise exceptions.AuthenticationFailed('Invalid or expired token')
