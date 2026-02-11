from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from app.db.supabase_client import supabase_client
from app.db.supabase_auth import get_current_user
from app.services.embedding_service import embedding_service
from app.services.document_processor import document_chunker
import logging
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

# ==================== REQUEST/RESPONSE MODELS ====================

class SearchRequest(BaseModel):
    query: str
    limit: int = 5
    threshold: float = 0.7

class SearchResult(BaseModel):
    document_id: str
    chunk_content: str
    similarity: float
    metadata: dict

# ==================== VECTOR SEARCH ENDPOINTS ====================

@router.post("/search", response_model=List[SearchResult])
async def semantic_search(
    request: SearchRequest,
    user = Depends(get_current_user)
):
    """
    Perform semantic search across user's documents
    
    Args:
        query: Search query text
        limit: Maximum number of results
        threshold: Minimum similarity score (0-1)
    """
    try:
        # Generate embedding for query
        query_embedding = await embedding_service.generate_query_embedding(request.query)
        
        # Search using Supabase RPC function
        response = supabase_client.client.rpc(
            'search_document_chunks',
            {
                'query_embedding': query_embedding,
                'match_threshold': request.threshold,
                'match_count': request.limit,
                'filter_user_id': user.id
            }
        ).execute()
        
        results = []
        for row in response.data:
            results.append(SearchResult(
                document_id=row['document_id'],
                chunk_content=row['content'],
                similarity=row['similarity'],
                metadata=row['metadata']
            ))
        
        logger.info(f"Search for '{request.query}' returned {len(results)} results")
        return results
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/documents/{document_id}/process")
async def process_document(
    document_id: str,
    user = Depends(get_current_user)
):
    """
    Process a document: chunk it and generate embeddings
    
    This endpoint:
    1. Retrieves document from storage
    2. Chunks the text
    3. Generates embeddings
    4. Stores chunks in database
    """
    try:
        # Get document record
        doc_response = supabase_client.client.table("documents")\
            .select("*")\
            .eq("id", document_id)\
            .eq("user_id", user.id)\
            .execute()
        
        if not doc_response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = doc_response.data[0]
        
        # Update status to processing
        await supabase_client.update_document(
            document_id=document_id,
            status="processing"
        )
        
        # Download file from storage
        file_data = await supabase_client.download_file(
            bucket="user-uploads",
            file_path=document['storage_path']
        )
        
        # Extract text (assuming text file for now)
        # TODO: Add PDF, DOCX extraction
        text_content = file_data.decode('utf-8')
        
        # Chunk the document
        chunks = document_chunker.chunk_text(
            text=text_content,
            metadata={
                "filename": document['filename'],
                "document_id": document_id
            }
        )
        
        # Generate embeddings for all chunks
        chunk_texts = [chunk['content'] for chunk in chunks]
        embeddings = await embedding_service.generate_embeddings_batch(chunk_texts)
        
        # Store chunks in database
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            await supabase_client.client.table("document_chunks").insert({
                "document_id": document_id,
                "chunk_index": i,
                "content": chunk['content'],
                "embedding": embedding,
                "metadata": chunk['metadata']
            }).execute()
        
        # Update document status
        await supabase_client.update_document(
            document_id=document_id,
            status="indexed",
            processed_at=supabase_client.client.sql("NOW()")
        )
        
        logger.info(f"Processed document {document_id}: {len(chunks)} chunks")
        
        return {
            "message": "Document processed successfully",
            "document_id": document_id,
            "chunks_created": len(chunks)
        }
        
    except Exception as e:
        logger.error(f"Document processing error: {e}")
        
        # Update status to failed
        await supabase_client.update_document(
            document_id=document_id,
            status="failed",
            error_message=str(e)
        )
        
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/documents/{document_id}/chunks")
async def get_document_chunks(
    document_id: str,
    user = Depends(get_current_user)
):
    """Get all chunks for a document"""
    try:
        # Verify document ownership
        doc = await supabase_client.client.table("documents")\
            .select("*")\
            .eq("id", document_id)\
            .eq("user_id", user.id)\
            .execute()
        
        if not doc.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get chunks
        chunks = await supabase_client.client.table("document_chunks")\
            .select("id, chunk_index, content, metadata")\
            .eq("document_id", document_id)\
            .order("chunk_index")\
            .execute()
        
        return {
            "document_id": document_id,
            "chunks": chunks.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))
