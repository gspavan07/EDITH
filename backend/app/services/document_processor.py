"""
Document Processing Service
Handles document chunking and embedding generation for RAG
"""

import re
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class DocumentChunker:
    """Intelligently chunks documents for vector search"""
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        min_chunk_size: int = 100
    ):
        """
        Initialize document chunker
        
        Args:
            chunk_size: Target size for each chunk (in characters)
            chunk_overlap: Overlap between chunks (in characters)
            min_chunk_size: Minimum size for a chunk
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size
    
    def chunk_text(self, text: str, metadata: Dict = None) -> List[Dict]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            metadata: Optional metadata to include with each chunk
            
        Returns:
            List of chunk dictionaries with content and metadata
        """
        if not text or len(text) < self.min_chunk_size:
            return []
        
        chunks = []
        start = 0
        chunk_index = 0
        
        while start < len(text):
            # Calculate end position
            end = start + self.chunk_size
            
            # If this is not the last chunk, try to split at sentence boundary
            if end < len(text):
                # Look for sentence endings near the target end position
                search_start = max(start, end - 100)
                search_end = min(len(text), end + 100)
                search_region = text[search_start:search_end]
                
                # Find sentence boundaries (., !, ?, \n\n)
                sentence_endings = [
                    m.end() for m in re.finditer(r'[.!?]\s+|\n\n', search_region)
                ]
                
                if sentence_endings:
                    # Find closest ending to target position
                    target_offset = end - search_start
                    closest = min(sentence_endings, key=lambda x: abs(x - target_offset))
                    end = search_start + closest
            
            # Extract chunk
            chunk_text = text[start:end].strip()
            
            if len(chunk_text) >= self.min_chunk_size:
                chunk_data = {
                    "content": chunk_text,
                    "chunk_index": chunk_index,
                    "start_char": start,
                    "end_char": end,
                    "metadata": metadata or {}
                }
                chunks.append(chunk_data)
                chunk_index += 1
            
            # Move start position with overlap
            start = end - self.chunk_overlap
            
            # Prevent infinite loop
            if start >= len(text) - self.min_chunk_size:
                break
        
        logger.info(f"Chunked text into {len(chunks)} chunks")
        return chunks
    
    def chunk_by_paragraphs(self, text: str, metadata: Dict = None) -> List[Dict]:
        """
        Chunk text by paragraphs (useful for structured documents)
        
        Args:
            text: Text to chunk
            metadata: Optional metadata
            
        Returns:
            List of chunk dictionaries
        """
        # Split by double newlines (paragraphs)
        paragraphs = re.split(r'\n\n+', text)
        
        chunks = []
        current_chunk = ""
        chunk_index = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # If adding this paragraph exceeds chunk size, save current chunk
            if len(current_chunk) + len(para) > self.chunk_size and current_chunk:
                chunks.append({
                    "content": current_chunk.strip(),
                    "chunk_index": chunk_index,
                    "metadata": metadata or {}
                })
                chunk_index += 1
                current_chunk = para
            else:
                current_chunk += "\n\n" + para if current_chunk else para
        
        # Add final chunk
        if current_chunk and len(current_chunk) >= self.min_chunk_size:
            chunks.append({
                "content": current_chunk.strip(),
                "chunk_index": chunk_index,
                "metadata": metadata or {}
            })
        
        logger.info(f"Chunked text into {len(chunks)} paragraph-based chunks")
        return chunks


# Singleton instance
document_chunker = DocumentChunker()
