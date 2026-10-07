import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DashboardStats, WeeklyProgressItem } from '../../types';
import {
  Flame,
  Clock,
  HelpCircle,
  Layers,
  FileText,
  MessageSquare,
  Bot,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Award,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DashboardOverview: React.FC = () => {
  const { user, setActiveTab } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.getStats();
        setStats(res.stats);
        setWeeklyProgress(res.weeklyProgress || []);
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 border border-purple-500/30 p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Ready to Study
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">{user?.name || 'Sniper Learner'}</span> 🎯
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              You&apos;re on a <strong className="text-amber-400">{stats?.streakDays ?? 1}-Day Streak</strong>! Review today&apos;s flashcards or generate a quick quiz to stay ahead of your exam targets.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('tutor')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition"
            >
              <Bot className="w-4 h-4" /> Start AI Chat
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" /> New Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Stats Widgets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-amber-500/40 transition-all group shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Study Streak</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <Flame className="w-4 h-4 fill-amber-500 dark:fill-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {user?.streakDays ?? stats?.streakDays ?? 1} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Days</span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> Active calendar day streak
          </div>
        </div>

        {/* Hours Studied */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-purple-500/40 transition-all group shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Hours Studied</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats?.hoursStudied ?? 0} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">hrs</span></div>
          <div className="text-[11px] text-purple-700 dark:text-purple-300 mt-1 font-medium">
            Goal: 20 hrs / week
          </div>
        </div>

        {/* Quizzes Completed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-blue-500/40 transition-all group shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed Quizzes</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats?.completedQuizzesCount ?? 0}</div>
          <div className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 font-medium">
            Avg Score: <strong className="text-emerald-600 dark:text-emerald-400">{stats?.averageQuizScore ?? 0}%</strong>
          </div>
        </div>

        {/* Flashcards Mastered */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-pink-500/40 transition-all group shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cards Reviewed</span>
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats?.flashcardsReviewedCount ?? 0}</div>
          <div className="text-[11px] text-pink-700 dark:text-pink-300 mt-1 font-medium">
            Spaced repetition SM-2
          </div>
        </div>
      </div>

      {/* Main Charts & Quick Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Progress Bar Chart (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Weekly Study Activity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hours spent studying across the last 7 days</p>
            </div>
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-2.5 py-1 rounded-lg">
              This Week
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {weeklyProgress.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#6366f1',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="hoursStudied" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Hours Studied" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading weekly metrics...
              </div>
            )}
          </div>
        </div>

        {/* Quick Launchpad Sidebar */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Precision Shortcuts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Jump straight to your learning tools.</p>

            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('tutor')}
                className="w-full text-left p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-purple-500/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-300">Ask AI Tutor</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Streaming concept explanations</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
              </button>

              <button
                onClick={() => setActiveTab('documents')}
                className="w-full text-left p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-300">Upload PDF / DOCX</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Instant document QA & summaries</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                className="w-full text-left p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-pink-500/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-300 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-pink-600 dark:group-hover:text-pink-300">3D Flashcards</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Review spaced-repetition cards</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400" />
              </button>

              <button
                onClick={() => setActiveTab('planner')}
                className="w-full text-left p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-300">Study Planner</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">AI day-by-day exam schedule</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
              </button>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/20 text-xs text-purple-800 dark:text-purple-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>Target Exam: <strong>{user?.targetExam || 'MCAT / Final Exams'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
