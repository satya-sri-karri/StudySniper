import { Router, Response } from 'express';
import { db, StudyPlan } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { generateStudyPlanJSON } from '../services/gemini.js';

const router = Router();

// Get study plans
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const plans = db.get.studyPlans
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ studyPlans: plans });
});

// Generate new Study Plan
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { title, subjects, examDate, dailyHours } = req.body;

  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'At least one subject is required' });
  }

  const hours = Number(dailyHours) || 3;
  const planTitle = title || `${subjects.join(', ')} Sniper Plan`;

  const generated = await generateStudyPlanJSON({
    title: planTitle,
    subjects,
    examDate: examDate || 'Upcoming Exam',
    dailyHours: hours
  });

  const formattedTasks = (generated.tasks || []).map((t: any, idx: number) => ({
    id: `task_${Date.now()}_${idx}`,
    day: t.day || `Day ${idx + 1}`,
    subject: t.subject || subjects[idx % subjects.length],
    topic: t.topic || `Core Mastery Module ${idx + 1}`,
    durationMinutes: t.durationMinutes || 45,
    completed: false
  }));

  const newPlan: StudyPlan = {
    id: 'sp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    title: planTitle,
    subjects,
    examDate: examDate || 'In 30 Days',
    dailyHours: hours,
    tasks: formattedTasks,
    createdAt: new Date().toISOString()
  };

  db.get.studyPlans.push(newPlan);
  db.save();

  return res.json({ studyPlan: newPlan });
});

// Toggle Task completion
router.put('/:id/task/:taskId/toggle', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { id, taskId } = req.params;

  const plan = db.get.studyPlans.find(p => p.id === id && p.userId === userId);
  if (!plan) {
    return res.status(404).json({ error: 'Study plan not found' });
  }

  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found in study plan' });
  }

  task.completed = !task.completed;
  db.save();

  return res.json({ studyPlan: plan, task });
});

// Delete study plan
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params.id;

  const index = db.get.studyPlans.findIndex(p => p.id === id && p.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Study plan not found' });
  }

  db.get.studyPlans.splice(index, 1);
  db.save();

  return res.json({ success: true });
});

export default router;
