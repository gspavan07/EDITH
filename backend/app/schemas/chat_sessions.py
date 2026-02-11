"""
Chat Sessions API Schemas - Pydantic models for chat history management
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ChatMessage(BaseModel):
    """Chat message model"""
    id: Optional[str] = None
    session_id: str
    text: str
    sender: str  # 'user' or 'ai'
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatSession(BaseModel):
    """Chat session model"""
    id: Optional[str] = None
    user_id: Optional[str] = None
    title: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ChatSessionWithMessages(BaseModel):
    """Chat session with its messages"""
    id: str
    user_id: Optional[str] = None
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessage]


class CreateSessionRequest(BaseModel):
    """Request to create a new chat session"""
    title: Optional[str] = "New Conversation"


class UpdateSessionRequest(BaseModel):
    """Request to update a chat session"""
    title: str


class CreateMessageRequest(BaseModel):
    """Request to add a message to a session"""
    text: str
    sender: str  # 'user' or 'ai'


class SessionListResponse(BaseModel):
    """Response for listing sessions"""
    sessions: List[ChatSession]
    total: int
