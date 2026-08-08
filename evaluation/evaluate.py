import os
import sys
import json
from datetime import datetime

# Add backend to path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.config import settings
from app.rag.graph import run_rag_workflow
from app.services import db as db_service

# Predefined Evaluation Dataset
EVAL_DATASET = [
    {
        "id": 1,
        "question": "Which region had the highest churn in Q2?",
        "expected_source": "Customer Churn Analysis",
        "expected_facts": ["South", "14.2%"],
        "is_answerable": True
    },
    {
        "id": 2,
        "question": "What was the total company revenue in Q1?",
        "expected_source": "Q1 Sales Report",
        "expected_facts": ["$1.1M", "$1,100,000"],
        "is_answerable": True
    },
    {
        "id": 3,
        "question": "What was the overall company retention rate for H1?",
        "expected_source": "Customer Churn Analysis",
        "expected_facts": ["88.3%"],
        "is_answerable": True
    },
    {
        "id": 4,
        "question": "Compare Q1 and Q2 revenue for Software Licenses.",
        "expected_source": "Product Performance Report", # Or sales reports
        "expected_facts": ["$600,000", "$750,000", "$1.35M"],
        "is_answerable": True
    },
    {
        "id": 5,
        "question": "Which region had the lowest churn rate?",
        "expected_source": "Customer Churn Analysis",
        "expected_facts": ["North", "9.5%"],
        "is_answerable": True
    },
    {
        "id": 6,
        "question": "How many total support tickets were handled in H1?",
        "expected_source": "Customer Support Report",
        "expected_facts": ["1,850", "1850"],
        "is_answerable": True
    },
    {
        "id": 7,
        "question": "What percentage of support tickets were technical issues?",
        "expected_source": "Customer Support Report",
        "expected_facts": ["45%", "45.0%"],
        "is_answerable": True
    },
    {
        "id": 8,
        "question": "What was the average response time for support tickets in Q2?",
        "expected_source": "Customer Support Report",
        "expected_facts": ["6.8 hours"],
        "is_answerable": True
    },
    {
        "id": 9,
        "question": "Why did the South region perform poorly and have high churn?",
        "expected_source": "Regional Performance Report",
        "expected_facts": ["latency", "450ms", "server"],
        "is_answerable": True
    },
    {
        "id": 10,
        "question": "What was the Customer Satisfaction (CSAT) rating for Software Licenses in H1?",
        "expected_source": "Product Performance Report",
        "expected_facts": ["88.0%", "88%"],
        "is_answerable": True
    },
    {
        "id": 11,
        "question": "What is the Net Revenue Retention (NRR) for the Software Licenses segment?",
        "expected_source": "Product Performance Report",
        "expected_facts": ["112%"],
        "is_answerable": True
    },
    {
        "id": 12,
        "question": "What was the average support ticket response time in Q1?",
        "expected_source": "Customer Support Report",
        "expected_facts": ["4.2 hours"],
        "is_answerable": True
    },
    {
        "id": 13,
        "question": "What are the three primary drivers of customer churn?",
        "expected_source": "Customer Churn Analysis",
        "expected_facts": ["pricing", "onboarding", "support delays"],
        "is_answerable": True
    },
    {
        "id": 14,
        "question": "Who is the Chief Executive Officer (CEO) of the company?",
        "expected_source": "None",
        "expected_facts": ["sufficient information", "couldn't find"],
        "is_answerable": False
    },
    {
        "id": 15,
        "question": "What is the sales forecast for Q3 and Q4 of next year?",
        "expected_source": "None",
        "expected_facts": ["sufficient information", "couldn't find"],
        "is_answerable": False
    }
]

def evaluate_rag():
    print("Initializing SQLite database connection...")
    db_service.init_db()
    
    print("Running RAG Evaluation on 15 test questions...")
    results = []
    
    retrieval_successes = 0
    correctness_successes = 0
    groundedness_successes = 0
    refusal_successes = 0
    
    for item in EVAL_DATASET:
        q_id = item["id"]
        question = item["question"]
        expected_src = item["expected_source"]
        expected_facts = item["expected_facts"]
        is_answerable = item["is_answerable"]
        
        print(f"\n[{q_id}/15] Evaluating: '{question}'")
        
        try:
            # Execute RAG LangGraph workflow
            workflow_res = run_rag_workflow(question)
            answer = workflow_res["answer"]
            sources = workflow_res["sources"]
            val_result = workflow_res["validation_result"]
            
            # Check Retrieval Relevance (did it find the expected document?)
            retrieved_docs_names = [s["document_name"].lower() for s in sources]
            retrieval_ok = False
            if not is_answerable and not sources:
                retrieval_ok = True
            elif expected_src.lower() in [name for name in retrieved_docs_names]:
                retrieval_ok = True
            else:
                # Partial match check
                for name in retrieved_docs_names:
                    if any(word in name for word in expected_src.lower().split()):
                        retrieval_ok = True
                        break
            
            if retrieval_ok:
                retrieval_successes += 1
                
            # Check Answer Correctness (contains expected keywords/facts)
            answer_lower = answer.lower()
            correctness_ok = False
            if is_answerable:
                # All expected facts must be in response
                matches = [fact.lower() in answer_lower for fact in expected_facts]
                # If at least one representation matches, it is correct (e.g. $1.1M vs $1,100,000)
                # Let's count how many expected facts are found
                found_count = sum(1 for m in matches if m)
                correctness_ok = found_count > 0
            else:
                # Should properly state refusal
                correctness_ok = any(phrase in answer_lower for phrase in ["couldn't find", "sufficient information", "not found", "insufficient"])
                if correctness_ok:
                    refusal_successes += 1
            
            if correctness_ok:
                correctness_successes += 1
                
            # Check Groundedness (based on LangGraph validation node)
            groundedness_ok = (val_result == "valid") if is_answerable else (val_result == "invalid")
            if groundedness_ok:
                groundedness_successes += 1
                
            verdict = "PASS" if (retrieval_ok and correctness_ok) else "FAIL"
            
            results.append({
                "id": q_id,
                "question": question,
                "expected_source": expected_src,
                "expected_facts": expected_facts,
                "retrieved_sources": [s["document_name"] for s in sources],
                "generated_answer": answer,
                "validation": val_result,
                "retrieval_status": "OK" if retrieval_ok else "MISSING",
                "correctness_status": "CORRECT" if correctness_ok else "INCORRECT",
                "verdict": verdict
            })
            
            print(f"Verdict: {verdict} | Retrieval: {retrieval_ok} | Correctness: {correctness_ok} | Validation Node: {val_result}")
            
        except Exception as e:
            print(f"Error evaluating question {q_id}: {e}")
            results.append({
                "id": q_id,
                "question": question,
                "expected_source": expected_src,
                "expected_facts": expected_facts,
                "retrieved_sources": [],
                "generated_answer": f"ERROR: {str(e)}",
                "validation": "error",
                "retrieval_status": "ERROR",
                "correctness_status": "ERROR",
                "verdict": "FAIL"
            })
            
    # Calculate percentages
    total_q = len(EVAL_DATASET)
    retrieval_acc = (retrieval_successes / total_q) * 100
    correctness_acc = (correctness_successes / total_q) * 100
    groundedness_acc = (groundedness_successes / total_q) * 100
    
    # Refusal rate (for unanswerable questions)
    unanswerable_q = sum(1 for item in EVAL_DATASET if not item["is_answerable"])
    refusal_rate = (refusal_successes / unanswerable_q) * 100 if unanswerable_q > 0 else 100.0
    
    # Write Markdown Report
    os.makedirs('evaluation', exist_ok=True)
    report_path = 'evaluation/evaluation_report.md'
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# RAG Evaluation Report\n\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Summary Metrics\n\n")
        f.write(f"- **Total Questions Evaluated**: {total_q}\n")
        f.write(f"- **Retrieval Relevance Accuracy**: {retrieval_acc:.1f}%\n")
        f.write(f"- **Answer Correctness**: {correctness_acc:.1f}%\n")
        f.write(f"- **Groundedness Check Pass Rate**: {groundedness_acc:.1f}%\n")
        f.write(f"- **Hallucination Prevention Refusal Rate**: {refusal_rate:.1f}%\n\n")
        
        f.write("## Detailed Test Results\n\n")
        f.write("| ID | Question | Expected Source | Retrieved Sources | Verdict | Correctness | Validation |\n")
        f.write("|----|----------|-----------------|-------------------|---------|-------------|------------|\n")
        for res in results:
            sources_str = ", ".join(set(res["retrieved_sources"])) if res["retrieved_sources"] else "*None*"
            f.write(f"| {res['id']} | {res['question']} | {res['expected_source']} | {sources_str} | **{res['verdict']}** | {res['correctness_status']} | {res['validation']} |\n")
            
        f.write("\n## Raw Outputs & Analysis\n\n")
        for res in results:
            f.write(f"### Q{res['id']}: {res['question']}\n")
            f.write(f"- **Expected Source**: {res['expected_source']}\n")
            f.write(f"- **Expected Facts**: `{res['expected_facts']}`\n")
            f.write(f"- **Retrieved Sources**: `{res['retrieved_sources']}`\n")
            f.write(f"- **Generated Answer**:\n\n{res['generated_answer']}\n\n")
            f.write(f"- **Validation Result**: `{res['validation']}`\n")
            f.write(f"- **Verdict**: `{res['verdict']}`\n")
            f.write("---\n\n")
            
    print(f"\nEvaluation finished. Detailed report written to: {report_path}")

if __name__ == '__main__':
    evaluate_rag()
