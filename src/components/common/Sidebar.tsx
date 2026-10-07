import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { TabType } from '../../types';
import {
  LayoutDashboard,
  Bot,
  FileText,
  Layers,
  HelpCircle,
  Calendar,
  UploadCloud,
  Code2,
  Settings,
  Sparkles,
  Target,
  Flame,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab, user } = useAuth();

  const navItems: { id: TabType; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tutor', label: 'AI Tutor', icon: Bot, badge: 'Stream' },
    { id: 'notes', label: 'My Notes', icon: FileText },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz', label: 'Quiz Generator', icon: HelpCircle },
    { id: 'planner', label: 'Study Planner', icon: Calendar },
    { id: 'documents', label: 'Upload Documents', icon: UploadCloud },
    { id: 'coding', label: 'Coding Assistant', icon: Code2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                  Study Sniper <span className="text-xs font-semibold px-1.5 py-0.2 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 dark:border-purple-500/30">AI</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">PRECISION LEARNING</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/15 to-indigo-600/10 dark:from-purple-600/20 dark:to-indigo-600/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded border border-purple-500/20 dark:border-purple-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Banner */}
        <div className="p-3 space-y-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50">
          {user && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <Flame className="w-4 h-4 fill-amber-500 dark:fill-amber-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.streakDays ?? 1} Day Streak</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Daily Active Learning</div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-900/40 dark:via-slate-900 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-500/30">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Sniper Pro Engine
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Powered by Gemini 3.6 Flash for instant AI streaming & PDF analysis.
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
