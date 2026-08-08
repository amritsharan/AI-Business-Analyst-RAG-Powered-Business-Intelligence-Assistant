import os
from langchain.schema import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from pypdf import PdfReader
from app.config import settings
from app.services import db as db_service

def get_embeddings():
    """
    Configure and return embedding model based on settings.
    Default to GoogleGenerativeAIEmbeddings.
    """
    if settings.GEMINI_API_KEY:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        return GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.GEMINI_API_KEY
        )
    elif settings.OPENAI_API_KEY:
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
    else:
        # Fallback to local HuggingFace embeddings if no key is configured
        from langchain_community.embeddings import HuggingFaceEmbeddings
        return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_vector_store():
    """
    Load Chroma vector store.
    """
    embeddings = get_embeddings()
    return Chroma(
        persist_directory=settings.VECTOR_DB_PATH,
        embedding_function=embeddings
    )

def extract_pdf_pages(file_path: str):
    """
    Extracts pages from a PDF and returns LangChain Documents with detailed metadata.
    """
    reader = PdfReader(file_path)
    documents = []
    doc_name = os.path.basename(file_path)
    doc_type = "PDF"
    
    # Simple heuristic to get clean document name representation
    clean_name = doc_name.replace('_', ' ').replace('.pdf', '').title()

    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        if not text:
            continue
        
        # Clean text basic spacing issues
        text = text.strip()
        
        # Deduce section from first few lines of text
        section = "General Overview"
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        for line in lines[:3]:
            # If the line is short and looks like a header, make it the section name
            if 3 < len(line) < 50 and not any(word in line.lower() for word in ["page", "confidential", "report"]):
                section = line
                break
                
        doc = Document(
            page_content=text,
            metadata={
                "source": file_path,
                "document_name": clean_name,
                "page_number": idx + 1,
                "section": section,
                "document_type": doc_type
            }
        )
        documents.append(doc)
        
    return documents, len(reader.pages)

def index_pdf(file_path: str):
    """
    Loads, extracts, chunks, and index PDF file in Chroma.
    Also registers the document in SQLite.
    """
    doc_name = os.path.basename(file_path)
    clean_name = doc_name.replace('_', ' ').replace('.pdf', '').title()
    
    # 1. Register or set to Processing in SQLite
    db_service.add_document(clean_name, "PDF", file_path, 0, "Processing")
    
    try:
        # 2. Extract pages
        documents, page_count = extract_pdf_pages(file_path)
        
        if not documents:
            db_service.update_document_status(clean_name, "Failed (No text extracted)")
            return False
            
        # Update page count
        db_service.add_document(clean_name, "PDF", file_path, page_count, "Processing")
        
        # 3. Chunk documents
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=600,
            chunk_overlap=120
        )
        chunks = text_splitter.split_documents(documents)
        
        # 4. Add to Chroma Vector Database
        vector_store = get_vector_store()
        vector_store.add_documents(chunks)
        
        # 5. Update SQLite to 'Indexed'
        db_service.update_document_status(clean_name, "Indexed")
        print(f"Successfully indexed document: {clean_name} ({page_count} pages, {len(chunks)} chunks)")
        return True
    except Exception as e:
        db_service.update_document_status(clean_name, f"Failed: {str(e)}")
        print(f"Error indexing document {clean_name}: {e}")
        return False

def query_vector_store(query: str, k: int = 5):
    """
    Query Chroma for similar documents.
    """
    vector_store = get_vector_store()
    try:
        results = vector_store.similarity_search(query, k=k)
        return results
    except Exception as e:
        print(f"Error querying vector store: {e}")
        return []

def rebuild_index_from_folder(folder_path: str):
    """
    Scans a folder for PDFs, deletes the current Chroma index, and re-indexes all files.
    """
    # 1. Clear vector store by deleting directories if exists
    if os.path.exists(settings.VECTOR_DB_PATH):
        try:
            import shutil
            shutil.rmtree(settings.VECTOR_DB_PATH)
            print("Deleted old vector store directory.")
        except Exception as e:
            print(f"Error deleting old vector store directory: {e}")
            
    # 2. Re-register and index files
    indexed_count = 0
    if os.path.exists(folder_path):
        for file in os.listdir(folder_path):
            if file.endswith('.pdf'):
                full_path = os.path.join(folder_path, file)
                success = index_pdf(full_path)
                if success:
                    indexed_count += 1
    return indexed_count
