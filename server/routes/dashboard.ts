import { Router, Response } from 'express';
import { db, touchUserStreak } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Dashboard Overview Metrics
router.get('/stats', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const user = touchUserStreak(userId);
  const userChats = db.get.chats.filter(c => c.userId === userId);
  const userDocs = db.get.documents.filter(d => d.userId === userId);
  const userQuizzes = db.get.quizzes.filter(q => q.userId === userId);
  const userFlashcards = db.get.flashcards.filter(f => f.userId === userId);
  const userNotes = db.get.notes.filter(n => n.userId === userId);
  const userPlans = db.get.studyPlans.filter(p => p.userId === userId);

  const completedQuizzes = userQuizzes.filter(q => q.score !== undefined);
  const totalScorePercentage = completedQuizzes.length > 0
    ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length)
    : 0;

  const cardsReviewed = userFlashcards.reduce((acc, f) => acc + (f.repetitions || 0), 0);

  // Calculate actual hours studied based on logged activities
  const estimatedHours = parseFloat(
    (
      completedQuizzes.length * 0.25 +
      cardsReviewed * 0.05 +
      userNotes.length * 0.3 +
      userChats.length * 0.2 +
      userDocs.length * 0.2
    ).toFixed(1)
  );

  // Get days of the current week (Mon to Sun)
  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weeklyProgress = dayNames.map((day, idx) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + idx);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const isSameDay = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= dayStart && d < dayEnd;
    };

    const dayQuizzes = userQuizzes.filter(q => isSameDay(q.completedAt || q.createdAt)).length;
    const dayCards = userFlashcards.filter(f => isSameDay(f.lastReviewed || f.createdAt)).reduce((acc, f) => acc + (f.repetitions || 1), 0);
    const dayNotes = userNotes.filter(n => isSameDay(n.createdAt)).length;
    const dayChats = userChats.filter(c => isSameDay(c.createdAt)).length;

    const dayHours = parseFloat(
      (dayQuizzes * 0.25 + dayCards * 0.05 + dayNotes * 0.3 + dayChats * 0.2).toFixed(1)
    );

    return {
      day,
      hoursStudied: dayHours,
      quizzesCompleted: dayQuizzes,
      cardsReviewed: dayCards
    };
  });

  return res.json({
    stats: {
      streakDays: user?.streakDays ?? 1,
      hoursStudied: estimatedHours,
      completedQuizzesCount: completedQuizzes.length,
      averageQuizScore: totalScorePercentage,
      flashcardsReviewedCount: cardsReviewed,
      documentsUploadedCount: userDocs.length,
      chatsCompletedCount: userChats.length,
      notesCount: userNotes.length,
      studyPlansCount: userPlans.length
    },
    weeklyProgress
  });
});

// Global Search
router.get('/search', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const q = (req.query.q as string || '').toLowerCase().trim();

  if (!q) {
    return res.json({ results: { notes: [], documents: [], chats: [], flashcards: [] } });
  }

  const notes = db.get.notes
    .filter(n => n.userId === userId && (n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q)))
    .slice(0, 5);

  const documents = db.get.documents
    .filter(d => d.userId === userId && (d.fileName.toLowerCase().includes(q) || d.extractedText.toLowerCase().includes(q)))
    .slice(0, 5);

  const chats = db.get.chats
    .filter(c => c.userId === userId && c.title.toLowerCase().includes(q))
    .slice(0, 5);

  const flashcards = db.get.flashcards
    .filter(f => f.userId === userId && (f.front.toLowerCase().includes(q) || f.back.toLowerCase().includes(q) || f.deckTitle.toLowerCase().includes(q)))
    .slice(0, 5);

  return res.json({
    results: {
      notes,
      documents,
      chats,
      flashcards
    }
  });
});

export default router;
