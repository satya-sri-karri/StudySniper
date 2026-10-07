import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { askGemini } from '../services/gemini.js';

const router = Router();

router.post('/analyze', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { code, language, action } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Code snippet and language are required' });
  }

  const act = action || 'explain'; // 'explain', 'debug', 'optimize', 'examples'

  let systemPrompt = `You are Sniper Code AI, an expert programming tutor specializing in ${language}, C++, Java, Python, and JavaScript. Provide clear explanations with formatted code blocks, line-by-line breakdowns, complexity analysis (Big-O), and recommended best practices.`;

  let prompt = '';
  if (act === 'explain') {
    prompt = `Please explain this ${language} code clearly for a student. Include a high-level summary, key components, and potential edge cases:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else if (act === 'debug') {
    prompt = `Analyze this ${language} code for syntax errors, logical bugs, and edge-case failures. Provide the corrected code in a code block and explain what was fixed:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else if (act === 'optimize') {
    prompt = `Analyze the time and space complexity (Big-O) of this ${language} code. Suggest an optimized approach with faster time complexity or lower memory usage, and provide the rewritten code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  } else {
    prompt = `Generate 2 practical, well-commented coding exercises and solutions related to the concepts demonstrated in this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  }

  const response = await askGemini(prompt, systemPrompt);

  return res.json({ action: act, language, response });
});

export default router;
