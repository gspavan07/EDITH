from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.db.supabase_client import supabase_client
from app.db.supabase_auth import SupabaseAuth, get_current_user
from typing import Optional
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

auth_service = SupabaseAuth(supabase_client.client)

# ==================== REQUEST/RESPONSE MODELS ====================

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    username: str
    full_name: Optional[str] = None

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

# ==================== AUTH ENDPOINTS ====================

@router.post("/signup")
async def sign_up(request: SignUpRequest):
    """Register a new user"""
    try:
        # Sign up with Supabase Auth
        auth_response = await auth_service.sign_up(
            email=request.email,
            password=request.password,
            metadata={"username": request.username}
        )
        
        user_id = auth_response.user.id
        
        # Create user profile
        profile = await supabase_client.create_user_profile(
            user_id=user_id,
            username=request.username,
            full_name=request.full_name
        )
        
        # Create audit log
        await supabase_client.create_audit_log(
            user_id=user_id,
            action_type="AUTH",
            description=f"User signed up: {request.username}"
        )
        
        return {
            "message": "User created successfully",
            "user": {
                "id": user_id,
                "email": request.email,
                "username": request.username
            },
            "session": {
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token
            }
        }
    except Exception as e:
        logger.error(f"Sign up error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin")
async def sign_in(request: SignInRequest):
    """Sign in existing user"""
    try:
        auth_response = await auth_service.sign_in(
            email=request.email,
            password=request.password
        )
        
        user_id = auth_response.user.id
        
        # Get user profile
        profile = await supabase_client.get_user_profile(user_id)
        
        # Create audit log
        await supabase_client.create_audit_log(
            user_id=user_id,
            action_type="AUTH",
            description="User signed in"
        )
        
        return {
            "message": "Signed in successfully",
            "user": {
                "id": user_id,
                "email": auth_response.user.email,
                "username": profile.get("username") if profile else None
            },
            "session": {
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token
            }
        }
    except Exception as e:
        logger.error(f"Sign in error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/signout")
async def sign_out(user = Depends(get_current_user)):
    """Sign out current user"""
    try:
        # Sign out from Supabase
        await auth_service.sign_out(user.access_token)
        
        return {"message": "Signed out successfully"}
    except Exception as e:
        logger.error(f"Sign out error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refresh")
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token"""
    try:
        response = await auth_service.refresh_session(request.refresh_token)
        
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token
        }
    except Exception as e:
        logger.error(f"Refresh token error: {e}")
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/reset-password")
async def reset_password(request: PasswordResetRequest):
    """Send password reset email"""
    try:
        await auth_service.reset_password_email(request.email)
        return {"message": "Password reset email sent"}
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me")
async def get_current_user_info(user = Depends(get_current_user)):
    """Get current authenticated user info"""
    try:
        profile = await supabase_client.get_user_profile(user.id)
        
        return {
            "id": user.id,
            "email": user.email,
            "username": profile.get("username") if profile else None,
            "full_name": profile.get("full_name") if profile else None,
            "avatar_url": profile.get("avatar_url") if profile else None
        }
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user info")
