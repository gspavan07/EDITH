from supabase import Client
from fastapi import HTTPException, Depends, Header
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SupabaseAuth:
    """
    Authentication helper for Supabase integration
    """
    
    def __init__(self, supabase_client: Client):
        self.client = supabase_client
    
    async def sign_up(self, email: str, password: str, metadata: dict = None):
        """Register a new user"""
        try:
            response = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": metadata or {}
                }
            })
            return response
        except Exception as e:
            logger.error(f"Sign up error: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def sign_in(self, email: str, password: str):
        """Sign in existing user"""
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            return response
        except Exception as e:
            logger.error(f"Sign in error: {e}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    async def sign_out(self, access_token: str):
        """Sign out user"""
        try:
            # Set the session
            self.client.auth.set_session(access_token, "")
            response = self.client.auth.sign_out()
            return response
        except Exception as e:
            logger.error(f"Sign out error: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def get_user(self, access_token: str):
        """Get user from access token"""
        try:
            response = self.client.auth.get_user(access_token)
            return response.user if response else None
        except Exception as e:
            logger.error(f"Get user error: {e}")
            return None
    
    async def refresh_session(self, refresh_token: str):
        """Refresh access token"""
        try:
            response = self.client.auth.refresh_session(refresh_token)
            return response
        except Exception as e:
            logger.error(f"Refresh session error: {e}")
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    async def reset_password_email(self, email: str):
        """Send password reset email"""
        try:
            response = self.client.auth.reset_password_for_email(email)
            return response
        except Exception as e:
            logger.error(f"Password reset error: {e}")
            raise HTTPException(status_code=400, detail=str(e))


# FastAPI dependency for getting current user
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    FastAPI dependency to get current authenticated user
    Usage: user = Depends(get_current_user)
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Extract Bearer token
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        # Import here to avoid circular dependency
        from app.db.supabase_client import supabase_client
        
        user = await SupabaseAuth(supabase_client.client).get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return user
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


# Optional user dependency (doesn't raise error if not authenticated)
async def get_current_user_optional(authorization: Optional[str] = Header(None)):
    """
    Optional authentication - returns None if not authenticated
    """
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except:
        return None
