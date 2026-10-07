import { Router, Response } from 'express';
import { db, Chat, Message } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { askGeminiStream, askGemini, TUTOR_SYSTEM_INSTRUCTION } from '../services/gemini.js';

const router = Router();

// Get list of conversations
router.get('/conversations', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const userChats = db.get.chats
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return res.json({ chats: userChats });
});

// Create new conversation
router.post('/conversations', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { title, model } = req.body;

  const newChat: Chat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    title: title || 'New AI Tutor Session',
    model: model || 'gemini-2.5-flash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get.chats.push(newChat);

  // Add initial system message or greeting
  const greetingMsg: Message = {
    id: 'msg_' + Date.now() + '_1',
    chatId: newChat.id,
    role: 'model',
    content: `Hello! I am **Sniper AI**, your dedicated personal tutor. 🎯\n\nHow can I help you master your studies today? You can ask me to explain a difficult concept, summarize your notes, solve a step-by-step problem, or prepare practice questions!`,
    timestamp: new Date().toISOString()
  };
  db.get.messages.push(greetingMsg);
  db.save();

  return res.json({ chat: newChat, initialMessage: greetingMsg });
});

// Delete conversation
router.delete('/conversations/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const chatId = req.params.id;

  const chatIndex = db.get.chats.findIndex(c => c.id === chatId && c.userId === userId);
  if (chatIndex === -1) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  db.get.chats.splice(chatIndex, 1);
  db.get.messages = db.get.messages.filter(m => m.chatId !== chatId);
  db.save();

  return res.json({ success: true });
});

// Get messages for a conversation
router.get('/conversations/:id/messages', authenticateToken, (req: AuthRequest, res: Response) => {
  const chatId = req.params.id;
  const messages = db.get.messages
    .filter(m => m.chatId === chatId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return res.json({ messages });
});

// Send message & stream AI response via Server-Sent Events (SSE)
router.post('/message', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { chatId, prompt, systemPrompt } = req.body;

  if (!chatId || !prompt) {
    return res.status(400).json({ error: 'chatId and prompt are required' });
  }

  let chat = db.get.chats.find(c => c.id === chatId && c.userId === userId);
  if (!chat) {
    chat = {
      id: chatId,
      userId,
      title: prompt.slice(0, 30) + '...',
      model: 'gemini-2.5-flash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.get.chats.push(chat);
  }

  // Auto update title if first user message
  if (chat.title === 'New AI Tutor Session') {
    chat.title = prompt.length > 35 ? prompt.slice(0, 35) + '...' : prompt;
  }
  chat.updatedAt = new Date().toISOString();

  // Save User Message
  const userMsg: Message = {
    id: 'msg_' + Date.now() + '_u',
    chatId: chat.id,
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  };
  db.get.messages.push(userMsg);
  db.save();

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Build history for Gemini
  const pastMessages = db.get.messages
    .filter(m => m.chatId === chatId && m.id !== userMsg.id)
    .slice(-10)
    .map(m => ({
      role: m.role === 'model' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }]
    }));

  let fullAiText = '';

  const fullInstruction = systemPrompt
    ? `${TUTOR_SYSTEM_INSTRUCTION}\n\n[Active Persona Mode: ${systemPrompt}]`
    : TUTOR_SYSTEM_INSTRUCTION;

  try {
    await askGeminiStream(
      prompt,
      pastMessages,
      fullInstruction,
      (chunkText) => {
        fullAiText += chunkText;
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
    );

    // Save final AI Message
    const aiMsg: Message = {
      id: 'msg_' + Date.now() + '_m',
      chatId: chat.id,
      role: 'model',
      content: fullAiText,
      timestamp: new Date().toISOString()
    };
    db.get.messages.push(aiMsg);
    db.save();

    res.write(`data: ${JSON.stringify({ done: true, messageId: aiMsg.id })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Error during streaming chat response:', err);
    const fallbackText = fullAiText || `I am analyzing your query about "${prompt}". Let me break down the solution step by step with active key takeaways.`;
    
    const aiMsg: Message = {
      id: 'msg_' + Date.now() + '_err',
      chatId: chat.id,
      role: 'model',
      content: fallbackText,
      timestamp: new Date().toISOString()
    };
    db.get.messages.push(aiMsg);
    db.save();

    res.write(`data: ${JSON.stringify({ done: true, messageId: aiMsg.id, fallback: true })}\n\n`);
    res.end();
  }
});

// Bookmark / Unbookmark message
router.post('/bookmark', authenticateToken, (req: AuthRequest, res: Response) => {
  const { messageId } = req.body;
  const msg = db.get.messages.find(m => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }
  msg.bookmarked = !msg.bookmarked;
  db.save();
  return res.json({ bookmarked: msg.bookmarked });
});

export default router;
