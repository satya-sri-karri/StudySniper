import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Note } from '../../types';
import {
  FileText,
  Sparkles,
  Printer,
  Trash2,
  Plus,
  Tag,
  BookOpen,
  Loader2,
  Copy,
  Check,
  Download
} from 'lucide-react';

export const NotesView: React.FC = () => {
  const { showToast } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Note Generator State
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [rawContent, setRawContent] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    try {
      const res = await api.getNotes();
      setNotes(res.notes);
      if (res.notes.length > 0) {
        setSelectedNote(res.notes[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateNote = async () => {
    if (!topic.trim() || !rawContent.trim() || generating) return;
    setGenerating(true);

    try {
      const res = await api.generateNote({
        topic,
        subject,
        rawContent
      });

      setNotes(prev => [res.note, ...prev]);
      setSelectedNote(res.note);
      showToast('AI Note summary generated!', 'success');
      setTopic('');
      setRawContent('');
    } catch (e) {
      showToast('Failed to generate note.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        const remaining = notes.filter(n => n.id !== id);
        setSelectedNote(remaining.length > 0 ? remaining[0] : null);
      }
      showToast('Note deleted.', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintPdf = () => {
    if (!selectedNote) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedNote.title} - Study Sniper AI Note</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            h1 { color: #6366f1; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .section { margin-bottom: 24px; }
            .section-title { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #64748b; margin-bottom: 8px; }
            .summary { background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px; border-radius: 4px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 6px; }
            .def { background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; }
            .formula { font-family: monospace; background: #0f172a; color: #38bdf8; padding: 10px; border-radius: 6px; }
          </style>
        </head>
        <body>
          <h1>${selectedNote.title}</h1>
          <p><strong>Subject:</strong> ${selectedNote.subject} | <strong>Date:</strong> ${new Date(selectedNote.createdAt).toLocaleDateString()}</p>
          
          <div class="section">
            <div class="section-title">Executive Summary</div>
            <div class="summary">${selectedNote.summary}</div>
          </div>

          <div class="section">
            <div class="section-title">Key Points</div>
            <ul>
              ${selectedNote.keyPoints.map(kp => `<li>${kp}</li>`).join('')}
            </ul>
          </div>

          ${selectedNote.definitions.length > 0 ? `
            <div class="section">
              <div class="section-title">Core Definitions</div>
              ${selectedNote.definitions.map(d => `<div class="def"><strong>${d.term}:</strong> ${d.definition}</div>`).join('')}
            </div>
          ` : ''}

          ${selectedNote.formulas.length > 0 ? `
            <div class="section">
              <div class="section-title">Important Formulas</div>
              ${selectedNote.formulas.map(f => `<div class="formula">${f}</div>`).join('')}
            </div>
          ` : ''}

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-400" /> AI Notes Engine & PDF Exporter
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Paste textbook excerpts or lecture transcripts to generate structured study summaries, definitions, and key formulas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form & Notes List */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Summarize Raw Text
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Note Title / Topic</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Thermodynamics Laws"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 focus:border-purple-500 rounded-xl text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Raw Lecture / Textbook Content</label>
              <textarea
                rows={4}
                value={rawContent}
                onChange={e => setRawContent(e.target.value)}
                placeholder="Paste notes, lecture transcripts, or textbook paragraphs here..."
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 focus:border-purple-500 rounded-xl text-slate-100 text-xs focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleGenerateNote}
              disabled={generating || !topic.trim() || !rawContent.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate AI Note Summary'}
            </button>
          </div>

          {/* Saved Notes List */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Saved Notes ({notes.length})</div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {notes.map(n => (
                <div
                  key={n.id}
                  onClick={() => setSelectedNote(n)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition flex items-center justify-between group ${
                    selectedNote?.id === n.id
                      ? 'bg-purple-600/20 border-purple-500/40 text-purple-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-slate-200 truncate">{n.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{n.summary}</div>
                  </div>
                  <button
                    onClick={e => handleDeleteNote(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Note View (2 cols) */}
        <div className="lg:col-span-2">
          {selectedNote ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {selectedNote.subject}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{selectedNote.title}</h2>
                  <div className="text-xs text-slate-400 mt-0.5">Created on {new Date(selectedNote.createdAt).toLocaleDateString()}</div>
                </div>

                <button
                  onClick={handlePrintPdf}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-purple-600/30 transition"
                >
                  <Printer className="w-4 h-4" /> Export as Printable PDF
                </button>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30">
                <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" /> Summary
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">{selectedNote.summary}</div>
              </div>

              {/* Key Points */}
              {selectedNote.keyPoints.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Bullet Takeaways</div>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {selectedNote.keyPoints.map((kp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold">•</span>
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Definitions */}
              {selectedNote.definitions.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Definitions</div>
                  <div className="space-y-2">
                    {selectedNote.definitions.map((def, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-xs">
                        <strong className="text-purple-300">{def.term}:</strong>{' '}
                        <span className="text-slate-300">{def.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulas */}
              {selectedNote.formulas.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Important Formulas</div>
                  <div className="space-y-1.5 font-mono text-xs text-cyan-300">
                    {selectedNote.formulas.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-3xl">
              Select or generate a note summary to view detailed breakdowns and export to PDF.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
