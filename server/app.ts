import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import docsRouter from './routes/documents.js';
import quizRouter from './routes/quiz.js';
import flashcardsRouter from './routes/flashcards.js';
import studyPlanRouter from './routes/studyPlan.js';
import notesRouter from './routes/notes.js';
import codingRouter from './routes/coding.js';
import dashboardRouter from './routes/dashboard.js';

dotenv.config();

export const app = express();

// Trust reverse proxy headers (Cloud Run / Nginx ingress)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // allow inline scripts for Vite dev server and icons
  crossOriginEmbedderPolicy: false
}));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes.' }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Study Sniper AI API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/documents', docsRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/flashcards', flashcardsRouter);
app.use('/api/study-planner', studyPlanRouter);
app.use('/api/notes', notesRouter);
app.use('/api/coding', codingRouter);
app.use('/api/dashboard', dashboardRouter);

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});
