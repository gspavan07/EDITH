"""
Gmail API Schemas - Pydantic models for Gmail endpoints
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List


class EmailRequest(BaseModel):
    """Request to send an email"""
    to: EmailStr
    subject: str
    body: str
    cc: Optional[EmailStr] = None


class DraftRequest(BaseModel):
    """Request to create an email draft"""
    to: EmailStr
    subject: str
    body: str


class SearchRequest(BaseModel):
    """Request to search emails"""
    query: str
    max_results: int = 10


class MessageResponse(BaseModel):
    """Email message response"""
    id: str
    thread_id: str
    subject: str
    from_email: str
    date: str
    snippet: str
    body: str
    labels: List[str]

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """List of email messages"""
    messages: List[dict]
    total: int
