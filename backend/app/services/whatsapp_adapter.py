import logging
from twilio.rest import Client
from app.core.config import settings
import httpx

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.whatsapp_number = settings.TWILIO_WHATSAPP_NUMBER
        self.api_url = f"http://localhost:8000{settings.API_V1_STR}/chat/send"
        self.enabled = settings.ENABLE_WHATSAPP
        
        if self.enabled and self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None

    async def send_message(self, to_number: str, body: str):
        """Sends a WhatsApp message via Twilio."""
        if not self.client:
            logger.warning("WhatsApp client not initialized.")
            return

        try:
            message = self.client.messages.create(
                from_=self.whatsapp_number,
                body=body,
                to=f"whatsapp:{to_number}"
            )
            logger.info(f"WhatsApp message sent: {message.sid}")
            return message.sid
        except Exception as e:
            logger.error(f"WhatsApp Error: {e}")
            return None

    # Note: WhatsApp usually requires a webhook endpoint (POST) for receiving messages.
    # We will implement the webhook handler in a separate router or here.
