import google.generativeai as genai
from openai import OpenAI
import numpy as np
import logging
import re
import time
import itertools
from dotenv import load_dotenv
import os
import pickle
import hashlib
from concurrent.futures import ThreadPoolExecutor
from .embeddings import get_embeddings, build_faiss_index
from .prompt_template import TEMPLATE
from .utils import clean_response, contains_api_or_url

load_dotenv()

# PDF cache
pdf_cache = {}
CACHE_DIR = "pdf_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY)
GEMINI_FALLBACK_KEYS = [
    os.getenv("GEMINI_API_KEY1"),
    os.getenv("GEMINI_API_KEY2"),
    os.getenv("GEMINI_API_KEY3")
]
gemini_cycle = itertools.cycle(GEMINI_FALLBACK_KEYS)
MODEL_NAME = "gemini-2.5-flash"
# Create logs directory
os.makedirs("logs", exist_ok=True)

# Configure logging for api_requests.log
request_logger = logging.getLogger("api_requests")
if not request_logger.handlers:
    request_logger.setLevel(logging.INFO)
    request_handler = logging.FileHandler("logs/api_requests.log")
    request_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    request_logger.addHandler(request_handler)
    request_logger.propagate = False

# Configure logging for api_details.log
detail_logger = logging.getLogger("api_details")
if not detail_logger.handlers:
    detail_logger.setLevel(logging.INFO)
    detail_handler = logging.FileHandler("logs/api_details.log")
    detail_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
    detail_logger.addHandler(detail_handler)
    detail_logger.propagate = False

def process_question(q: str, pages: list, index, doc_url: str):
    try:
        
        q_embeddings = get_embeddings((q,))
        if q_embeddings is None:
            return "Unable to process this query"
        q_embed = q_embeddings[0]
        D, I = index.search(np.array([q_embed]), k=15)
        relevant_chunks = [pages[i] for i in  I[0]]
        
        has_instructions = [chunk for chunk in relevant_chunks if contains_api_or_url(chunk)]
        if has_instructions:
            from .intractive_agent import reasoning_agent
            import asyncio
            return asyncio.run(reasoning_agent(doc_url, q))
        
        prompt = TEMPLATE.format(clauses="\n".join(relevant_chunks), question=q)
        token_count = len(prompt.split())
            
        try:
            gemini_key = next(gemini_cycle)
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel(MODEL_NAME)
            response = model.generate_content(prompt)
            detail_logger.info(f"Question: {q}")
            detail_logger.info(f"Gemini - Tokens sent: {token_count}")
            cleaned_response = clean_response(response.text)
            detail_logger.info(f"Gemini - Response: {cleaned_response}\n")
            return cleaned_response
            
        except Exception as gemini_error:
            detail_logger.warning(f"Gemini failed: {gemini_error}, falling back to OpenAI")
            response = openai_client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[{"role": "user", "content": prompt}]
            )
            cleaned_response = clean_response(response.choices[0].message.content)
            detail_logger.info(f"Question: {q}")
            detail_logger.info(f"Gemini - Tokens sent: {token_count}")
            detail_logger.info(f"OPENAI - Response: {cleaned_response}\n")
            return cleaned_response
        
            
    except Exception as e:
        detail_logger.info(f"Question: {q}")
        detail_logger.error(f"Error processing question: {str(e)}")
        return "Unable to process this query"

def get_cache_filename(doc_url, pages):
    """Generate cache filename based on doc_url hash"""
    content_hash = hashlib.md5(doc_url.encode()).hexdigest()
    return os.path.join(CACHE_DIR, f"{content_hash}.pkl")

def get_faiss_filename(doc_url):
    """Generate FAISS index filename based on doc_url hash"""
    content_hash = hashlib.md5(doc_url.encode()).hexdigest()
    return os.path.join(CACHE_DIR, f"{content_hash}.faiss")

def load_from_cache(cache_file, faiss_file):
    """Load pages and embeddings from cache file"""
    try:
        if not os.path.exists(cache_file):
            return None
            
        with open(cache_file, 'rb') as f:
            cached_data = pickle.load(f)
            
        # Rebuild FAISS index from cached embeddings (fast)
        if 'embeddings' in cached_data:
            cached_data['index'] = build_faiss_index(cached_data['embeddings'])
            return cached_data
        return None
    except Exception as e:
        logging.warning(f"Failed to load cache {cache_file}: {e}")
        return None


def save_to_cache(cache_file, faiss_file, pages, index, embeddings):
    """Save pages and embeddings to cache file"""
    try:
        with open(cache_file, 'wb') as f:
            pickle.dump({'pages': pages, 'embeddings': embeddings}, f)
    except Exception as e:
        logging.error(f"Failed to save cache: {e}")


def download_and_parse_document(doc_url, file_ext):
    """Download document once and parse based on file type"""
    from .document_parser import parse_pdf, parse_image, parse_pptx, parse_excel, parse_docx
    import requests
    import tempfile
    import os
    
    # Check for unsupported file types
    if file_ext in ['zip', 'bin']:
        raise ValueError("The document is not supported")
    
    if file_ext == 'pdf':
        return parse_pdf(doc_url)
    
    # Download once for all non-PDF types
    response = requests.get(doc_url)
    content = response.content
    
    with tempfile.NamedTemporaryFile(suffix=f'.{file_ext}', delete=False) as tmp_file:
        tmp_file.write(content)
        tmp_path = tmp_file.name
    
    try:
        if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']:
            return parse_image(tmp_path)
        elif file_ext == 'pptx':
            return parse_pptx(tmp_path)
        elif file_ext in ['xlsx', 'xls']:
            return parse_excel(tmp_path)
        elif file_ext == 'docx':
            return parse_docx(tmp_path)
        else:
            raise ValueError("The document is not supported")
    finally:
        os.unlink(tmp_path)

def handle_api_link(doc_url):
    """Handle API links by making requests and extracting data"""
    import requests
    import json
    
    try:
        response = requests.get(doc_url, timeout=30)
        response.raise_for_status()
        
        # Try to parse as JSON first
        try:
            data = response.json()
            return [json.dumps(data, indent=2)]
        except:
            # If not JSON, return as text
            return [response.text]
    except Exception as e:
        raise ValueError(f"Failed to fetch data from API: {str(e)}")

def process_and_answer(pages, questions, doc_url):
    global pdf_cache
    start_time = time.time()
    
    request_logger.info(f"Received document: {doc_url}")
    request_logger.info(f"Processing {len(questions)} questions")
    detail_logger.info(f"Received document: {doc_url}")

    cache_key = doc_url
    if cache_key in pdf_cache:
        cached_data = pdf_cache[cache_key]
        pages = cached_data['pages']
        index = cached_data['index']
    else:
        cache_file = get_cache_filename(doc_url, [])
        faiss_file = get_faiss_filename(doc_url)
        cached_data = load_from_cache(cache_file, faiss_file)
        
        if cached_data:
            pages = cached_data['pages']
            index = cached_data['index']
            pdf_cache[cache_key] = cached_data
        else:
            # Check if it's an API link (no file extension or specific API patterns)
            url_path = doc_url.split('/')[-1].split('?')[0]
            if '.' in url_path:
                file_ext = url_path.lower().split('.')[-1]
                request_logger.info(f"File {file_ext}")
                pages = download_and_parse_document(doc_url, file_ext)  # Will properly block ZIP/BIN
            else:
                # No file extension - treat as API link
                pages = handle_api_link(doc_url)
            
            if not pages or len(" ".join(pages)) < 10:
                raise ValueError("The document is not supported")
            
            chunk_embeddings = get_embeddings(tuple(pages))
            if chunk_embeddings is None:
                raise ValueError("Failed to generate embeddings")
            index = build_faiss_index(chunk_embeddings)
            
            cached_data = {'pages': pages, 'index': index}
            pdf_cache[cache_key] = cached_data
            save_to_cache(cache_file, faiss_file, pages, index, chunk_embeddings)
    
    max_workers = 16 if len(questions) > 25 else 8
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        answers = list(executor.map(
            lambda q: process_question(q, pages, index, doc_url),
            questions
        ))
    
    
    elapsed_time = time.time() - start_time
    request_logger.info(f"Completed in {elapsed_time:.2f}s")
    
    return answers