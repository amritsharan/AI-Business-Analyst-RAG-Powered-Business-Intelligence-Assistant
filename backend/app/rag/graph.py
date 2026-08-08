from typing import TypedDict, List, Dict, Any
# pyrefly: ignore [missing-import]
from langchain.schema import Document
from langgraph.graph import StateGraph, START, END
from app.config import settings
from app.rag.pipeline import query_vector_store

# Define LangGraph workflow state
class AgentState(TypedDict):
    question: str
    retrieved_documents: List[Any]
    answer: str
    sources: List[Dict[str, Any]]
    validation_result: str

def get_llm():
    """
    Configure and return chat model based on settings.
    Default to ChatGoogleGenerativeAI.
    """
    if settings.GEMINI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0
        )
    elif settings.OPENAI_API_KEY:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model="gpt-4o-mini",
            openai_api_key=settings.OPENAI_API_KEY,
            temperature=0.0
        )
    else:
        # If no key is set, we return a mock LLM for testing
        class MockLLM:
            def invoke(self, messages):
                class MockResponse:
                    content = "Mock LLM Response: Please configure your GEMINI_API_KEY in the .env file."
                return MockResponse()
        return MockLLM()

# Workflow Nodes
def retrieve_documents(state: AgentState) -> Dict[str, Any]:
    """
    Retrieve documents matching the user question from the vector database.
    """
    question = state["question"]
    docs = query_vector_store(question, k=5)
    
    # Format sources for UI consumption
    sources = []
    seen_sources = set()
    for doc in docs:
        meta = doc.metadata
        # Create a unique key for deduplication in list, but let's list all relevant passages
        passage = doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content
        source_key = (meta.get("document_name"), meta.get("page_number"))
        
        sources.append({
            "document_name": meta.get("document_name", "Unknown Report"),
            "page_number": meta.get("page_number", 1),
            "section": meta.get("section", "General"),
            "document_type": meta.get("document_type", "PDF"),
            "snippet": passage,
            "content": doc.page_content # Keep full content for validation/reading
        })
        
    return {
        "retrieved_documents": docs,
        "sources": sources
    }

def generate_answer(state: AgentState) -> Dict[str, Any]:
    """
    Generate an answer based on retrieved documents context.
    """
    question = state["question"]
    docs = state["retrieved_documents"]
    
    if not docs:
        return {
            "answer": "I couldn't find sufficient information in the available reports.",
            "sources": []
        }
        
    # Combine retrieved texts
    context = ""
    for idx, doc in enumerate(docs):
        meta = doc.metadata
        context += f"\n--- Document {idx+1}: {meta.get('document_name')} (Page {meta.get('page_number')}, Section: {meta.get('section')}) ---\n"
        context += doc.page_content + "\n"
        
    system_prompt = (
        "You are an expert AI Business Analyst. Answer the user's question using ONLY the provided business reports "
        "context below. If the answer cannot be found in the context, state clearly that you do not have sufficient information.\n\n"
        "Instructions:\n"
        "1. Be precise and ground your answers in the numbers, tables, and statistics provided.\n"
        "2. format the output clearly using Markdown table, lists, or bold text for better readability.\n"
        "3. Synthesize information from multiple pages or documents if necessary (e.g. comparing sales between Q1 and Q2).\n"
        "4. Avoid making assumptions or referencing facts not in the context.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )
    
    try:
        llm = get_llm()
        response = llm.invoke(system_prompt)
        answer = response.content
    except Exception as e:
        answer = f"Error generating answer: {str(e)}"
        
    return {
        "answer": answer
    }

def validate_answer(state: AgentState) -> Dict[str, Any]:
    """
    Validate if the generated answer is fully grounded in the retrieved documents context.
    """
    question = state["question"]
    docs = state["retrieved_documents"]
    answer = state["answer"]
    
    if not docs or "I couldn't find sufficient information" in answer or "Error generating answer" in answer:
        return {
            "validation_result": "invalid",
            "answer": "I couldn't find sufficient information in the available reports."
        }
        
    context = ""
    for idx, doc in enumerate(docs):
        context += f"\n[Document {idx+1} Chunk]\n{doc.page_content}\n"
        
    # Use LLM to perform groundedness check
    validation_prompt = (
        "You are a strict QA Compliance Officer. Your task is to verify if a generated response is fully "
        "supported by the retrieved document snippets. Do NOT check general knowledge or external facts; "
        "only verify based on the provided snippets.\n\n"
        f"Retrieved Snippets:\n{context}\n\n"
        f"Generated Answer:\n{answer}\n\n"
        "Rules:\n"
        "1. If the generated answer contains facts, figures, or claims not found in the snippets, reply with 'NO'.\n"
        "2. If the generated answer correctly summarizes or matches the facts in the snippets, reply with 'YES'.\n"
        "3. Do not write anything else besides 'YES' or 'NO'.\n\n"
        "Is the answer fully supported by the snippets? (YES/NO):"
    )
    
    try:
        llm = get_llm()
        response = llm.invoke(validation_prompt)
        verdict = response.content.strip().upper()
        
        if "YES" in verdict:
            validation_result = "valid"
        else:
            validation_result = "invalid"
            # Override answer as per core requirements
            answer = "I couldn't find sufficient information in the available reports."
    except Exception as e:
        print(f"Validation error: {e}")
        validation_result = "valid"  # Fail-safe to avoid breaking on LLM issue
        
    return {
        "validation_result": validation_result,
        "answer": answer
    }

# Build LangGraph workflow
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("retrieve_documents", retrieve_documents)
workflow.add_node("generate_answer", generate_answer)
workflow.add_node("validate_answer", validate_answer)

# Set Edges
workflow.add_edge(START, "retrieve_documents")
workflow.add_edge("retrieve_documents", "generate_answer")
workflow.add_edge("generate_answer", "validate_answer")
workflow.add_edge("validate_answer", END)

# Compile Graph
graph = workflow.compile()

def run_rag_workflow(question: str) -> Dict[str, Any]:
    """
    Executes the compiled LangGraph workflow with a user question.
    """
    initial_state = {
        "question": question,
        "retrieved_documents": [],
        "answer": "",
        "sources": [],
        "validation_result": ""
    }
    
    # Run the graph synchronously
    result = graph.invoke(initial_state)
    return {
        "answer": result["answer"],
        "sources": result["sources"],
        "validation_result": result["validation_result"]
    }
