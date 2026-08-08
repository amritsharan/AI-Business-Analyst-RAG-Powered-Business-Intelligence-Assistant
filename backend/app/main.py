import os
import shutil
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from app.config import settings
from app.services import db as db_service
from app.rag.pipeline import index_pdf, rebuild_index_from_folder
from app.rag.graph import run_rag_workflow

app = FastAPI(title="AI Business Analyst – API", version="1.0.0")

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to initialize SQLite db
@app.on_event("startup")
def startup_event():
    db_service.init_db()

# Pydantic schemas
class ChatRequest(BaseModel):
    question: str
    session_id: str = "default_session"

class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]
    session_id: str

class ClearHistoryRequest(BaseModel):
    session_id: str

# API Endpoints
@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    # Save user message to database
    db_service.add_chat_message(request.session_id, "user", question, [])
    
    # Run the RAG workflow via LangGraph
    try:
        result = run_rag_workflow(question)
        answer = result["answer"]
        sources = result["sources"]
        
        # Save assistant message to database
        db_service.add_chat_message(request.session_id, "assistant", answer, sources)
        
        return ChatResponse(
            answer=answer,
            sources=sources,
            session_id=request.session_id
        )
    except Exception as e:
        error_msg = f"An error occurred while generating answer: {str(e)}"
        db_service.add_chat_message(request.session_id, "assistant", error_msg, [])
        return ChatResponse(
            answer=error_msg,
            sources=[],
            session_id=request.session_id
        )

@app.get("/api/chat/history")
def get_chat_history_endpoint(session_id: str = "default_session"):
    history = db_service.get_chat_history(session_id)
    return {"history": history}

@app.post("/api/chat/clear")
def clear_chat_history_endpoint(request: ClearHistoryRequest):
    db_service.clear_chat_history(request.session_id)
    return {"message": "Chat history cleared successfully."}

@app.post("/api/documents/upload")
def upload_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    os.makedirs("./data", exist_ok=True)
    file_path = f"./data/{file.filename}"
    
    # Save file locally
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    # Queue RAG pipeline index execution in the background
    background_tasks.add_task(index_pdf, file_path)
    
    clean_name = file.filename.replace('_', ' ').replace('.pdf', '').title()
    # Register document as Processing first
    db_service.add_document(clean_name, "PDF", file_path, 0, "Processing")
    
    return {
        "message": "Upload successful. Document is being parsed and indexed.",
        "filename": file.filename
    }

@app.get("/api/documents")
def get_documents_endpoint():
    docs = db_service.get_documents()
    return {"documents": docs}

@app.post("/api/index/rebuild")
def rebuild_index_endpoint(background_tasks: BackgroundTasks):
    # Runs the rebuild in the background to avoid timeouts
    os.makedirs("./data", exist_ok=True)
    background_tasks.add_task(rebuild_index_from_folder, "./data")
    return {"message": "Reindexing process triggered in the background for all local documents."}

@app.get("/api/dashboard")
def get_dashboard_metrics():
    """
    Returns high-level business intelligence metrics aggregated from our synthetic reports.
    """
    # Main aggregated statistics
    kpis = {
        "revenue": "$2.4M",
        "customers": "24,820",
        "churn_rate": "11.7%",
        "retention_rate": "88.3%"
    }
    
    # Revenue Trends (Monthly H1)
    revenue_trend = [
        {"name": "Jan", "revenue": 340000},
        {"name": "Feb", "revenue": 360000},
        {"name": "Mar", "revenue": 400000},
        {"name": "Apr", "revenue": 410000},
        {"name": "May", "revenue": 430000},
        {"name": "Jun", "revenue": 460000}
    ]
    
    # Regional Breakdown
    regional_performance = [
        {"region": "North", "revenue": 750000, "sales": 7700, "churn": 9.5, "csat": 86.0},
        {"region": "East", "revenue": 680000, "sales": 7080, "churn": 10.8, "csat": 83.0},
        {"region": "West", "revenue": 550000, "sales": 5640, "churn": 12.3, "csat": 80.0},
        {"region": "South", "revenue": 420000, "sales": 4400, "churn": 14.2, "csat": 75.0}
    ]
    
    # Churn Trends (Monthly H1)
    churn_trend = [
        {"name": "Jan", "churn": 9.8},
        {"name": "Feb", "churn": 10.1},
        {"name": "Mar", "churn": 10.7},
        {"name": "Apr", "churn": 12.0},
        {"name": "May", "churn": 13.8},
        {"name": "Jun", "churn": 13.8}
    ]

    return {
        "kpis": kpis,
        "revenue_trend": revenue_trend,
        "regional_performance": regional_performance,
        "churn_trend": churn_trend
    }

@app.get("/api/analytics")
def get_analytics_details():
    """
    Returns granular metrics for dedicated charts.
    """
    # Sales by Product Category
    product_sales = [
        {"product": "Software Licenses", "revenue": 1350000, "csat": 88.0, "share": 56.35},
        {"product": "Hardware Sales", "revenue": 650000, "csat": 78.0, "share": 27.08},
        {"product": "Professional Services", "revenue": 400000, "csat": 82.0, "share": 16.57}
    ]
    
    # Support ticket categories
    support_categories = [
        {"name": "Technical Issues", "value": 833},
        {"name": "Billing Inquiries", "value": 555},
        {"name": "Feature Requests", "value": 277},
        {"name": "Account Setup", "value": 185}
    ]
    
    # Support CSAT & Response time trend
    support_performance = [
        {"name": "Q1", "csat": 84.0, "response_time": 4.2},
        {"name": "Q2", "csat": 81.0, "response_time": 6.8}
    ]

    return {
        "product_sales": product_sales,
        "support_categories": support_categories,
        "support_performance": support_performance
    }
