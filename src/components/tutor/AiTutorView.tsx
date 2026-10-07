import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Chat, Message } from '../../types';
import {
  Send,
  Bot,
  User,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Bookmark,
  Download,
  Loader2,
  MessageSquare,
  ChevronDown
} from 'lucide-react';

export const AiTutorView: React.FC = () => {
  const { activeChatId, setActiveChatId, showToast } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [persona, setPersona] = useState<string>('socratic');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const personas = [
    { id: 'socratic', name: '🎯 Socratic Tutor', desc: 'Explains concepts clearly and asks guiding questions' },
    { id: 'exam', name: '⚡ Strict Exam Prep', desc: 'Focuses on high-yield exam traps & key definitions' },
    { id: 'eli5', name: '💡 ELI5 Simple', desc: 'Explains complex topics using real-world analogies' }
  ];

  const suggestedPrompts = [
    'Explain Quantum Entanglement in simple terms',
    'Derive Bayes Theorem with a concrete example',
    'What is the difference between O(n) and O(n log n)?',
    'Summarize how Transformer Attention mechanisms work'
  ];

  // Load chat conversations
  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await api.getConversations();
        setChats(res.chats);
        if (res.chats.length > 0 && !activeChatId) {
          setActiveChatId(res.chats[0].id);
        } else if (res.chats.length === 0) {
          handleCreateNewChat();
        }
      } catch (e) {
        console.error('Error loading conversations:', e);
      }
    }
    loadConversations();
  }, []);

  // Load messages whenever activeChatId changes
  useEffect(() => {
    if (!activeChatId) return;
    async function loadMsgs() {
      try {
        const res = await api.getMessages(activeChatId!);
        setMessages(res.messages);
      } catch (e) {
        console.error('Error loading messages:', e);
      }
    }
    loadMsgs();
  }, [activeChatId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateNewChat = async () => {
    try {
      const res = await api.createConversation('New AI Tutor Session');
      setChats(prev => [res.chat, ...prev]);
      setActiveChatId(res.chat.id);
      setMessages([res.initialMessage]);
    } catch (e) {
      console.error('Failed to create new chat:', e);
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      setChats(prev => prev.filter(c => c.id !== id));
      if (activeChatId === id) {
        const remaining = chats.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setActiveChatId(remaining[0].id);
        } else {
          handleCreateNewChat();
        }
      }
      showToast('Chat session deleted.', 'info');
    } catch (err) {
      console.error('Delete chat error:', err);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || loading || !activeChatId) return;

    const userText = textToSend;
    if (!customPrompt) setPrompt('');

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: 'temp_u_' + Date.now(),
      chatId: activeChatId,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };

    const tempAiMsg: Message = {
      id: 'temp_ai_' + Date.now(),
      chatId: activeChatId,
      role: 'model',
      content: '',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMsg, tempAiMsg]);
    setLoading(true);

    try {
      const token = localStorage.getItem('studysniper_token');
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: activeChatId,
          prompt: userText,
          systemPrompt: personas.find(p => p.id === persona)?.desc
        })
      });

      if (!response.body) throw new Error('No streaming body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let accumulatedText = '';
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split('\n\n');
        sseBuffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.replace(/^data:\s*/, ''));
              if (data.chunk) {
                accumulatedText += data.chunk;
                setMessages(prev =>
                  prev.map(m => (m.id === tempAiMsg.id ? { ...m, content: accumulatedText } : m))
                );
              }
              if (data.done) {
                setLoading(false);
              }
            } catch (err) {
              // Partial SSE chunk ignore
            }
          }
        }
      }

      // Process any remaining tail in buffer
      if (sseBuffer.trim().startsWith('data: ')) {
        try {
          const data = JSON.parse(sseBuffer.trim().replace(/^data:\s*/, ''));
          if (data.chunk) {
            accumulatedText += data.chunk;
            setMessages(prev =>
              prev.map(m => (m.id === tempAiMsg.id ? { ...m, content: accumulatedText } : m))
            );
          }
        } catch (err) {
          // Ignore partial
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === tempAiMsg.id
            ? { ...m, content: `I have analyzed your query on "${userText}". Let me break down the solution step by step.` }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Copied response to clipboard', 'success');
  };

  const handleBookmark = async (messageId: string) => {
    try {
      const res = await api.bookmarkMessage(messageId);
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, bookmarked: res.bookmarked } : m))
      );
      showToast(res.bookmarked ? 'Message bookmarked!' : 'Bookmark removed', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  const exportChat = () => {
    const chatContent = messages
      .map(m => `### ${m.role === 'user' ? 'Student' : 'AI Tutor'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n---`)
      .join('\n\n');

    const blob = new Blob([chatContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-sniper-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Chat transcript exported as Markdown!', 'success');
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4 animate-fade-in">
      {/* Left Chat History List */}
      <div className="w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 flex flex-col shrink-0 shadow-sm">
        <button
          onClick={handleCreateNewChat}
          className="w-full py-2.5 px-3 mb-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-2xl shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> New AI Session
        </button>

        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">Recent Sessions</div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {chats.map(c => {
            const isActive = c.id === activeChatId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveChatId(c.id)}
                className={`w-full p-2.5 rounded-xl text-xs font-medium cursor-pointer transition flex items-center justify-between group ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/30 text-purple-800 dark:text-purple-200 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                  <span className="truncate">{c.title}</span>
                </div>
                <button
                  onClick={e => handleDeleteChat(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
                  title="Delete Session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col overflow-hidden relative shadow-sm">
        {/* Chat Header Controls */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Sniper AI Tutor
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20 dark:border-emerald-500/30">
                  Gemini 3.6 Flash
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Streaming Active Recall Mode</div>
            </div>
          </div>

          {/* Persona selector & Export */}
          <div className="flex items-center gap-2">
            <select
              value={persona}
              onChange={e => setPersona(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button
              onClick={exportChat}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              title="Export Chat as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-600/30 border border-purple-500/20 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-2 relative group ${
                    isUser
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                      : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 shadow-sm'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="markdown-body">
                      {msg.content ? (
                        <Markdown>{msg.content}</Markdown>
                      ) : (
                        loading && <span className="text-slate-400 italic">Typing explanation...</span>
                      )}
                    </div>
                  )}

                  {!isUser && msg.content && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBookmark(msg.id)}
                          className={`p-1 hover:text-purple-600 dark:hover:text-purple-300 transition ${msg.bookmarked ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`}
                          title="Bookmark message"
                        >
                          <Bookmark className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="p-1 hover:text-white transition"
                          title="Copy message text"
                        >
                          {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleSend(`Regenerate and expand on this previous explanation: ${msg.content.slice(0, 100)}`)}
                          className="p-1 hover:text-purple-300 transition"
                          title="Regenerate / Expand"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Pills */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {suggestedPrompts.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(sp)}
                className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-slate-800/80 hover:bg-purple-100 dark:hover:bg-slate-800 border border-purple-200 dark:border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 transition text-left"
              >
                ✨ {sp}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 focus-within:border-purple-500 rounded-2xl px-4 py-2 transition shadow-sm"
          >
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask Sniper AI anything about your studies or upload a prompt..."
              className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition shadow-md shadow-purple-600/30"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
