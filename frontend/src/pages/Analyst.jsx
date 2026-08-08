import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Copy, 
  FileText, 
  MessageSquare, 
  Sparkles,
  BookOpen,
  ArrowRight,
  RefreshCw,
  X,
  Check
} from 'lucide-react';
import { sendChatMessage, fetchChatHistory, clearChatHistory } from '../services/api';

// Custom lightweight inline parser for bold and normal text
function parseInlineMarkdown(text) {
  if (!text) return '';
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(<strong key={match.index} className="font-bold text-white">{match[1]}</strong>);
    lastIndex = boldRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
}

// Custom line-by-line parser for document markdown
function renderMarkdown(text) {
  if (!text) return null;
  
  const lines = text.split('\n');
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  
  const elements = lines.map((line, idx) => {
    // Headers
    if (line.startsWith('### ')) {
      return <h4 key={idx} className="text-sm font-semibold text-slate-100 mt-4 mb-2">{line.substring(4)}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={idx} className="text-base font-semibold text-indigo-300 mt-5 mb-2">{line.substring(3)}</h3>;
    }
    if (line.startsWith('# ')) {
      return <h2 key={idx} className="text-lg font-bold text-indigo-400 mt-6 mb-3">{line.substring(2)}</h2>;
    }
    
    // Markdown table parsing
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.every(p => p.startsWith('-') || p.endsWith('-'))) {
        return null;
      }
      if (!inTable) {
        inTable = true;
        tableHeaders = parts;
        return null;
      } else {
        tableRows.push(parts);
        const nextLine = lines[idx + 1];
        const nextIsTable = nextLine && nextLine.trim().startsWith('|') && nextLine.trim().endsWith('|');
        if (!nextIsTable) {
          inTable = false;
          const headers = [...tableHeaders];
          const rows = [...tableRows];
          tableHeaders = [];
          tableRows = [];
          return (
            <div key={idx} className="overflow-x-auto my-3 rounded-lg border border-slate-700 bg-slate-900/60 max-w-full">
              <table className="min-w-full divide-y divide-slate-700 text-xs">
                <thead className="bg-slate-800/80">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left font-semibold text-slate-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/40">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2 text-slate-300 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      }
    }
    
    // Bullet lists
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const content = line.trim().substring(2);
      return (
        <li key={idx} className="list-disc ml-5 mb-1.5 text-slate-300 leading-relaxed">
          {parseInlineMarkdown(content)}
        </li>
      );
    }
    
    // Empty line spacer
    if (line.trim() === '') {
      return <div key={idx} className="h-2" />;
    }
    
    // Paragraph text
    return (
      <p key={idx} className="text-slate-300 leading-relaxed mb-3 text-sm">
        {parseInlineMarkdown(line)}
      </p>
    );
  }).filter(el => el !== null);
  
  return <div className="space-y-1">{elements}</div>;
}

export default function Analyst() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [activeSource, setActiveSource] = useState(null); // Document detail popup
  const chatEndRef = useRef(null);

  const suggestedQuestions = [
    "Why did churn increase in Q2?",
    "Which region had the highest churn in Q2?",
    "Compare Q1 and Q2 revenue for Software Licenses.",
    "What operational issues are there in the South region?"
  ];

  // Fetch history on load
  useEffect(() => {
    async function loadHistory() {
      try {
        const historyRes = await fetchChatHistory('default_session');
        const formatted = historyRes.history.map(msg => ({
          id: Math.random().toString(),
          sender: msg.role === 'user' ? 'user' : 'ai',
          text: msg.content,
          sources: msg.sources || []
        }));
        setMessages(formatted);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    }
    loadHistory();
  }, []);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionText) => {
    const text = questionText || input;
    if (!text.trim() || loading) return;

    // Clear input
    if (!questionText) setInput('');

    // Add user message to UI
    const userMsgId = Math.random().toString();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text }]);
    setLoading(true);

    try {
      const response = await sendChatMessage(text, 'default_session');
      setMessages(prev => [
        ...prev, 
        { 
          id: Math.random().toString(), 
          sender: 'ai', 
          text: response.answer, 
          sources: response.sources || [] 
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'ai',
          text: 'Error: Failed to fetch response. Please ensure backend server is operational.',
          sources: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear conversation history?')) {
      try {
        await clearChatHistory('default_session');
        setMessages([]);
      } catch (err) {
        alert('Failed to clear chat history.');
      }
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-h-[850px] relative animate-fadeIn">
      {/* Analyst Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-400" />
            AI Business Analyst
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Ask questions about sales reports, customer satisfaction, churn models, and regional latency metrics.</p>
        </div>
        {messages.length > 0 && (
          <button 
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition"
          >
            <Trash2 className="h-4 w-4" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Suggested Questions (Show only when conversation is empty) */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col justify-center items-center p-6 space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full w-fit mx-auto">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">RAG-Powered BI Assistant</h2>
            <p className="text-slate-400 text-sm max-w-md">Retrieve exact facts and statistics from your internal business documents. Start with a recommended question below:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="flex items-center justify-between text-left p-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 rounded-xl text-xs text-slate-300 font-medium transition group"
              >
                <span>{q}</span>
                <ArrowRight className="h-4 w-4 text-indigo-500 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Thread */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-2">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex flex-col max-w-3xl ${
                msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              {/* Message Bubble */}
              <div 
                className={`p-4 rounded-2xl text-slate-300 relative group max-w-full ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-slate-900/60 border border-slate-800 rounded-bl-none shadow-md'
                }`}
              >
                {/* Copy Button (Only for AI responses) */}
                {msg.sender === 'ai' && (
                  <button
                    onClick={() => copyToClipboard(msg.text, msg.id)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}

                <div className="text-sm font-medium">
                  {msg.sender === 'user' ? msg.text : renderMarkdown(msg.text)}
                </div>
              </div>

              {/* Source Citation Cards */}
              {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 w-full">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 mb-2.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    RECONSTRUCTED SOURCES ({msg.sources.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-full">
                    {msg.sources.map((src, sIdx) => (
                      <div 
                        key={sIdx}
                        className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-bold text-slate-200 truncate pr-2">📄 {src.document_name}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
                              Page {src.page_number}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 italic leading-relaxed">
                            "{src.snippet}"
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveSource(src)}
                          className="mt-3 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer w-fit"
                        >
                          View Source Context
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loader */}
          {loading && (
            <div className="flex flex-col items-start space-y-1.5 max-w-[200px]">
              <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl rounded-bl-none flex items-center space-x-1.5">
                <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold px-2">Verifying vector source nodes...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Message Input Panel */}
      <div className="mt-auto pt-4 border-t border-slate-900 bg-slate-950">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center bg-slate-900 border border-slate-800 focus-within:border-indigo-600 rounded-2xl px-4 py-2 transition"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask a business analyst question (e.g. Which region led in Q1 sales?)..."
            className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-500 py-2 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white rounded-xl disabled:text-slate-600 transition"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>

      {/* Source Detail Modal */}
      {activeSource && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">{activeSource.document_name}</h3>
              </div>
              <button 
                onClick={() => setActiveSource(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800/60 pb-2">
                <span>Section: {activeSource.section}</span>
                <span>Page {activeSource.page_number}</span>
              </div>
              <div className="text-slate-300 text-xs leading-relaxed font-mono whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                {activeSource.content}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-t border-slate-800/60 text-slate-500 text-[10px]">
              <span>Document Type: {activeSource.document_type}</span>
              <button 
                onClick={() => setActiveSource(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
