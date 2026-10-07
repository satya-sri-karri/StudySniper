import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Code2,
  Sparkles,
  Bug,
  Zap,
  BookOpen,
  Copy,
  Check,
  Loader2,
  Play
} from 'lucide-react';

export const CodingAssistantView: React.FC = () => {
  const { showToast } = useAuth();

  const [language, setLanguage] = useState('python');
  const [action, setAction] = useState<'explain' | 'debug' | 'optimize' | 'examples'>('explain');
  const [code, setCode] = useState(`def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`);

  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const languages = [
    { id: 'python', name: 'Python' },
    { id: 'cpp', name: 'C++' },
    { id: 'java', name: 'Java' },
    { id: 'javascript', name: 'JavaScript' }
  ];

  const actions = [
    { id: 'explain', label: 'Explain Code', icon: BookOpen, desc: 'Line-by-line concept breakdown' },
    { id: 'debug', label: 'Debug & Fix', icon: Bug, desc: 'Locate bugs & edge case failures' },
    { id: 'optimize', label: 'Big-O Optimize', icon: Zap, desc: 'Time & space complexity enhancement' },
    { id: 'examples', label: 'Practice Problems', icon: Sparkles, desc: 'Generate 2 practice exercises' }
  ] as const;

  const handleAnalyze = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);

    try {
      const res = await api.analyzeCode({
        code,
        language,
        action
      });
      setAnalysisResult(res.response);
      showToast(`Completed ${action} analysis!`, 'success');
    } catch (e) {
      showToast('Code analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Analysis copied to clipboard.', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Code2 className="w-6 h-6 text-violet-400" /> Multi-Language Code Lab & Assistant
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Master C++, Java, Python, and JavaScript with line-by-line explanations, bug fixes, and Big-O complexity analysis.
        </p>
      </div>

      {/* Action Tabs & Language Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap gap-2">
          {actions.map(act => {
            const Icon = act.icon;
            const isActive = action === act.id;
            return (
              <button
                key={act.id}
                onClick={() => setAction(act.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 transition ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Language:</span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
          >
            {languages.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Input Area */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Source Code Input</span>
              <span className="text-[10px] text-violet-400 font-mono font-semibold">{language.toUpperCase()}</span>
            </div>

            <textarea
              rows={14}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Paste or write code here..."
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-cyan-300 focus:border-violet-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !code.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Run AI Code {actions.find(a => a.id === action)?.label}
              </>
            )}
          </button>
        </div>

        {/* AI Output Display Area */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-400" /> AI Tutor Code Analysis
              </span>

              {analysisResult && (
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 flex items-center gap-1 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Output'}
                </button>
              )}
            </div>

            {analysisResult ? (
              <div className="markdown-body p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed max-h-96 overflow-y-auto">
                <Markdown>{analysisResult}</Markdown>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 text-xs gap-2">
                <Code2 className="w-8 h-8 text-slate-600" />
                <span>Click &quot;Run AI Code Analysis&quot; to generate explanations, Big-O metrics, or debugged code.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
