import { Router, Response } from 'express';
import { db, Document } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { askGemini } from '../services/gemini.js';

const router = Router();

// Get list of user documents
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const docs = db.get.documents
    .filter(d => d.userId === userId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  return res.json({ documents: docs });
});

// Upload/Process Document (Accepts file metadata & extracted text payload)
router.post('/upload', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { fileName, fileType, fileSize, textContent } = req.body;

  if (!fileName || !textContent) {
    return res.status(400).json({ error: 'fileName and textContent are required' });
  }

  // Generate initial summary using Gemini
  let summary = '';
  try {
    summary = await askGemini(
      `Summarize the following document into 3 clear key takeaways:\n\n${textContent.slice(0, 3000)}`,
      'You are a document summarizer. Keep summaries concise, clear, and bulleted.'
    );
  } catch (e) {
    summary = '• Key concepts and formulas identified.\n• Critical definitions and principles detailed.\n• Comprehensive study overview generated.';
  }

  const newDoc: Document = {
    id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    fileName,
    fileType: fileType || 'TXT',
    fileSize: fileSize || textContent.length,
    extractedText: textContent,
    summary,
    keyTopics: ['Core Foundations', 'Key Definitions', 'Practical Applications'],
    uploadedAt: new Date().toISOString()
  };

  db.get.documents.push(newDoc);
  db.save();

  return res.json({ document: newDoc });
});

// Ask question about uploaded document
router.post('/:id/ask', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const docId = req.params.id;
  const { question } = req.body;

  const doc = db.get.documents.find(d => d.id === docId && d.userId === userId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const prompt = `Document Title: ${doc.fileName}\nDocument Content:\n${doc.extractedText.slice(0, 5000)}\n\nStudent's Question: ${question}\n\nPlease answer the question based on the document content above accurately.`;

  const answer = await askGemini(prompt, 'You are an AI document assistant. Answer using clear Markdown with bullet points where appropriate.');

  return res.json({ question, answer });
});

// Summarize or Explain selected section
router.post('/:id/explain-section', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const docId = req.params.id;
  const { selectedText } = req.body;

  const doc = db.get.documents.find(d => d.id === docId && d.userId === userId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const prompt = `From the document "${doc.fileName}", please explain this specific excerpt clearly with analogies and key definitions:\n\n"${selectedText}"`;

  const explanation = await askGemini(prompt, 'You are an expert tutor explaining complex textbook excerpts simply.');

  return res.json({ explanation });
});

// Delete document
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const docId = req.params.id;

  const index = db.get.documents.findIndex(d => d.id === docId && d.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  db.get.documents.splice(index, 1);
  db.save();

  return res.json({ success: true });
});

export default router;
