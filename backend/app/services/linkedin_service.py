import os
import httpx
import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

class LinkedInService:
    def __init__(self):
        # Credentials from environment variables
        self.client_id = os.getenv("LINKEDIN_CLIENT_ID")
        self.client_secret = os.getenv("LINKEDIN_CLIENT_SECRET")
        self.redirect_uri = os.getenv("LINKEDIN_REDIRECT_URI", "http://localhost:8000/api/v1/linkedin/callback")
        
        # OAuth endpoints
        self.auth_url = "https://www.linkedin.com/oauth/v2/authorization"
        self.token_url = "https://www.linkedin.com/oauth/v2/accessToken"
        
        # API endpoints (LinkedIn API v2)
        self.api_base = "https://api.linkedin.com/rest"
        self.images_url = f"{self.api_base}/images?action=initializeUpload"
        self.posts_url = f"{self.api_base}/posts"
        
        # In-memory token storage (Settings should handle persistence via Supabase if needed)
        self.access_token = os.getenv("LINKEDIN_ACCESS_TOKEN")
        token_expiry_str = os.getenv("LINKEDIN_TOKEN_EXPIRY")
        self.token_expiry = datetime.fromisoformat(token_expiry_str) if token_expiry_str else None
        self.user_id = os.getenv("LINKEDIN_USER_ID")

    def get_authorization_url(self, state: str = "random_state") -> str:
        """Generate OAuth authorization URL for user to authenticate"""
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": "openid profile w_member_social"
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.auth_url}?{query_string}"

    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        async with httpx.AsyncClient() as client:
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self.redirect_uri,
                "client_id": self.client_id,
                "client_secret": self.client_secret
            }
            
            response = await client.post(
                self.token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 5184000)  # Default 60 days
                self.token_expiry = datetime.now() + timedelta(seconds=expires_in)
                
                # Get user profile to obtain user ID
                await self._get_user_profile()
                
                return {
                    "success": True,
                    "access_token": self.access_token,
                    "expires_in": expires_in,
                    "user_id": self.user_id
                }
            else:
                return {
                    "success": False,
                    "error": f"Token exchange failed: {response.text}"
                }

    async def _get_user_profile(self) -> Optional[str]:
        """Get user profile to obtain user ID (sub)"""
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "LinkedIn-Version": "202601",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            response = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers=headers
            )
            
            if response.status_code == 200:
                profile = response.json()
                self.user_id = profile.get("sub")
                return self.user_id
            return None

    def is_authenticated(self) -> bool:
        """Check if user is authenticated and token is valid"""
        if not self.access_token or not self.token_expiry:
            return False
        return datetime.now() < self.token_expiry

    async def upload_image(self, image_path: str) -> Optional[str]:
        """Upload image to LinkedIn and return image URN"""
        try:
            async with httpx.AsyncClient() as client:
                # Step 1: Initialize upload
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "LinkedIn-Version": "202601",
                    "X-Restli-Protocol-Version": "2.0.0",
                    "Content-Type": "application/json"
                }
                
                init_payload = {
                    "initializeUploadRequest": {
                        "owner": f"urn:li:person:{self.user_id}"
                    }
                }
                
                init_response = await client.post(
                    self.images_url,
                    headers=headers,
                    json=init_payload
                )
                
                if init_response.status_code != 200:
                    print(f"Image init failed: {init_response.text}")
                    return None
                
                init_data = init_response.json()
                upload_url = init_data["value"]["uploadUrl"]
                image_urn = init_data["value"]["image"]
                
                # Step 2: Upload binary data
                with open(image_path, "rb") as f:
                    image_data = f.read()
                
                upload_response = await client.put(
                    upload_url,
                    content=image_data,
                    headers={"Content-Type": "application/octet-stream"}
                )
                
                if upload_response.status_code in [200, 201]:
                    return image_urn
                else:
                    print(f"Image upload failed: {upload_response.text}")
                    return None
                    
        except Exception as e:
            print(f"Image upload error: {str(e)}")
            return None

    async def upload_video(self, video_path: str) -> Optional[str]:
        """Upload video to LinkedIn"""
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "LinkedIn-Version": "202601",
                    "X-Restli-Protocol-Version": "2.0.0"
                }
                
                init_payload = {
                    "initializeUploadRequest": {
                        "owner": f"urn:li:person:{self.user_id}",
                        "fileSize": os.path.getsize(video_path),
                        "uploadCaptions": False,
                        "uploadThumbnail": False
                    }
                }
                
                init_response = await client.post(
                    f"{self.api_base}/videos?action=initializeUpload",
                    headers=headers,
                    json=init_payload
                )
                
                if init_response.status_code != 200:
                    print(f"Video init failed: {init_response.text}")
                    return None
                
                init_data = init_response.json()
                upload_instructions = init_data["value"]["uploadInstructions"][0]
                upload_url = upload_instructions["uploadUrl"]
                video_urn = init_data["value"]["video"]
                
                with open(video_path, "rb") as f:
                    video_data = f.read()
                
                upload_response = await client.put(
                    upload_url,
                    content=video_data,
                    headers={"Content-Type": "application/octet-stream"}
                )
                
                if upload_response.status_code in [200, 201]:
                    return video_urn
                else:
                    print(f"Video upload failed: {upload_response.text}")
                    return None
        except Exception as e:
            print(f"Video upload error: {str(e)}")
            return None

    async def create_post(self, text: str, image_urns: List[str] = None, video_urns: List[str] = None) -> Dict[str, Any]:
        """Create a LinkedIn post with optional media"""
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "LinkedIn-Version": "202601",
                    "X-Restli-Protocol-Version": "2.0.0",
                    "Content-Type": "application/json"
                }
                
                post_payload = {
                    "author": f"urn:li:person:{self.user_id}",
                    "commentary": text,
                    "visibility": "PUBLIC",
                    "distribution": {
                        "feedDistribution": "MAIN_FEED"
                    },
                    "lifecycleState": "PUBLISHED"
                }
                
                if image_urns or video_urns:
                    if video_urns:
                        post_payload["content"] = {"media": {"id": video_urns[0]}}
                    elif image_urns:
                        post_payload["content"] = {"media": {"id": image_urns[0]}}
                
                response = await client.post(self.posts_url, headers=headers, json=post_payload)
                
                if response.status_code in [200, 201]:
                    post_id = response.headers.get("x-restli-id", "unknown")
                    return {
                        "success": True,
                        "post_id": post_id,
                        "post_url": f"https://www.linkedin.com/feed/update/{post_id}/",
                        "message": "Post created successfully!"
                    }
                else:
                    return {"success": False, "error": f"Post creation failed: {response.text}"}
                    
        except Exception as e:
            return {"success": False, "error": f"Post creation error: {str(e)}"}

    async def clear_token(self):
        """Clear LinkedIn tokens and reset service state"""
        self.access_token = None
        self.token_expiry = None
        self.user_id = None
        return True

linkedin_service = LinkedInService()

