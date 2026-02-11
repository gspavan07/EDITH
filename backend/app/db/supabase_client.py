import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class SupabaseClient:
    """
    Singleton Supabase client wrapper for EDITH backend
    """
    _instance: Optional['SupabaseClient'] = None
    _client: Optional[Client] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Supabase client with credentials from environment"""
        supabase_url = os.getenv("SUPABASE_URL")
        # Use service role key for backend operations (bypasses RLS)
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            logger.warning(
                "Supabase credentials not found. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file"
            )
            return
        
        try:
            self._client = create_client(supabase_url, supabase_key)
            logger.info("Supabase client initialized successfully with service role key")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    
    @property
    def client(self) -> Client:
        """Get the Supabase client instance"""
        if self._client is None:
            raise RuntimeError(
                "Supabase client not initialized. "
                "Check your SUPABASE_URL and SUPABASE_KEY environment variables."
            )
        return self._client
    
    # ==================== USER PROFILES ====================
    
    async def get_user_profile(self, user_id: str):
        """Get user profile by ID"""
        try:
            response = self.client.table("user_profiles").select("*").eq("id", user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return None
    
    async def create_user_profile(self, user_id: str, username: str, full_name: str = None, **kwargs):
        """Create a new user profile"""
        try:
            data = {
                "id": user_id,
                "username": username,
                "full_name": full_name,
                **kwargs
            }
            response = self.client.table("user_profiles").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating user profile: {e}")
            raise
    
    async def update_user_profile(self, user_id: str, **kwargs):
        """Update user profile"""
        try:
            response = self.client.table("user_profiles").update(kwargs).eq("id", user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            raise
    
    # ==================== CHAT SESSIONS ====================
    
    async def create_chat_session(self, user_id: str, title: str = None, external_id: str = None, **kwargs):
        """Create a new chat session"""
        try:
            data = {
                "user_id": user_id,
                "title": title,
                "external_id": external_id,
                **kwargs
            }
            response = self.client.table("chat_sessions").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating chat session: {e}")
            raise
    
    async def get_chat_sessions(self, user_id: str, limit: int = 50, offset: int = 0):
        """Get all chat sessions for a user"""
        try:
            response = (
                self.client.table("chat_sessions")
                .select("*")
                .eq("user_id", user_id)
                .eq("is_archived", False)
                .order("last_message_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching chat sessions: {e}")
            return []
    
    async def get_chat_session(self, session_id: str):
        """Get a specific chat session"""
        try:
            response = self.client.table("chat_sessions").select("*").eq("id", session_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching chat session: {e}")
            return None
    
    async def update_chat_session(self, session_id: str, **kwargs):
        """Update chat session"""
        try:
            response = self.client.table("chat_sessions").update(kwargs).eq("id", session_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating chat session: {e}")
            raise
    
    # ==================== CHAT MESSAGES ====================
    
    async def create_message(self, session_id: str, role: str, content: str, **kwargs):
        """Create a new message in a chat session"""
        try:
            data = {
                "session_id": session_id,
                "role": role,
                "content": content,
                **kwargs
            }
            response = self.client.table("chat_messages").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating message: {e}")
            raise
    
    async def get_messages(self, session_id: str, limit: int = 100, offset: int = 0):
        """Get messages for a chat session"""
        try:
            response = (
                self.client.table("chat_messages")
                .select("*")
                .eq("session_id", session_id)
                .eq("is_deleted", False)
                .order("created_at", desc=False)
                .range(offset, offset + limit - 1)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching messages: {e}")
            return []
    
    # ==================== DOCUMENTS ====================
    
    async def create_document(self, user_id: str, filename: str, file_size: int, 
                             mime_type: str, storage_path: str, **kwargs):
        """Create a new document record"""
        try:
            data = {
                "user_id": user_id,
                "filename": filename,
                "file_size_bytes": file_size,
                "mime_type": mime_type,
                "storage_path": storage_path,
                **kwargs
            }
            response = self.client.table("documents").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            raise
    
    async def get_documents(self, user_id: str, limit: int = 50, offset: int = 0):
        """Get all documents for a user"""
        try:
            response = (
                self.client.table("documents")
                .select("*")
                .eq("user_id", user_id)
                .eq("is_deleted", False)
                .order("uploaded_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching documents: {e}")
            return []
    
    async def update_document(self, document_id: str, **kwargs):
        """Update document metadata"""
        try:
            response = self.client.table("documents").update(kwargs).eq("id", document_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating document: {e}")
            raise
    
    # ==================== AUDIT LOGS ====================
    
    async def create_audit_log(self, user_id: str, action_type: str, description: str = None, **kwargs):
        """Create an audit log entry"""
        try:
            data = {
                "user_id": user_id,
                "action_type": action_type,
                "description": description,
                **kwargs
            }
            response = self.client.table("audit_logs").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating audit log: {e}")
            # Don't raise - audit logs should not break app functionality
            return None
    
    # ==================== STORAGE ====================
    
    async def upload_file(self, bucket: str, file_path: str, file_data: bytes, content_type: str = None):
        """Upload file to Supabase Storage"""
        try:
            response = self.client.storage.from_(bucket).upload(
                file_path,
                file_data,
                {"content-type": content_type} if content_type else {}
            )
            return response
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            raise
    
    async def download_file(self, bucket: str, file_path: str):
        """Download file from Supabase Storage"""
        try:
            response = self.client.storage.from_(bucket).download(file_path)
            return response
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            raise
    
    async def delete_file(self, bucket: str, file_path: str):
        """Delete file from Supabase Storage"""
        try:
            response = self.client.storage.from_(bucket).remove([file_path])
            return response
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            raise
    
    def get_public_url(self, bucket: str, file_path: str):
        """Get public URL for a file"""
        try:
            response = self.client.storage.from_(bucket).get_public_url(file_path)
            return response
        except Exception as e:
            logger.error(f"Error getting public URL: {e}")
            return None


# Singleton instance
supabase_client = SupabaseClient()
