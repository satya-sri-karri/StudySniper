import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Target,
  Sparkles,
  Bot,
  FileText,
  Layers,
  HelpCircle,
  Calendar,
  UploadCloud,
  Code2,
  Check,
  ChevronDown,
  ArrowRight,
  Zap,
  ShieldCheck,
  BrainCircuit,
  GraduationCap,
  Star,
  Flame,
  Lock,
  CheckCircle2,
  Play
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setAuthModalOpen, setAuthModalMode } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'tutor' | 'quiz' | 'flashcards' | 'documents'>('tutor');

  const openAuth = (mode: 'login' | 'signup' | 'verify_otp' | 'forgot' | 'reset_password') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const features = [
    {
      icon: Bot,
      color: 'from-indigo-500 via-purple-500 to-pink-500',
      title: '24/7 AI Master Tutor',
      desc: 'Real-time streaming academic conversations powered by Gemini 2.5 Flash. Asks adaptive follow-up recall questions for active conceptual mastery.'
    },
    {
      icon: UploadCloud,
      color: 'from-cyan-500 via-blue-500 to-indigo-500',
      title: 'Smart Document QA & Parsing',
      desc: 'Upload PDFs, DOCX, PPTX, or TXT files up to 50MB. Extract key topics, generate instant executive summaries, and query page references.'
    },
    {
      icon: HelpCircle,
      color: 'from-amber-400 via-orange-500 to-rose-500',
      title: 'AI Exam Quiz Sniper',
      desc: 'Generate MCQs, True/False, Fill-in-the-blanks, and Short Answers with difficulty parameters, active timers, and instant step-by-step explanations.'
    },
    {
      icon: Layers,
      color: 'from-purple-500 via-pink-500 to-rose-500',
      title: 'Spaced-Repetition Flashcards',
      desc: '3D animated flip cards with intelligent SM-2 memory intervals (Easy, Good, Hard, Again) to retain formulas and key concepts 3x longer.'
    },
    {
      icon: Calendar,
      color: 'from-emerald-400 via-teal-500 to-cyan-500',
      title: 'Milestone Study Planner',
      desc: 'Input exam target dates, subjects, and daily hours to auto-generate day-by-day study timetables with real-time milestone checklists.'
    },
    {
      icon: Code2,
      color: 'from-violet-500 via-indigo-500 to-blue-600',
      title: 'Multi-Language Code Lab',
      desc: 'Line-by-line algorithm walkthroughs, automatic bug debugging, Big-O space/time optimization, and syntax practice generators.'
    }
  ];

  const faqs = [
    {
      q: 'How does Study Sniper AI compare to standard ChatGPT or Claude?',
      a: 'Study Sniper AI is specifically engineered for active academic learning. It doesn’t just output static text — it creates interactive quizzes, 3D flashcards with SM-2 memory intervals, day-by-day study timetables, and grounds answers directly in your uploaded textbook documents.'
    },
    {
      q: 'Is email verification required for accounts?',
      a: 'Yes, Study Sniper AI enforces mandatory 6-digit OTP email verification for enterprise security, preventing spam and protecting user study data with short-lived JWT session tokens.'
    },
    {
      q: 'Which document formats are supported?',
      a: 'We support PDF, DOCX, PPTX, and TXT files up to 50MB. Content is automatically parsed and indexed for document QA, note generation, and flashcard creation.'
    },
    {
      q: 'Can I export my study plans and notes for offline revision?',
      a: 'Absolutely! All generated notes, summaries, and flashcards can be exported as printable PDF documents or JSON data.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Header Navigation Bar */}
      <header className="sticky top-0 z-30 h-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
              Study Sniper <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">AI</span>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Precision Academic SaaS</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openAuth('login')}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Sign In
          </button>
          <button
            onClick={() => openAuth('signup')}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 rounded-xl shadow-lg shadow-purple-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            Get Started Free
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 lg:px-12 text-center max-w-6xl mx-auto overflow-hidden">
        {/* Soft Pastel Background Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/15 to-cyan-500/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/30 text-xs font-semibold text-purple-300 mb-6 shadow-md backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" /> Powered by Gemini 2.5 Flash & Enterprise Security
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight mb-6">
          Ace Any Exam with <br />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            Precision AI Active Learning
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 mb-10 leading-relaxed">
          The all-in-one academic intelligence engine. Stream live tutor answers, generate instant exam quizzes & 3D flashcards, parse textbook documents, and master complex code effortlessly.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => openAuth('signup')}
            className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            Launch Study Sniper AI Free <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => openAuth('login')}
            className="w-full sm:w-auto px-8 py-4 text-sm font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-2xl backdrop-blur-md transition cursor-pointer"
          >
            Explore Verified Dashboard
          </button>
        </div>

        {/* Live Interactive SaaS Glassmorphic Preview */}
        <div className="relative rounded-3xl border border-purple-500/30 bg-slate-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-4 px-2 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-[11px] font-mono text-purple-300">
              studysniper.ai/dashboard/active-learning
            </div>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
              <Zap className="w-3 h-3" /> Live Verified Session
            </span>
          </div>

          {/* Tab Navigation in Preview */}
          <div className="flex border-b border-slate-800/80 my-3 gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('tutor')}
              className={`px-3 py-2 font-semibold rounded-lg transition ${
                activeTab === 'tutor' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              🤖 AI Master Tutor
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-2 font-semibold rounded-lg transition ${
                activeTab === 'quiz' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              🎯 Quiz Generator
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-3 py-2 font-semibold rounded-lg transition ${
                activeTab === 'flashcards' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              🃏 SM-2 Flashcards
            </button>
          </div>

          {/* Interactive Preview Content */}
          <div className="pt-2 text-left">
            {activeTab === 'tutor' && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5"><Bot className="w-4 h-4" /> AI Tutor Response</span>
                  <span className="text-[10px] text-slate-500 font-mono">Gemini 2.5 Flash</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-100 leading-relaxed">
                  <p className="font-semibold text-purple-300 mb-1">“Explain the Carnot Engine Efficiency equation mathematically.”</p>
                  Carnot Efficiency is defined as <code className="bg-purple-900/60 px-1.5 py-0.5 rounded text-amber-300">η = 1 - (Tc / Th)</code>, where <i>Tc</i> is the cold reservoir temperature and <i>Th</i> is the hot reservoir temperature in Kelvin.
                </div>
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><HelpCircle className="w-4 h-4" /> Exam Question #1</div>
                <div className="text-xs text-slate-200 font-medium">Which thermodynamic process operates at constant volume?</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">A. Isothermal</div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-semibold">✓ B. Isochoric Process (Correct)</div>
                </div>
              </div>
            )}

            {activeTab === 'flashcards' && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center space-y-3">
                <div className="text-xs font-bold text-pink-400 flex items-center justify-center gap-1.5"><Layers className="w-4 h-4" /> Spaced Repetition Card</div>
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-purple-950/50 to-slate-900 border border-purple-500/30 max-w-sm mx-auto">
                  <div className="text-[10px] text-purple-300 uppercase font-mono tracking-wider mb-1">Organic Chemistry Deck</div>
                  <div className="text-sm font-bold text-white mb-3">What is the product of an alkene hydrogenation reaction?</div>
                  <div className="text-xs text-cyan-300 font-medium p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30">An Alkanes (Saturated Hydrocarbon)</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 lg:px-12 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Designed for High-Yield Academic Results
            </h2>
            <p className="text-slate-400 text-sm">
              Modular study components styled with soft glass depth and responsive interfaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 group backdrop-blur-md shadow-xl"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${f.color} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 px-6 lg:px-12 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-5 text-left font-semibold text-sm text-slate-200 flex justify-between items-center"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 px-6 lg:px-12 border-t border-slate-800 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-slate-300">Study Sniper AI</span>
            <span>© 2026. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-slate-300 transition">Features</a>
            <button onClick={() => openAuth('login')} className="hover:text-slate-300 transition">Sign In</button>
            <button onClick={() => openAuth('signup')} className="hover:text-slate-300 transition">Sign Up</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
