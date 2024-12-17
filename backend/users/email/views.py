from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.mail import EmailMessage
from .serializers import ContactMessageSerializer
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
def send_contact_message(request):
    """
    API endpoint to send a contact form message via email.
    """
    serializer = ContactMessageSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    # Extract validated data
    name = serializer.validated_data['name']
    email = serializer.validated_data['email']
    message = serializer.validated_data['message']

    try:
        # Create and send the email
        subject = f"New Contact Form Message from {name}"
        body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
        to_email = 'cycles@cyclesstudios.com'

        email_message = EmailMessage(
            subject=subject,
            body=body,
            from_email=email,  # Use the user's email as sender
            to=[to_email],
        )
        email_message.send()

        return Response({"message": "Message sent successfully!"}, status=200)

    except Exception as e:
        logger.exception("Error sending contact message:", exc_info=e)
        return Response({"error": "Failed to send message. Try again later."}, status=500)
