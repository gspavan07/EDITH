"""
Gmail API Endpoints - REST API for Gmail operations via OAuth

All endpoints require authentication via Supabase JWT token.
Gmail operations use OAuth tokens stored in user's Supabase identity.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.db.supabase_auth import get_current_user
from app.services.gmail_service import GmailService
from app.schemas.gmail import (
    EmailRequest,
    DraftRequest,
    SearchRequest,
    MessageResponse,
    MessageListResponse
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/inbox")
async def get_inbox(
    max_results: int = 10,
    user = Depends(get_current_user)
):
    """
    Get recent emails from inbox

    Args:
        max_results: Number of emails to retrieve (default: 10)

    Returns:
        List of email messages
    """
    try:
        gmail = await GmailService.from_supabase_user(user)
        messages = await gmail.list_messages(max_results=max_results)
        
        return {
            "messages": messages,
            "total": len(messages)
        }

    except ValueError as e:
        logger.error(f"Gmail configuration error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching inbox: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch emails")


@router.get("/message/{message_id}")
async def get_message(
    message_id: str,
    user = Depends(get_current_user)
):
    """
    Get full email message details

    Args:
        message_id: Gmail message ID

    Returns:
        Full message object with body, headers, etc.
    """
    try:
        gmail = await GmailService.from_supabase_user(user)
        message = await gmail.get_message(message_id)
        
        return message

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting message {message_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve message")


@router.post("/draft")
async def create_draft(
    request: DraftRequest,
    user = Depends(get_current_user)
):
    """
    Create email draft

    Args:
        to: Recipient email
        subject: Email subject
        body: Email body

    Returns:
        Created draft object
    """
    try:
        gmail = await GmailService.from_supabase_user(user)
        draft = await gmail.create_draft(
            to=request.to,
            subject=request.subject,
            body=request.body
        )
        
        return {
            "message": "Draft created successfully",
            "draft_id": draft['id']
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating draft: {e}")
        raise HTTPException(status_code=500, detail="Failed to create draft")


@router.post("/send")
async def send_email(
    request: EmailRequest,
    user = Depends(get_current_user)
):
    """
    Send email message

    Args:
        to: Recipient email
        subject: Email subject
        body: Email body
        cc: Optional CC recipient

    Returns:
        Sent message confirmation
    """
    try:
        gmail = await GmailService.from_supabase_user(user)
        message = await gmail.send_message(
            to=request.to,
            subject=request.subject,
            body=request.body,
            cc=request.cc
        )
        
        return {
            "message": "Email sent successfully",
            "message_id": message['id']
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")


@router.get("/search")
async def search_emails(
    query: str,
    max_results: int = 10,
    user = Depends(get_current_user)
):
    """
    Search emails with Gmail query syntax

    Args:
        query: Gmail search query (e.g., 'from:boss@example.com is:unread')
        max_results: Maximum results to return

    Returns:
        List of matching messages

    Examples:
        - Search unread: `is:unread`
        - Search from sender: `from:example@gmail.com`
        - Search subject: `subject:meeting`
        - Combined: `from:boss@example.com is:unread`
    """
    try:
        gmail = await GmailService.from_supabase_user(user)
        messages = await gmail.search_messages(query=query, max_results=max_results)
        
        return {
            "messages": messages,
            "total": len(messages),
            "query": query
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error searching emails: {e}")
        raise HTTPException(status_code=500, detail="Failed to search emails")
