import os
import faiss
import pickle
import numpy as np
import logging
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Prevent parallelism warning for tokenizers
os.environ["TOKENIZERS_PARALLELISM"] = "false"

class VectorStoreService:
    def __init__(self, index_dir: str = "agent_data/vector_store"):
        self.index_dir = index_dir
        os.makedirs(self.index_dir, exist_ok=True)
        
        # Load local embedding model
        logger.info("Loading SentenceTransformer model...")
        self.model = SentenceTransformer("intfloat/e5-large-v2")
        
        self.index: Optional[faiss.IndexFlatL2] = None
        self.metadata: List[Dict] = []  # Stores text and source info
        
        self._load_index()

    def _load_index(self):
        index_file = os.path.join(self.index_dir, "index.faiss")
        meta_file = os.path.join(self.index_dir, "metadata.pkl")
        
        if os.path.exists(index_file) and os.path.exists(meta_file):
            try:
                self.index = faiss.read_index(index_file)
                with open(meta_file, "rb") as f:
                    self.metadata = pickle.load(f)
                logger.info(f"Loaded existing index with {len(self.metadata)} documents.")
            except Exception as e:
                logger.error(f"Error loading vector store: {e}")
                self.index = None
                self.metadata = []

    def _save_index(self):
        index_file = os.path.join(self.index_dir, "index.faiss")
        meta_file = os.path.join(self.index_dir, "metadata.pkl")
        
        try:
            faiss.write_index(self.index, index_file)
            with open(meta_file, "wb") as f:
                pickle.dump(self.metadata, f)
            logger.info("Vector store saved successfully.")
        except Exception as e:
            logger.error(f"Error saving vector store: {e}")

    def add_documents(self, texts: List[str], source_info: Dict):
        """Adds texts to the vector store with associated source metadata."""
        if not texts:
            return

        logger.info(f"Indexing {len(texts)} chunks from {source_info.get('filename')}...")
        
        # Format for E5: search queries need "query: ", docs need "passage: "
        formatted_texts = [f"passage: {text}" for text in texts]
        embeddings = self.model.encode(formatted_texts, convert_to_tensor=False)
        embeddings = np.array(embeddings).astype('float32')

        dim = embeddings.shape[1]
        if self.index is None:
            self.index = faiss.IndexFlatL2(dim)
        
        self.index.add(embeddings)
        
        for i, text in enumerate(texts):
            self.metadata.append({
                "text": text,
                "source": source_info.get("filename"),
                "path": source_info.get("path"),
                "page": i + 1
            })
            
        self._save_index()

    def search(self, query: str, k: int = 5) -> List[Dict]:
        """Searches for the k most similar chunks to the query."""
        if self.index is None or not self.metadata:
            return []

        formatted_query = f"query: {query}"
        query_embedding = self.model.encode([formatted_query], convert_to_tensor=False)
        query_embedding = np.array(query_embedding).astype('float32')

        distances, indices = self.index.search(query_embedding, k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.metadata):
                res = self.metadata[idx].copy()
                res["score"] = float(distances[0][i])
                results.append(res)
        
        return results

vector_store = VectorStoreService()
