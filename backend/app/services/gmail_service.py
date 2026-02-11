"""
Gmail Service - OAuth-based Gmail API wrapper

This service handles Gmail operations using OAuth tokens from Supabase authentication.
Users authenticate once with Google OAuth, and this service uses their tokens to:
- Read emails
- Create drafts
- Send emails
"""

import os
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging

logger = logging.getLogger(__name__)


class GmailService:
    """Gmail API service using OAuth credentials"""

    def __init__(self, credentials: Credentials):
        """
        Initialize Gmail service with OAuth credentials

        Args:
            credentials: Google OAuth2 credentials from Supabase
        """
        self.credentials = credentials
        self.service = build('gmail', 'v1', credentials=credentials)

    @classmethod
    async def from_supabase_user(cls, user_data: dict):
        """
        Create GmailService from Supabase user data

        Args:
            user_data: Supabase user object containing OAuth tokens

        Returns:
            GmailService instance
        """
        # Extract OAuth tokens from Supabase user identities
        identities = user_data.get('identities', [])
        google_identity = next((i for i in identities if i.get('provider') == 'google'), None)

        if not google_identity:
            raise ValueError("No Google OAuth identity found for user")

        identity_data = google_identity.get('identity_data', {})
        provider_token = identity_data.get('provider_token')
        provider_refresh_token = identity_data.get('provider_refresh_token')

        if not provider_token:
            raise ValueError("No OAuth access token found")

        # Get Google OAuth credentials from environment
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

        if not client_id or not client_secret:
            raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment")

        # Create OAuth credentials
        credentials = Credentials(
            token=provider_token,
            refresh_token=provider_refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=[
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.compose',
                'https://www.googleapis.com/auth/gmail.send'
            ]
        )

        return cls(credentials)

    async def list_messages(self, max_results: int = 10, query: str = "") -> List[Dict]:
        """
        List recent email messages

        Args:
            max_results: Maximum number of messages to return
            query: Gmail search query (e.g., 'is:unread', 'from:example@gmail.com')

        Returns:
            List of message metadata
        """
        try:
            results = self.service.users().messages().list(
                userId='me',
                maxResults=max_results,
                q=query
            ).execute()

            messages = results.get('messages', [])
            return messages

        except HttpError as error:
            logger.error(f"Error listing messages: {error}")
            raise

    async def get_message(self, message_id: str) -> Dict:
        """
        Get full message details

        Args:
            message_id: Gmail message ID

        Returns:
            Full message object with headers, body, etc.
        """
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()

            # Parse message for easier consumption
            headers = message.get('payload', {}).get('headers', [])
            subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
            from_email = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown')
            date = next((h['value'] for h in headers if h['name'].lower() == 'date'), '')

            # Get body
            body = self._get_message_body(message.get('payload', {}))

            return {
                'id': message['id'],
                'thread_id': message.get('threadId'),
                'subject': subject,
                'from': from_email,
                'date': date,
                'snippet': message.get('snippet', ''),
                'body': body,
                'labels': message.get('labelIds', [])
            }

        except HttpError as error:
            logger.error(f"Error getting message {message_id}: {error}")
            raise

    def _get_message_body(self, payload: Dict) -> str:
        """Extract email body from message payload"""
        if 'parts' in payload:
            # Multi-part message
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data', '')
                    return base64.urlsafe_b64decode(data).decode('utf-8')
                elif part['mimeType'] == 'text/html':
                    # Fallback to HTML if no plain text
                    data = part['body'].get('data', '')
                    return base64.urlsafe_b64decode(data).decode('utf-8')
        else:
            # Simple message
            data = payload.get('body', {}).get('data', '')
            if data:
                return base64.urlsafe_b64decode(data).decode('utf-8')
        
        return ""

    async def create_draft(self, to: str, subject: str, body: str) -> Dict:
        """
        Create email draft

        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body (plain text)

        Returns:
            Created draft object
        """
        try:
            message = MIMEText(body)
            message['to'] = to
            message['subject'] = subject

            encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

            draft = self.service.users().drafts().create(
                userId='me',
                body={'message': {'raw': encoded_message}}
            ).execute()

            logger.info(f"Draft created: {draft['id']}")
            return draft

        except HttpError as error:
            logger.error(f"Error creating draft: {error}")
            raise

    async def send_message(self, to: str, subject: str, body: str, cc: Optional[str] = None) -> Dict:
        """
        Send email message

        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body (plain text or HTML)
            cc: Optional CC email address

        Returns:
            Sent message object
        """
        try:
            message = MIMEText(body)
            message['to'] = to
            message['subject'] = subject
            if cc:
                message['cc'] = cc

            encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

            sent_message = self.service.users().messages().send(
                userId='me',
                body={'raw': encoded_message}
            ).execute()

            logger.info(f"Message sent: {sent_message['id']}")
            return sent_message

        except HttpError as error:
            logger.error(f"Error sending message: {error}")
            raise

    async def search_messages(self, query: str, max_results: int = 10) -> List[Dict]:
        """
        Search emails with Gmail query syntax

        Args:
            query: Gmail search query (e.g., 'from:boss@example.com is:unread')
            max_results: Maximum number of results

        Returns:
            List of matching messages
        """
        return await self.list_messages(max_results=max_results, query=query)
