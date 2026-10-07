import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Document } from '../../types';
import { parseDocumentFile } from '../../utils/documentParser';
import {
  UploadCloud,
  FileText,
  File,
  Trash2,
  HelpCircle,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  Loader2,
  X,
  MessageSquare,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { showToast } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ask question modal state
  const [question, setQuestion] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [qaPairs, setQaPairs] = useState<{ q: string; a: string }[]>([]);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents);
      if (res.documents.length > 0) {
        setSelectedDoc(res.documents[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (fileName: string, fileType: string, textContent: string, size?: number) => {
    setUploading(true);
    try {
      const res = await api.uploadDocument({
        fileName,
        fileType,
        fileSize: size || textContent.length,
        textContent
      });
      setDocuments(prev => [res.document, ...prev]);
      setSelectedDoc(res.document);
      showToast(`Uploaded and indexed ${fileName}`, 'success');
    } catch (e) {
      showToast('Failed to process document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    let count = 0;
    try {
      for (const file of fileArray) {
        const parsed = await parseDocumentFile(file);
        const res = await api.uploadDocument({
          fileName: parsed.fileName,
          fileType: parsed.fileType,
          fileSize: parsed.fileSize,
          textContent: parsed.textContent
        });
        setDocuments(prev => [res.document, ...prev.filter(d => d.id !== res.document.id)]);
        setSelectedDoc(res.document);
        count++;
      }
      if (count === 1) {
        showToast(`Uploaded and indexed ${fileArray[0].name}`, 'success');
      } else {
        showToast(`Successfully uploaded ${count} documents`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to parse or upload document.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const loadSampleDoc = (title: string, content: string) => {
    handleFileUpload(title, 'PDF', content);
  };

  const handleAskQuestion = async () => {
    if (!selectedDoc || !question.trim() || askLoading) return;
    const currentQ = question;
    setQuestion('');
    setAskLoading(true);

    try {
      const res = await api.askDocument(selectedDoc.id, currentQ);
      setQaPairs(prev => [...prev, { q: currentQ, a: res.answer }]);
    } catch (e) {
      showToast('Failed to answer document question.', 'error');
    } finally {
      setAskLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selectedDoc?.id === id) {
        const remaining = documents.filter(d => d.id !== id);
        setSelectedDoc(remaining.length > 0 ? remaining[0] : null);
      }
      showToast('Document removed.', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-blue-400" /> Upload Documents & Smart QA
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload PDF, DOCX, PPTX, or TXT files to generate summaries and ask Gemini questions.
          </p>
        </div>

        {/* Action & Upload Buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Upload Document
          </button>
          <button
            onClick={() =>
              loadSampleDoc(
                'Quantum_Physics_Ch4.pdf',
                'Quantum mechanics describes the fundamental physical properties of nature at the scale of atoms and subatomic particles. Wave-particle duality states that matter exhibits both wave-like and particle-like behaviors. Schrödinger Equation governing wavefunction evolution: iħ ∂/∂t Ψ = ĤΨ.'
              )
            }
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-300 border border-slate-700 transition"
          >
            + Sample PDF
          </button>
          <button
            onClick={() =>
              loadSampleDoc(
                'Algorithms_Notes.docx',
                'Dynamic Programming (DP) is an algorithmic optimization technique that breaks down complex problems into overlapping subproblems, storing results in a lookup table. Time complexity of 0/1 Knapsack using DP is O(n*W).'
              )
            }
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-purple-300 border border-slate-700 transition"
          >
            + Sample DOCX
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,.json,.js,.py,.c,.cpp,.html,.css"
        multiple
        className="hidden"
      />

      {/* Drag & Drop Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-8 rounded-3xl border-2 border-dashed transition text-center flex flex-col items-center justify-center gap-3 cursor-pointer group ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-800 bg-slate-900/60 hover:border-blue-500/50 hover:bg-slate-900/90'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-200">
            {uploading ? 'Processing & Indexing File...' : 'Drag and drop your document here, or '}
            {!uploading && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="text-blue-400 underline hover:text-blue-300 transition"
              >
                browse files
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, PPTX, TXT, MD, CSV & Code (Up to 50MB)</div>
        </div>
      </div>

      {/* Document Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List (1 col) */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
            <span>Stored Documents ({documents.length})</span>
            <span className="text-[10px] text-blue-400 font-normal">Indexed</span>
          </div>

          {documents.map(doc => {
            const isActive = selectedDoc?.id === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDoc(doc);
                  setQaPairs([]);
                }}
                className={`p-3 rounded-2xl border text-xs cursor-pointer transition flex items-center justify-between group ${
                  isActive
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-200 shadow-md'
                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-slate-200 truncate">{doc.fileName}</div>
                    <div className="text-[10px] text-slate-400">{doc.fileType} • {(doc.fileSize / 1024).toFixed(1)} KB</div>
                  </div>
                </div>

                <button
                  onClick={e => handleDelete(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                  title="Delete Document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Selected Document Detail & QA (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {selectedDoc ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              {/* Doc Title & Meta */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {selectedDoc.fileType}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{selectedDoc.fileName}</h2>
                  <div className="text-xs text-slate-400 mt-0.5">Uploaded on {new Date(selectedDoc.uploadedAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Summary Card */}
              {selectedDoc.summary && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30">
                  <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-400" /> AI Executive Summary
                  </div>
                  <div className="markdown-body text-xs text-slate-300">
                    <Markdown>{selectedDoc.summary}</Markdown>
                  </div>
                </div>
              )}

              {/* Extracted Text Content Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {selectedDoc.fileType === 'PPTX' || selectedDoc.fileType === 'PPT' ? 'Extracted Slide Content' : 'Parsed Document Text'}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {selectedDoc.extractedText.length.toLocaleString()} characters
                  </span>
                </div>

                {selectedDoc.extractedText.includes('[Slide ') ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {selectedDoc.extractedText
                      .split(/\[Slide\s+(\d+)\]/g)
                      .filter(Boolean)
                      .reduce<{ num: string; text: string }[]>((acc, curr, idx, arr) => {
                        if (idx % 2 === 0 && !isNaN(Number(curr))) {
                          acc.push({ num: curr, text: arr[idx + 1] || '' });
                        }
                        return acc;
                      }, [])
                      .map((slide, sIdx) => (
                        <div key={sIdx} className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                              Slide {slide.num}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap pt-1">
                            {slide.text.trim()}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed max-h-52 overflow-y-auto font-mono whitespace-pre-wrap">
                    {selectedDoc.extractedText}
                  </div>
                )}
              </div>

              {/* Document QA Section */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" /> Ask Questions About This Document
                </h3>

                {qaPairs.length > 0 && (
                  <div className="space-y-3">
                    {qaPairs.map((pair, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-2 text-xs">
                        <div className="font-semibold text-purple-300">Q: {pair.q}</div>
                        <div className="markdown-body text-slate-300 text-xs">
                          <Markdown>{pair.a}</Markdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                    placeholder="e.g. What is the core formula mentioned in this document?"
                    className="flex-1 px-4 py-2.5 bg-slate-800/80 border border-slate-700/60 focus:border-blue-500 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={askLoading || !question.trim()}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition disabled:opacity-40"
                  >
                    {askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask AI'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs">
              Select or upload a document to view summaries and start asking questions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
