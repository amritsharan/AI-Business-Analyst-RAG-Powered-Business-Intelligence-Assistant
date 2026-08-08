import sqlite3
import json
import os
from datetime import datetime
from app.config import settings

def get_db_connection():
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create documents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        type TEXT,
        file_path TEXT,
        pages INTEGER,
        upload_date TEXT,
        status TEXT
    )
    """)
    
    # Create chat history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        role TEXT,
        content TEXT,
        sources TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    conn.close()

# Document operations
def add_document(name: str, doc_type: str, file_path: str, pages: int, status: str = "Indexed"):
    conn = get_db_connection()
    cursor = conn.cursor()
    upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        cursor.execute("""
        INSERT INTO documents (name, type, file_path, pages, upload_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            pages=excluded.pages,
            upload_date=excluded.upload_date,
            status=excluded.status
        """, (name, doc_type, file_path, pages, upload_date, status))
        conn.commit()
    except Exception as e:
        print(f"Error adding document to DB: {e}")
    finally:
        conn.close()

def update_document_status(name: str, status: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE documents SET status = ? WHERE name = ?", (status, name))
    conn.commit()
    conn.close()

def get_documents():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY upload_date DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# Chat history operations
def add_chat_message(session_id: str, role: str, content: str, sources: list = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    sources_str = json.dumps(sources or [])
    cursor.execute("""
    INSERT INTO chat_history (session_id, role, content, sources)
    VALUES (?, ?, ?, ?)
    """, (session_id, role, content, sources_str))
    conn.commit()
    conn.close()

def get_chat_history(session_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT role, content, sources, timestamp 
    FROM chat_history 
    WHERE session_id = ? 
    ORDER BY timestamp ASC
    """, (session_id,))
    rows = cursor.fetchall()
    conn.close()
    
    history = []
    for row in rows:
        history.append({
            "role": row["role"],
            "content": row["content"],
            "sources": json.loads(row["sources"] or "[]"),
            "timestamp": row["timestamp"]
        })
    return history

def clear_chat_history(session_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_history WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()
