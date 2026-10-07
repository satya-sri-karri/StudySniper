import { Router, Response } from 'express';
import { db, Quiz, touchUserStreak } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { generateQuizJSON } from '../services/gemini.js';

const router = Router();

// Get list of user quizzes
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const quizzes = db.get.quizzes
    .filter(q => q.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ quizzes });
});

// Generate Quiz
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { topic, subject, difficulty, questionCount, types, documentText } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const numQuestions = Number(questionCount) || 5;
  const quizTypes = Array.isArray(types) && types.length > 0 ? types : ['mcq', 'true_false'];
  const diff = difficulty || 'medium';

  const questions = await generateQuizJSON({
    topic,
    documentText,
    difficulty: diff,
    questionCount: numQuestions,
    types: quizTypes
  });

  const formattedQuestions = questions.map((q: any, idx: number) => ({
    id: `q_${Date.now()}_${idx}`,
    type: q.type || 'mcq',
    question: q.question || `Question ${idx + 1} on ${topic}`,
    options: q.options || (q.type === 'true_false' ? ['True', 'False'] : undefined),
    correctAnswer: q.correctAnswer || (q.options ? q.options[0] : 'True'),
    explanation: q.explanation || 'Detailed solution explanation.'
  }));

  const newQuiz: Quiz = {
    id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    title: `${topic} Sniper Quiz`,
    subject: subject || topic,
    difficulty: diff,
    questions: formattedQuestions,
    totalQuestions: formattedQuestions.length,
    createdAt: new Date().toISOString()
  };

  db.get.quizzes.push(newQuiz);
  db.save();

  return res.json({ quiz: newQuiz });
});

// Submit Quiz score
router.post('/:id/submit', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const quizId = req.params.id;
  const { score } = req.body;

  const quiz = db.get.quizzes.find(q => q.id === quizId && q.userId === userId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  quiz.score = Number(score);
  quiz.completedAt = new Date().toISOString();
  db.save();

  const updatedUser = touchUserStreak(userId);

  return res.json({ quiz, user: updatedUser });
});

// Delete quiz
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const quizId = req.params.id;

  const index = db.get.quizzes.findIndex(q => q.id === quizId && q.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  db.get.quizzes.splice(index, 1);
  db.save();

  return res.json({ success: true });
});

export default router;
