import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StudyPlan } from '../../types';
import {
  Calendar,
  Sparkles,
  CheckSquare,
  Square,
  Clock,
  Award,
  Trash2,
  Plus,
  Loader2,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export const StudyPlannerView: React.FC = () => {
  const { showToast } = useAuth();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form input state
  const [title, setTitle] = useState('');
  const [subjectInput, setSubjectInput] = useState('Physics, Calculus, CS 101');
  const [examDate, setExamDate] = useState('2026-08-30');
  const [dailyHours, setDailyHours] = useState(3);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const res = await api.getStudyPlans();
      setPlans(res.studyPlans);
      if (res.studyPlans.length > 0) {
        setActivePlan(res.studyPlans[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleGeneratePlan = async () => {
    const subjects = subjectInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (subjects.length === 0 || generating) return;
    setGenerating(true);

    try {
      const res = await api.generateStudyPlan({
        title: title || `${subjects.join(' & ')} Exam Plan`,
        subjects,
        examDate,
        dailyHours
      });

      setPlans(prev => [res.studyPlan, ...prev]);
      setActivePlan(res.studyPlan);
      showToast('Personalized study timetable generated!', 'success');
      setTitle('');
    } catch (e) {
      showToast('Failed to generate study plan.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!activePlan) return;
    try {
      const res = await api.toggleStudyTask(activePlan.id, taskId);
      setActivePlan(res.studyPlan);
      setPlans(prev => prev.map(p => (p.id === res.studyPlan.id ? res.studyPlan : p)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteStudyPlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      if (activePlan?.id === id) {
        const remaining = plans.filter(p => p.id !== id);
        setActivePlan(remaining.length > 0 ? remaining[0] : null);
      }
      showToast('Study plan removed.', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  // Progress math
  const completedTasks = activePlan?.tasks.filter(t => t.completed).length || 0;
  const totalTasks = activePlan?.tasks.length || 1;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-400" /> AI Personalized Study Planner
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Input your subjects, target exam date, and daily study hours to construct an optimal study schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form & Plan List Sidebar */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Generate Timetable
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Subjects (Comma Separated)</label>
              <input
                type="text"
                value={subjectInput}
                onChange={e => setSubjectInput(e.target.value)}
                placeholder="Physics, Calculus, History"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/60 focus:border-emerald-500 rounded-xl text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Exam Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-100 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Daily Hrs ({dailyHours}h)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={dailyHours}
                  onChange={e => setDailyHours(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer mt-2"
                />
              </div>
            </div>

            <button
              onClick={handleGeneratePlan}
              disabled={generating || !subjectInput.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Study Plan'}
            </button>
          </div>

          {/* Saved Plans List */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Saved Timetables</div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {plans.map(p => (
                <div
                  key={p.id}
                  onClick={() => setActivePlan(p)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition flex items-center justify-between group ${
                    activePlan?.id === p.id
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-200">{p.title}</div>
                    <div className="text-[10px] text-slate-400">Exam: {p.examDate} • {p.dailyHours}h/day</div>
                  </div>
                  <button
                    onClick={e => handleDeletePlan(p.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timetable Checklist Display (2 cols) */}
        <div className="lg:col-span-2">
          {activePlan ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Exam Target: {activePlan.examDate}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{activePlan.title}</h2>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Subjects: {activePlan.subjects.join(', ')} • Pace: {activePlan.dailyHours} hrs/day
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">{progressPercent}%</div>
                  <div className="text-[10px] text-slate-400">Schedule Completed</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Task Checklist */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Day-by-Day Master Timetable</div>

                <div className="space-y-2">
                  {activePlan.tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        task.completed
                          ? 'bg-slate-800/40 border-slate-800/60 text-slate-500 line-through'
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {task.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-emerald-300 mr-2">{task.day}:</span>
                          <span className="font-semibold text-slate-100 mr-2">[{task.subject}]</span>
                          <span>{task.topic}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-500" /> {task.durationMinutes} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-3xl">
              Generate a study plan to construct your day-by-day exam schedule.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
