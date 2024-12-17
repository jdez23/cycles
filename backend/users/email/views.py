from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.mail import EmailMessage


@api_view(['POST'])
def send_contact_message(request):
    """
    API endpoint to send a contact form message via email.
    """
    name = request.data.get('name')
    email = request.data.get('email')
    message = request.data.get('message')

    # Validate input
    if not all([name, email, message]):
        return Response({"error": "All fields are required."}, status=400)

    try:
        # Create and send the email
        subject = f"New Contact Form Message from {name}"
        body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
        to_email = 'cycles@cyclesstudios.com'

        email_message = EmailMessage(
            subject=subject,
            body=body,
            from_email=email,
            to=[to_email],
        )
        email_message.send()

        return Response({"message": "Message sent successfully!"}, status=200)

    except Exception as e:
        print(e)
        return Response({"error": "Failed to send message. Try again later."}, status=500)
