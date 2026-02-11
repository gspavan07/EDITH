"""
Chat Sessions API Endpoints - Manage chat conversation history

Provides endpoints for:
- Creating new chat sessions
- Listing user's chat sessions
- Getting session details with messages
- Updating session (title)
- Deleting sessions
- Adding messages to sessions
"""

from fastapi import APIRouter, Depends, HTTPException
from app.db.supabase_auth import get_current_user, get_current_user_optional
from app.db.supabase_client import supabase_client
from app.schemas.chat_sessions import (
    ChatSession,
    ChatSessionWithMessages,
    CreateSessionRequest,
    UpdateSessionRequest,
    CreateMessageRequest,
    SessionListResponse
)
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=SessionListResponse)
async def list_sessions(
    limit: int = 50,
    user = Depends(get_current_user_optional)
):
    """
    List chat sessions for the current user
    
    For authenticated users: Returns sessions from Supabase
    For guest users: Should be handled client-side with localStorage
    """
    if not user:
        # Guest users - return empty, they'll use localStorage
        return {"sessions": [], "total": 0}
    
    try:
        # Query sessions for this user, ordered by updated_at
        response = supabase_client.client.table('chat_sessions').select(
            'id, user_id, title, created_at, updated_at, message_count'
        ).eq('user_id', user.id).order('updated_at', desc=True).limit(limit).execute()
        
        sessions = response.data if response.data else []
        
        return {
            "sessions": sessions,
            "total": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sessions")


@router.get("/{session_id}", response_model=ChatSessionWithMessages)
async def get_session(
    session_id: str,
    user = Depends(get_current_user)
):
    """
    Get a specific chat session with all its messages
    """
    try:
        # Get session
        session_response = supabase_client.client.table('chat_sessions').select(
            '*'
        ).eq('id', session_id).eq('user_id', user.id).single().execute()
        
        if not session_response.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_response.data
        
        # Get messages for this session
        messages_response = supabase_client.client.table('chat_messages').select(
            '*'
        ).eq('session_id', session_id).order('created_at', desc=False).execute()
        
        messages = messages_response.data if messages_response.data else []
        
        return {
            **session,
            "messages": messages
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch session")


@router.post("/", response_model=ChatSession)
async def create_session(
    request: CreateSessionRequest,
    user = Depends(get_current_user)
):
    """
    Create a new chat session
    """
    try:
        now = datetime.utcnow().isoformat()
        
        response = supabase_client.client.table('chat_sessions').insert({
            'user_id': user.id,
            'title': request.title or "New Conversation",
            'created_at': now,
            'updated_at': now,
            'message_count': 0
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create session")
        
        return response.data[0]
        
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")


@router.put("/{session_id}", response_model=ChatSession)
async def update_session(
    session_id: str,
    request: UpdateSessionRequest,
    user = Depends(get_current_user)
):
    """
    Update a chat session (currently just the title)
    """
    try:
        response = supabase_client.client.table('chat_sessions').update({
            'title': request.title,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', session_id).eq('user_id', user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update session")


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    user = Depends(get_current_user)
):
    """
    Delete a chat session and all its messages
    """
    try:
        # Delete session (messages will cascade delete if FK constraint is set)
        response = supabase_client.client.table('chat_sessions').delete().eq(
            'id', session_id
        ).eq('user_id', user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")


@router.post("/{session_id}/messages")
async def add_message(
    session_id: str,
    request: CreateMessageRequest,
    user = Depends(get_current_user)
):
    """
    Add a message to a chat session
    """
    try:
        # Verify session belongs to user
        session_check = supabase_client.client.table('chat_sessions').select(
            'id'
        ).eq('id', session_id).eq('user_id', user.id).single().execute()
        
        if not session_check.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Insert message
        message_response = supabase_client.client.table('chat_messages').insert({
            'session_id': session_id,
            'text': request.text,
            'sender': request.sender,
            'created_at': datetime.utcnow().isoformat()
        }).execute()
        
        # Update session's updated_at and message_count
        supabase_client.client.table('chat_sessions').update({
            'updated_at': datetime.utcnow().isoformat(),
        }).eq('id', session_id).execute()
        
        # Increment message count
        supabase_client.client.rpc('increment_message_count', {
            'session_id': session_id
        }).execute()
        
        return {
            "message": "Message added successfully",
            "message_data": message_response.data[0] if message_response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding message to session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add message")
