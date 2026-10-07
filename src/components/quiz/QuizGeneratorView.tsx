import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Quiz, QuizQuestion } from '../../types';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Award,
  ChevronRight,
  Loader2,
  Trash2,
  Check,
  AlertCircle
} from 'lucide-react';

export const QuizGeneratorView: React.FC = () => {
  const { showToast, updateUser } = useAuth();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);

  // Form parameters
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq', 'true_false']);

  // Active Quiz Playing State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    try {
      const res = await api.getQuizzes();
      setQuizzes(res.quizzes);
    } catch (e) {
      console.error(e);
    }
  }

  const handleToggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(prev => prev.filter(t => t !== type));
      }
    } else {
      setSelectedTypes(prev => [...prev, type]);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      showToast('Please enter a topic for the quiz.', 'error');
      return;
    }
    setLoading(true);

    try {
      const res = await api.generateQuiz({
        topic,
        subject: subject || topic,
        difficulty,
        questionCount,
        types: selectedTypes
      });

      setQuizzes(prev => [res.quiz, ...prev]);
      startPlayingQuiz(res.quiz);
      showToast('Quiz generated successfully!', 'success');
    } catch (e) {
      showToast('Quiz generation failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startPlayingQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSubmitted(false);
    setFinalScore(null);
  };

  const handleSelectOption = (questionId: string, option: string) => {
    if (submitted) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;

    let correctCount = 0;
    activeQuiz.questions.forEach(q => {
      const uAns = (userAnswers[q.id] || '').trim().toLowerCase();
      const cAns = q.correctAnswer.trim().toLowerCase();
      if (uAns === cAns || cAns.includes(uAns) && uAns.length > 2) {
        correctCount += 1;
      }
    });

    const scorePercentage = Math.round((correctCount / activeQuiz.questions.length) * 100);
    setFinalScore(scorePercentage);
    setSubmitted(true);

    try {
      const res = await api.submitQuizScore(activeQuiz.id, scorePercentage);
      if (res.user) {
        updateUser(res.user);
      }
      // Trigger confetti explosion on high score
      if (scorePercentage >= 70) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      showToast(`Quiz completed! Score: ${scorePercentage}%`, 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteQuiz(id);
      setQuizzes(prev => prev.filter(q => q.id !== id));
      if (activeQuiz?.id === id) {
        setActiveQuiz(null);
      }
      showToast('Quiz deleted.', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-amber-500 dark:text-amber-400" /> AI Quiz Sniper Generator
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Auto-generate custom MCQs, True/False, and short answer quizzes to test active recall.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Form / History Sidebar */}
        <div className="space-y-6">
          {/* Generator Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Generate New Quiz
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Topic or Concept</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Organic Chemistry Reactions, Big-O Notation"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 focus:border-amber-500 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 text-xs font-semibold rounded-xl uppercase tracking-wider transition ${
                      difficulty === d
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Number of Questions ({questionCount})</label>
              <input
                type="range"
                min="3"
                max="15"
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Question Formats</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'mcq', label: 'Multiple Choice' },
                  { id: 'true_false', label: 'True / False' },
                  { id: 'fill_in_blank', label: 'Fill in Blank' },
                  { id: 'short_answer', label: 'Short Answer' }
                ].map(type => {
                  const selected = selectedTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleToggleType(type.id)}
                      className={`p-2 rounded-xl border text-[11px] font-medium transition flex items-center justify-between ${
                        selected
                          ? 'bg-purple-50 dark:bg-purple-600/20 border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-300 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>{type.label}</span>
                      {selected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGenerateQuiz}
              disabled={loading || !topic.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate AI Quiz'}
            </button>
          </div>

          {/* Saved Quizzes History */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">Saved Quizzes</div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {quizzes.map(q => (
                <div
                  key={q.id}
                  onClick={() => startPlayingQuiz(q)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition flex items-center justify-between group ${
                    activeQuiz?.id === q.id
                      ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-200">{q.title}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                      {q.difficulty} • {q.totalQuestions} Questions
                      {q.score !== undefined && <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-2">Score: {q.score}%</span>}
                    </div>
                  </div>
                  <button
                    onClick={e => handleDeleteQuiz(q.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Quiz Player (2 cols) */}
        <div className="lg:col-span-2">
          {activeQuiz ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 relative overflow-hidden shadow-sm">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30">
                    {activeQuiz.difficulty} Difficulty
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{activeQuiz.title}</h2>
                </div>

                {finalScore !== null && (
                  <div className="text-right">
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{finalScore}%</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Final Result</div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%`
                  }}
                />
              </div>

              {/* Current Question */}
              {activeQuiz.questions[currentQuestionIndex] && (
                <div className="space-y-6">
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {activeQuiz.questions[currentQuestionIndex].question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {(activeQuiz.questions[currentQuestionIndex].options || ['True', 'False']).map((opt, idx) => {
                      const qId = activeQuiz.questions[currentQuestionIndex].id;
                      const selected = userAnswers[qId] === opt;
                      const isCorrect = opt === activeQuiz.questions[currentQuestionIndex].correctAnswer;

                      let optStyle = 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800';
                      if (selected) optStyle = 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-200 font-semibold';

                      if (submitted) {
                        if (isCorrect) optStyle = 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold';
                        else if (selected && !isCorrect) optStyle = 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-200';
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(qId, opt)}
                          disabled={submitted}
                          className={`w-full p-4 rounded-2xl border text-xs sm:text-sm text-left transition flex items-center justify-between ${optStyle}`}
                        >
                          <span>{opt}</span>
                          {submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                          {submitted && selected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Solution Explanation if submitted */}
                  {submitted && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 space-y-1">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300">Explanation:</div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {activeQuiz.questions[currentQuestionIndex].explanation}
                      </div>
                    </div>
                  )}

                  {/* Question Nav Controls */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      !submitted && (
                        <button
                          onClick={handleSubmitQuiz}
                          className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20"
                        >
                          Submit Quiz
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
              Generate or select a quiz from the left sidebar to start practicing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
