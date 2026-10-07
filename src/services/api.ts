const API_BASE = '';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('studysniper_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An unexpected error occurred');
  }

  return data as T;
}

// Auth API
export const api = {
  // Auth
  signup: (data: { name: string; email: string; password: string }) =>
    fetchApi('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (data: { email: string; otpCode: string; purpose?: 'email_verification' | 'password_reset' }) =>
    fetchApi('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  resendOtp: (data: { email: string; purpose?: 'email_verification' | 'password_reset' }) =>
    fetchApi('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchApi('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  firebaseLogin: (data: { email: string; name?: string; firebaseUid?: string; photoURL?: string }) =>
    fetchApi('/api/auth/firebase-login', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (data: { email: string }) =>
    fetchApi('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data: { email: string; otpCode: string; newPassword: string }) =>
    fetchApi('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  logoutApi: () => fetchApi('/api/auth/logout', { method: 'POST' }),
  getMe: () => fetchApi('/api/auth/me'),
  incrementStreak: () => fetchApi('/api/auth/streak/increment', { method: 'POST' }),
  updateProfile: (data: { name?: string; targetExam?: string; dailyGoalHours?: number }) =>
    fetchApi('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: () => fetchApi('/api/auth/account', { method: 'DELETE' }),

  // Dashboard & Search
  getStats: () => fetchApi('/api/dashboard/stats'),
  globalSearch: (query: string) => fetchApi(`/api/dashboard/search?q=${encodeURIComponent(query)}`),

  // Chat
  getConversations: () => fetchApi('/api/chat/conversations'),
  createConversation: (title?: string) =>
    fetchApi('/api/chat/conversations', { method: 'POST', body: JSON.stringify({ title }) }),
  deleteConversation: (id: string) =>
    fetchApi(`/api/chat/conversations/${id}`, { method: 'DELETE' }),
  getMessages: (id: string) => fetchApi(`/api/chat/conversations/${id}/messages`),
  bookmarkMessage: (messageId: string) =>
    fetchApi('/api/chat/bookmark', { method: 'POST', body: JSON.stringify({ messageId }) }),

  // Documents
  getDocuments: () => fetchApi('/api/documents'),
  uploadDocument: (data: { fileName: string; fileType?: string; fileSize?: number; textContent: string }) =>
    fetchApi('/api/documents/upload', { method: 'POST', body: JSON.stringify(data) }),
  askDocument: (id: string, question: string) =>
    fetchApi(`/api/documents/${id}/ask`, { method: 'POST', body: JSON.stringify({ question }) }),
  explainDocumentSection: (id: string, selectedText: string) =>
    fetchApi(`/api/documents/${id}/explain-section`, { method: 'POST', body: JSON.stringify({ selectedText }) }),
  deleteDocument: (id: string) => fetchApi(`/api/documents/${id}`, { method: 'DELETE' }),

  // Quiz
  getQuizzes: () => fetchApi('/api/quiz'),
  generateQuiz: (data: { topic: string; subject?: string; difficulty: string; questionCount: number; types: string[]; documentText?: string }) =>
    fetchApi('/api/quiz/generate', { method: 'POST', body: JSON.stringify(data) }),
  submitQuizScore: (id: string, score: number) =>
    fetchApi(`/api/quiz/${id}/submit`, { method: 'POST', body: JSON.stringify({ score }) }),
  deleteQuiz: (id: string) => fetchApi(`/api/quiz/${id}`, { method: 'DELETE' }),

  // Flashcards
  getFlashcards: () => fetchApi('/api/flashcards'),
  generateFlashcards: (data: { topic: string; count: number; documentText?: string }) =>
    fetchApi('/api/flashcards/generate', { method: 'POST', body: JSON.stringify(data) }),
  createFlashcard: (data: { deckTitle?: string; front: string; back: string; difficulty?: string }) =>
    fetchApi('/api/flashcards', { method: 'POST', body: JSON.stringify(data) }),
  reviewFlashcard: (id: string, rating: 'again' | 'hard' | 'good' | 'easy') =>
    fetchApi(`/api/flashcards/${id}/review`, { method: 'PUT', body: JSON.stringify({ rating }) }),
  deleteFlashcard: (id: string) => fetchApi(`/api/flashcards/${id}`, { method: 'DELETE' }),

  // Study Planner
  getStudyPlans: () => fetchApi('/api/study-planner'),
  generateStudyPlan: (data: { title?: string; subjects: string[]; examDate?: string; dailyHours: number }) =>
    fetchApi('/api/study-planner/generate', { method: 'POST', body: JSON.stringify(data) }),
  toggleStudyTask: (planId: string, taskId: string) =>
    fetchApi(`/api/study-planner/${planId}/task/${taskId}/toggle`, { method: 'PUT' }),
  deleteStudyPlan: (id: string) => fetchApi(`/api/study-planner/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: () => fetchApi('/api/notes'),
  generateNote: (data: { topic: string; subject?: string; rawContent: string }) =>
    fetchApi('/api/notes/generate', { method: 'POST', body: JSON.stringify(data) }),
  createNote: (data: any) => fetchApi('/api/notes', { method: 'POST', body: JSON.stringify(data) }),
  deleteNote: (id: string) => fetchApi(`/api/notes/${id}`, { method: 'DELETE' }),

  // Coding Assistant
  analyzeCode: (data: { code: string; language: string; action: 'explain' | 'debug' | 'optimize' | 'examples' }) =>
    fetchApi('/api/coding/analyze', { method: 'POST', body: JSON.stringify(data) })
};
