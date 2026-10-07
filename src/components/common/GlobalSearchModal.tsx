import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Search, X, FileText, MessageSquare, Layers, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Note, Document, Chat, Flashcard } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { setActiveTab, setActiveChatId } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    notes: Note[];
    documents: Document[];
    chats: Chat[];
    flashcards: Flashcard[];
  }>({ notes: [], documents: [], chats: [], flashcards: [] });

  useEffect(() => {
    if (!query.trim()) {
      setResults({ notes: [], documents: [], chats: [], flashcards: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.globalSearch(query);
        setResults(res.results);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (tab: any, chatId?: string) => {
    if (chatId) setActiveChatId(chatId);
    setActiveTab(tab);
    onClose();
  };

  const hasResults =
    results.notes.length > 0 ||
    results.documents.length > 0 ||
    results.chats.length > 0 ||
    results.flashcards.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
          <Search className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes, documents, chats, flashcards... (Cmd+K)"
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none"
            autoFocus
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">ESC</span>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="text-center py-8 text-slate-500 text-sm">
              Type to search across your notes, uploaded documents, AI tutor chats, and study flashcards.
            </div>
          )}

          {query && !loading && !hasResults && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              No matching resources found for &quot;<span className="text-purple-600 dark:text-purple-400 font-medium">{query}</span>&quot;
            </div>
          )}

          {/* Notes */}
          {results.notes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Notes
              </div>
              <div className="space-y-1">
                {results.notes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => navigateTo('notes')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-purple-500/30 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-300">{note.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{note.summary}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {results.documents.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Documents
              </div>
              <div className="space-y-1">
                {results.documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => navigateTo('documents')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-300">{doc.fileName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{doc.fileType} • {(doc.fileSize / 1024).toFixed(1)} KB</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chats */}
          {results.chats.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> AI Tutor Chats
              </div>
              <div className="space-y-1">
                {results.chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => navigateTo('tutor', chat.id)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-pink-500/30 transition-all flex items-center justify-between group"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-pink-600 dark:group-hover:text-pink-300">{chat.title}</div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flashcards */}
          {results.flashcards.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Flashcards
              </div>
              <div className="space-y-1">
                {results.flashcards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => navigateTo('flashcards')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-300">{card.front}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{card.back}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between items-center">
          <span>Study Sniper AI Global Index</span>
          <button onClick={onClose} className="hover:text-slate-900 dark:hover:text-slate-300">Close</button>
        </div>
      </div>
    </div>
  );
};
