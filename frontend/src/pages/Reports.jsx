import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  Upload, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Database,
  ArrowUpRight
} from 'lucide-react';
import { fetchDocuments, uploadDocument, rebuildIndex } from '../services/api';

export default function Reports() {
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState(null);
  const [statusInterval, setStatusInterval] = useState(null);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const res = await fetchDocuments();
      setDocs(res.documents || []);
    } catch (err) {
      console.error(err);
      setError('Could not query database for file listing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
    
    // Poll document statuses every 5 seconds to track background indexing progress
    const interval = setInterval(async () => {
      try {
        const res = await fetchDocuments();
        setDocs(res.documents || []);
      } catch (e) {
        console.error("Polling docs error", e);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      alert('Only PDF documents are supported for RAG indexing.');
      return;
    }

    setUploading(true);
    setUploadProgress('Uploading file to backend...');
    
    try {
      await uploadDocument(file);
      setUploadProgress('File stored. Indexing document vectors in background...');
      setTimeout(() => {
        setUploading(false);
        setUploadProgress('');
        loadDocs();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to complete document upload.');
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleRebuild = async () => {
    if (window.confirm('This will wipe the current vector store and index all local PDF documents from scratch. Proceed?')) {
      try {
        setUploading(true);
        setUploadProgress('Wiping and rebuilding embedding database...');
        await rebuildIndex();
        setTimeout(() => {
          setUploading(false);
          setUploadProgress('');
          loadDocs();
        }, 3000);
      } catch (err) {
        alert('Rebuilding failed.');
        setUploading(false);
      }
    }
  };

  const filteredDocs = docs.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-indigo-400" />
            Document Reports Library
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Upload internal PDF reports and track their vector embedding status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRebuild}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Rebuild Index
          </button>
          
          <label className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition cursor-pointer">
            <Upload className="h-4 w-4" />
            Upload PDF
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileUpload} 
              className="hidden" 
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Uploading Status Overlay */}
      {uploading && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between text-indigo-300 text-xs animate-pulse">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>{uploadProgress}</span>
          </div>
        </div>
      )}

      {/* Search and Table Grid */}
      <div className="glass-panel rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
            <input 
              type="text"
              placeholder="Search documents by name or filetype..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-600 text-xs rounded-lg pl-10 pr-4 py-2.5 text-slate-200 outline-none placeholder-slate-500"
            />
          </div>
        </div>

        {/* Database Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Checking files registry...
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Document Title</th>
                  <th className="px-6 py-4">Format</th>
                  <th className="px-6 py-4 text-center">Page Count</th>
                  <th className="px-6 py-4">Indexing Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/40">
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-semibold text-slate-100">{doc.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400 text-[10px]">{doc.type}</td>
                    <td className="px-6 py-4 text-center">{doc.pages}</td>
                    <td className="px-6 py-4 text-slate-400 text-[11px]">{doc.upload_date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        doc.status === 'Indexed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : doc.status.startsWith('Failed')
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                      }`}>
                        {doc.status === 'Indexed' && <CheckCircle className="h-3 w-3" />}
                        {doc.status.startsWith('Failed') && <AlertCircle className="h-3 w-3" />}
                        {doc.status !== 'Indexed' && !doc.status.startsWith('Failed') && <RefreshCw className="h-3 w-3 animate-spin" />}
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-16 text-slate-500">
                      No documents matching filter constraints found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
