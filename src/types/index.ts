export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  targetExam?: string;
  dailyGoalHours?: number;
  streakDays: number;
  lastActiveDate: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  bookmarked?: boolean;
}

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  summary?: string;
  keyTopics?: string[];
  uploadedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  subject: string;
  summary: string;
  keyPoints: string[];
  definitions: { term: string; definition: string }[];
  formulas: string[];
  content: string;
  tags: string[];
  createdAt: string;
}

export interface Flashcard {
  id: string;
  userId: string;
  deckTitle: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed?: string;
  repetitions: number;
  interval: number;
  easeFactor: number;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'fill_in_blank' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  score?: number;
  totalQuestions: number;
  completedAt?: string;
  createdAt: string;
}

export interface StudyTask {
  id: string;
  day: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  completed: boolean;
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  subjects: string[];
  examDate: string;
  dailyHours: number;
  tasks: StudyTask[];
  createdAt: string;
}

export interface DashboardStats {
  streakDays: number;
  hoursStudied: number;
  completedQuizzesCount: number;
  averageQuizScore: number;
  flashcardsReviewedCount: number;
  documentsUploadedCount: number;
  chatsCompletedCount: number;
  notesCount: number;
  studyPlansCount: number;
}

export interface WeeklyProgressItem {
  day: string;
  hoursStudied: number;
  quizzesCompleted: number;
  cardsReviewed: number;
}

export type TabType =
  | 'dashboard'
  | 'tutor'
  | 'notes'
  | 'flashcards'
  | 'quiz'
  | 'planner'
  | 'documents'
  | 'coding'
  | 'settings';
