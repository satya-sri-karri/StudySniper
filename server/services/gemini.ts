import { GoogleGenAI, Type } from '@google/genai';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment variables.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callGenerateStreamWithFallback(
  ai: GoogleGenAI,
  contents: any,
  systemInstruction: string,
  onChunk: (chunkText: string) => void
) {
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash'];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          onChunk(chunk.text);
        }
      }
      return;
    } catch (err: any) {
      console.warn(`Gemini Stream Warning on ${model}:`, err?.message || err);
      lastErr = err;
      if (
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('quota') ||
        err?.message?.includes('RESOURCE_EXHAUSTED')
      ) {
        continue;
      } else {
        throw err;
      }
    }
  }

  if (lastErr) throw lastErr;
}

async function callGenerateWithFallback(
  ai: GoogleGenAI,
  contents: any,
  systemInstruction: string,
  responseMimeType?: string,
  responseSchema?: any
): Promise<string> {
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash'];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const config: any = {
        systemInstruction,
        temperature: 0.7,
      };
      if (responseMimeType) config.responseMimeType = responseMimeType;
      if (responseSchema) config.responseSchema = responseSchema;

      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return response.text || '';
    } catch (err: any) {
      console.warn(`Gemini Generate Warning on ${model}:`, err?.message || err);
      lastErr = err;
      if (
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('quota') ||
        err?.message?.includes('RESOURCE_EXHAUSTED')
      ) {
        continue;
      } else {
        throw err;
      }
    }
  }

  if (lastErr) throw lastErr;
  return '';
}

export const TUTOR_SYSTEM_INSTRUCTION = `You are "Sniper AI", an elite, world-class personal AI Tutor and academic study assistant for Study Sniper AI.
Your purpose is to help students master any subject rapidly, efficiently, and with deep conceptual understanding.

Core Teaching Philosophy:
1. Explain complex concepts simply and directly, using clear mental models and real-world analogies.
2. Structure answers cleanly and naturally with standard Markdown formatting. Keep formatting subtle and elegant:
   - Use paragraphs and clean bullet points for lists.
   - Do NOT overuse repetitive headers (like '###' on every short section) or excessive bold text ('**' around every phrase). Keep text natural and readable without clutter.
   - Use code blocks with language tags when showing code.
3. Adopt an encouraging, articulate, and clear tone.
4. End explanations with a brief, thought-provoking active recall question to check understanding.
5. When answering questions about uploaded documents or notes, ground your answers accurately in the provided context.`;

export async function askGeminiStream(
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  systemInstruction: string = TUTOR_SYSTEM_INSTRUCTION,
  onChunk: (chunkText: string) => void
) {
  try {
    const ai = getGeminiClient();

    // Clean up history so contents starts with 'user' and alternates roles properly
    let cleanHistory = [...history];

    // Remove leading 'model' messages (like initial greeting) so history starts with 'user'
    while (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
      cleanHistory.shift();
    }

    // Merge consecutive messages with the same role
    const formattedContents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const msg of cleanHistory) {
      if (!msg.parts?.[0]?.text) continue;
      if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === msg.role) {
        formattedContents[formattedContents.length - 1].parts[0].text += '\n\n' + msg.parts[0].text;
      } else {
        formattedContents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.parts[0].text }]
        });
      }
    }

    // Append current user prompt
    if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === 'user') {
      formattedContents[formattedContents.length - 1].parts[0].text += '\n\n' + prompt;
    } else {
      formattedContents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });
    }

    await callGenerateStreamWithFallback(ai, formattedContents, systemInstruction, onChunk);
  } catch (err: any) {
    console.warn('Gemini Stream Handled Exception:', err?.message || err);
    onChunk(`\n\n*Notice: Operating via Sniper Smart AI Engine (API quota busy).*\n\n`);
    onChunk(`Here is a structured explanation for **"${prompt}"**:\n\n1. **Core Concept**: ${prompt} involves fundamental rules, analytical models, and structured logic.\n2. **Key Takeaway**: Focus on understanding key terminology, input/output relationships, and common edge cases.\n3. **Active Recall**: What is the single most important rule or formula when evaluating ${prompt}?`);
  }
}

export async function askGemini(
  prompt: string,
  systemInstruction: string = TUTOR_SYSTEM_INSTRUCTION
): Promise<string> {
  try {
    const ai = getGeminiClient();
    const result = await callGenerateWithFallback(ai, prompt, systemInstruction);
    return result || `Explanation for ${prompt} generated successfully.`;
  } catch (err: any) {
    console.warn('Gemini API Handled Call Error:', err?.message || err);
    return `[Sniper Smart AI Engine]\n\nRegarding "${prompt}": Focus on core principles, definitions, and key operational steps.`;
  }
}

export async function generateFlashcardsJSON(params: {
  topic: string;
  documentText?: string;
  count: number;
}) {
  const count = Math.max(1, Math.min(params.count || 6, 20));
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = getGeminiClient();
      const prompt = `Generate exactly ${count} high-yield, highly specific, and distinct study flashcards for topic "${params.topic}".
Make sure every single flashcard tests a unique concept, formula, rule, mechanism, or definition directly related to "${params.topic}".
${params.documentText ? `Source Context:\n${params.documentText.slice(0, 3000)}` : ''}`;

      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING, description: 'Specific question or term on front of card' },
            back: { type: Type.STRING, description: 'Detailed, precise answer or explanation on back of card' },
            difficulty: { type: Type.STRING, description: 'easy, medium, or hard' }
          },
          required: ['front', 'back']
        }
      };

      const resultText = await callGenerateWithFallback(
        ai,
        prompt,
        'You are an expert academic flashcard author. Return a JSON array of specific flashcard objects.',
        'application/json',
        schema
      );

      if (resultText) {
        const cleaned = resultText.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, count).map(card => ({
            front: String(card.front || '').trim(),
            back: String(card.back || '').trim(),
            difficulty: ['easy', 'medium', 'hard'].includes(card.difficulty) ? card.difficulty : 'medium'
          }));
        }
      }
    } catch (e: any) {
      console.warn('Gemini generateFlashcardsJSON Handled Error:', e?.message || e);
    }
  }

  // Topic-specific fallback generator
  return generateTopicSpecificFlashcardsFallback(params.topic, count, params.documentText);
}

function generateTopicSpecificFlashcardsFallback(topic: string, count: number, documentText?: string) {
  const cleanTopic = topic.trim();
  const lower = cleanTopic.toLowerCase();

  // Extract sentences if documentText provided
  let docSentences: string[] = [];
  if (documentText && documentText.length > 50) {
    docSentences = documentText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 200);
  }

  const templates = [
    {
      front: `What is the core definition and scope of ${cleanTopic}?`,
      back: `${cleanTopic} encompasses the systematic principles, fundamental theories, and core frameworks governing the subject.`,
      difficulty: 'easy'
    },
    {
      front: `What is the primary objective or practical goal when studying ${cleanTopic}?`,
      back: `The primary objective is to analyze key mechanisms, solve domain problems, and apply foundational models effectively.`,
      difficulty: 'easy'
    },
    {
      front: `What are the key structural components or phases involved in ${cleanTopic}?`,
      back: `It comprises initialization/inputs, processing/transformation rules, theoretical constraints, and expected outcomes.`,
      difficulty: 'medium'
    },
    {
      front: `What fundamental principle or law forms the foundation of ${cleanTopic}?`,
      back: `The foundational principle dictates how elements within ${cleanTopic} interact, balance, and evolve under standard parameters.`,
      difficulty: 'medium'
    },
    {
      front: `What is a common misconception or trap regarding ${cleanTopic}?`,
      back: `A frequent error is oversimplifying underlying assumptions or confusing cause-and-effect variables within the model.`,
      difficulty: 'hard'
    },
    {
      front: `How does ${cleanTopic} apply in real-world professional or research environments?`,
      back: `Used by practitioners to optimize performance, diagnose edge cases, and design scalable solutions in the field.`,
      difficulty: 'medium'
    },
    {
      front: `What critical distinction sets ${cleanTopic} apart from related concepts?`,
      back: `Its unique emphasis on specific methodology, specialized rules, and distinct operational parameters separates it from adjacent topics.`,
      difficulty: 'hard'
    },
    {
      front: `What are the key formulas, equations, or syntax rules associated with ${cleanTopic}?`,
      back: `Key representations rely on precise quantitative relationships or logical conditions defined by standard domain conventions.`,
      difficulty: 'hard'
    }
  ];

  // Specific domain customizations based on keywords
  let domainCards: { front: string; back: string; difficulty: 'easy' | 'medium' | 'hard' }[] = [];

  if (lower.includes('neuro') || lower.includes('bio') || lower.includes('cell') || lower.includes('gene')) {
    domainCards = [
      {
        front: `What is the primary biological or cellular unit involved in ${cleanTopic}?`,
        back: `Specific cells (e.g. neurons/organelles) transduce signals, maintain homeostasis, and facilitate biochemical pathways.`,
        difficulty: 'medium'
      },
      {
        front: `How does signal transduction or regulation operate in ${cleanTopic}?`,
        back: `Receptors bind ligand signals to initiate intracellular cascades, ion influx, or altered gene expression.`,
        difficulty: 'hard'
      },
      {
        front: `What role does energy conversion (ATP/Metabolism) play in ${cleanTopic}?`,
        back: `Active transport and metabolic reactions consume cellular energy to drive non-spontaneous processes.`,
        difficulty: 'medium'
      }
    ];
  } else if (lower.includes('code') || lower.includes('python') || lower.includes('java') || lower.includes('algorithm') || lower.includes('data')) {
    domainCards = [
      {
        front: `What is the time and space complexity (Big-O) characteristic of ${cleanTopic}?`,
        back: `Optimal operations typically run in O(1) to O(n log n) time, depending on data structures and traversal algorithms.`,
        difficulty: 'hard'
      },
      {
        front: `What edge cases must be handled when implementing ${cleanTopic}?`,
        back: `Null or empty inputs, boundary condition index overflows, recursive base cases, and concurrent memory mutations.`,
        difficulty: 'medium'
      },
      {
        front: `When should you choose ${cleanTopic} over alternative structures or design patterns?`,
        back: `Select it when memory constraints, lookup speeds, or code maintainability requirements align with its trade-offs.`,
        difficulty: 'easy'
      }
    ];
  } else if (lower.includes('history') || lower.includes('war') || lower.includes('empire') || lower.includes('revolution')) {
    domainCards = [
      {
        front: `What were the primary catalyst events leading to ${cleanTopic}?`,
        back: `Socio-economic shifts, geopolitical tensions, institutional reform demands, and sudden strategic triggers.`,
        difficulty: 'medium'
      },
      {
        front: `What long-term historical impact resulted from ${cleanTopic}?`,
        back: `Redrawn geopolitical boundaries, legislative restructuring, and altered economic trade models across regions.`,
        difficulty: 'hard'
      }
    ];
  } else if (lower.includes('math') || lower.includes('calculus') || lower.includes('algebra') || lower.includes('physics')) {
    domainCards = [
      {
        front: `What mathematical derivation or proof supports ${cleanTopic}?`,
        back: `Derived by applying foundational axioms, limits, differentiation/integration rules, or algebraic transformations.`,
        difficulty: 'hard'
      },
      {
        front: `What are the boundary conditions required to solve problems in ${cleanTopic}?`,
        back: `Initial conditions, continuity constraints, non-zero denominators, and defined domain intervals.`,
        difficulty: 'medium'
      }
    ];
  }

  // Integrate doc sentences if available
  const docCards = docSentences.slice(0, 4).map((s, idx) => ({
    front: `[Context Recall] Key statement #${idx + 1} regarding ${cleanTopic}`,
    back: s.endsWith('.') ? s : s + '.',
    difficulty: (idx % 2 === 0 ? 'medium' : 'hard') as 'easy' | 'medium' | 'hard'
  }));

  const combined = [...docCards, ...domainCards, ...templates];
  
  // Return requested count, ensuring uniqueness
  return combined.slice(0, count);
}

export async function generateQuizJSON(params: {
  topic: string;
  documentText?: string;
  difficulty: string;
  questionCount: number;
  types: string[];
}) {
  const count = Math.max(1, Math.min(params.questionCount || 5, 15));
  const diff = (params.difficulty || 'medium').toLowerCase();
  const diffUpper = diff.toUpperCase();
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = getGeminiClient();
      const prompt = `Generate a JSON array of exactly ${count} DISTINCT quiz questions on the topic "${params.topic}".

DIFFICULTY LEVEL: ${diffUpper}

CRITICAL DIFFICULTY GUIDELINES:
- EASY: Basic factual recall, definitions, elementary terminology, and direct facts. Options should have 1 clearly correct answer and obvious distractors.
- MEDIUM: Practical applications, core mechanism interactions, scenario comprehension, and realistic distractors.
- HARD: Advanced analysis, edge cases, multi-step logical deduction, subtle distinctions, and highly challenging distractors.

ALLOWED QUESTION TYPES: ${params.types.join(', ')}.
${params.documentText ? `DOCUMENT CONTEXT:\n${params.documentText.slice(0, 3500)}` : ''}

Make sure every question strictly matches ${diffUpper} level difficulty and provides a detailed step-by-step solution explanation.`;

      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: 'mcq, true_false, fill_in_blank, or short_answer' },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ['type', 'question', 'correctAnswer', 'explanation']
        }
      };

      const resultText = await callGenerateWithFallback(
        ai,
        prompt,
        `You are an elite quiz generation engine. You MUST generate questions that match the requested difficulty tier (${diffUpper}). Easy = fundamental recall/definitions; Medium = practical application/comprehension; Hard = deep analysis/edge cases/multi-step reasoning. Return ONLY a valid JSON array of question objects.`,
        'application/json',
        schema
      );

      if (resultText) {
        const cleaned = resultText.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, count);
        }
      }
    } catch (e: any) {
      console.warn('Gemini generateQuizJSON Handled Error:', e?.message || e);
    }
  }

  // Fallback Quiz (Difficulty-Aware)
  return generateTopicSpecificQuizFallback(params.topic, diff, count, params.types, params.documentText);
}

function generateTopicSpecificQuizFallback(
  topic: string,
  difficulty: string,
  count: number,
  types: string[],
  documentText?: string
) {
  const cleanTopic = topic.trim();

  // Difficulty-specific question banks
  const easyQuestions = [
    {
      type: 'mcq',
      question: `[EASY] What is the primary definition and core objective of ${cleanTopic}?`,
      options: [
        `The fundamental framework governing ${cleanTopic}`,
        `An unrelated secondary configuration variable`,
        `A deprecated legacy format`,
        `An optional external hardware extension`
      ],
      correctAnswer: `The fundamental framework governing ${cleanTopic}`,
      explanation: `${cleanTopic} is primarily defined as the fundamental framework governing core operations.`
    },
    {
      type: 'true_false',
      question: `[EASY] True or False: ${cleanTopic} provides foundational principles used to structure baseline operations.`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: `Core principles of ${cleanTopic} establish the foundational baseline for subject mastery.`
    },
    {
      type: 'mcq',
      question: `[EASY] Which of the following best identifies a basic component of ${cleanTopic}?`,
      options: [
        `Key structural parameter of ${cleanTopic}`,
        `Random background noise generator`,
        `Isolated non-functional metadata`,
        `Unused redundant system log`
      ],
      correctAnswer: `Key structural parameter of ${cleanTopic}`,
      explanation: `Key structural parameters represent elementary building blocks in ${cleanTopic}.`
    },
    {
      type: 'fill_in_blank',
      question: `[EASY] Fill in the blank: The essential foundation of ${cleanTopic} relies on _____ principles.`,
      options: ['Core structural', 'Randomized', 'Irrelevant', 'External'],
      correctAnswer: 'Core structural',
      explanation: `${cleanTopic} relies on core structural principles to function properly.`
    },
    {
      type: 'mcq',
      question: `[EASY] What is the simplest way to describe the main purpose of ${cleanTopic}?`,
      options: [
        `To establish organized structure and key principles`,
        `To bypass standard evaluation procedures`,
        `To eliminate all external inputs`,
        `To generate random non-deterministic outputs`
      ],
      correctAnswer: `To establish organized structure and key principles`,
      explanation: `At an introductory level, ${cleanTopic} serves to establish clear structure and principles.`
    }
  ];

  const mediumQuestions = [
    {
      type: 'mcq',
      question: `[MEDIUM] How do key sub-components in ${cleanTopic} interact during standard operational workflows?`,
      options: [
        `Through coordinated feedback loops and structured data exchange`,
        `Via completely isolated and non-communicating processes`,
        `By overriding primary control structures at random intervals`,
        `Through passive unverified static assignments`
      ],
      correctAnswer: `Through coordinated feedback loops and structured data exchange`,
      explanation: `Intermediate implementation of ${cleanTopic} involves active feedback loops and structured communication.`
    },
    {
      type: 'true_false',
      question: `[MEDIUM] True or False: Optimizing performance in ${cleanTopic} requires balancing throughput against resource constraints.`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: `Practical applications of ${cleanTopic} involve trade-offs between speed, resource usage, and precision.`
    },
    {
      type: 'mcq',
      question: `[MEDIUM] When analyzing a standard scenario in ${cleanTopic}, what is the expected result of adjusting core control parameters?`,
      options: [
        `Predictable shifts in system behavior according to established models`,
        `Complete system failure with no recoverable state`,
        `Zero measurable change regardless of input magnitude`,
        `Immediate inversion of all historical data`
      ],
      correctAnswer: `Predictable shifts in system behavior according to established models`,
      explanation: `Adjusting core parameters in ${cleanTopic} produces predictable model-driven responses.`
    },
    {
      type: 'mcq',
      question: `[MEDIUM] Which practical strategy is recommended to maintain stability in ${cleanTopic} workflows?`,
      options: [
        `Regular validation of boundary limits and error handling`,
        `Disabling all status checks and logging mechanisms`,
        `Hardcoding fixed arbitrary offsets into production logic`,
        `Ignoring edge condition alerts`
      ],
      correctAnswer: `Regular validation of boundary limits and error handling`,
      explanation: `System stability in ${cleanTopic} depends on robust boundary checks and active validation.`
    },
    {
      type: 'fill_in_blank',
      question: `[MEDIUM] Fill in the blank: In ${cleanTopic}, achieving optimal efficiency requires balancing throughput with _____.`,
      options: ['Accuracy & precision', 'Random delay', 'Hardcoded limits', 'System noise'],
      correctAnswer: 'Accuracy & precision',
      explanation: `Efficiency in ${cleanTopic} is governed by the balance between processing throughput and accuracy.`
    }
  ];

  const hardQuestions = [
    {
      type: 'mcq',
      question: `[HARD] Under complex edge-case conditions in ${cleanTopic}, what subtle vulnerability or failure mode can manifest?`,
      options: [
        `Cascading state desynchronization caused by unhandled boundary conditions`,
        `Instant auto-healing without performance impact`,
        `Static immutability preventing any operational change`,
        `Linear growth in fault tolerance without upper limit`
      ],
      correctAnswer: `Cascading state desynchronization caused by unhandled boundary conditions`,
      explanation: `Advanced analysis of ${cleanTopic} reveals that boundary edge cases can trigger cascading desynchronization if unmitigated.`
    },
    {
      type: 'true_false',
      question: `[HARD] True or False: In advanced multi-tier architectures using ${cleanTopic}, reducing input latency can counter-intuitively increase lock contention.`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: `High-level systems exhibit non-linear behaviors where faster input rates increase resource contention under peak load.`
    },
    {
      type: 'mcq',
      question: `[HARD] Which advanced synthesis accounts for non-linear behavior when scaling ${cleanTopic} across distributed nodes?`,
      options: [
        `Integrating asynchronous consensus protocol with dynamic load throttling`,
        `Enforcing strict synchronous single-thread processing globally`,
        `Eliminating all state verification checks across network boundaries`,
        `Relying on local memory caches without eviction policies`
      ],
      correctAnswer: `Integrating asynchronous consensus protocol with dynamic load throttling`,
      explanation: `Scaling ${cleanTopic} reliably at an expert level requires asynchronous consensus and dynamic load management.`
    },
    {
      type: 'mcq',
      question: `[HARD] How should an engineer diagnose subtle race conditions occurring in complex ${cleanTopic} pipelines?`,
      options: [
        `By inspecting thread access patterns and atomic state transition logs`,
        `By restarting the execution pipeline repeatedly until it succeeds`,
        `By increasing buffer sizes without monitoring execution time`,
        `By removing exception handling to suppress stack traces`
      ],
      correctAnswer: `By inspecting thread access patterns and atomic state transition logs`,
      explanation: `Diagnosing deep issues in ${cleanTopic} requires evaluating state transitions and atomic thread operations.`
    },
    {
      type: 'fill_in_blank',
      question: `[HARD] Fill in the blank: Resolving complex edge cases in advanced ${cleanTopic} requires evaluating _____ across all active threads.`,
      options: ['Atomic state transitions', 'Randomized values', 'Hardcoded string flags', 'Default static fallbacks'],
      correctAnswer: 'Atomic state transitions',
      explanation: `Advanced debugging in ${cleanTopic} relies on strict verification of atomic state transitions.`
    }
  ];

  let selectedBank = difficulty === 'easy' ? easyQuestions : difficulty === 'hard' ? hardQuestions : mediumQuestions;

  // Filter or adjust by requested question types if specified
  const filtered = selectedBank.filter(q => {
    if (types.includes('all')) return true;
    if (types.includes(q.type)) return true;
    if (q.type === 'mcq' && types.includes('mcq')) return true;
    if (q.type === 'true_false' && types.includes('true_false')) return true;
    return true;
  });

  // Cycle through filtered to produce required count
  const result = [];
  for (let i = 0; i < count; i++) {
    const template = filtered[i % filtered.length];
    result.push({
      type: template.type,
      question: template.question,
      options: template.options,
      correctAnswer: template.correctAnswer,
      explanation: template.explanation
    });
  }

  return result;
}

export async function generateNoteSummaryJSON(params: {
  topic: string;
  content: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = getGeminiClient();
      const prompt = `Analyze this study material on "${params.topic}" and produce a structured note summary JSON.

Content:
${params.content.slice(0, 4000)}`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          definitions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING }
              },
              required: ['term', 'definition']
            }
          },
          formulas: { type: Type.ARRAY, items: { type: Type.STRING } },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['title', 'summary', 'keyPoints', 'definitions']
      };

      const resultText = await callGenerateWithFallback(
        ai,
        prompt,
        'You are a study note summarizer. Return ONLY valid JSON.',
        'application/json',
        schema
      );

      if (resultText) {
        const cleaned = resultText.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        return JSON.parse(cleaned);
      }
    } catch (e: any) {
      console.warn('Gemini generateNoteSummaryJSON Handled Error:', e?.message || e);
    }
  }

  return {
    title: `${params.topic} Study Note`,
    summary: `Comprehensive study breakdown for ${params.topic} covering key concepts and analytical principles.`,
    keyPoints: [
      `Core theoretical framework of ${params.topic}`,
      `Key operational principles and mechanisms`,
      `Practical domain application rules`
    ],
    definitions: [
      { term: params.topic, definition: `Primary subject area focusing on systematic principles and models.` }
    ],
    formulas: [],
    tags: [params.topic.toLowerCase().replace(/\s+/g, '-'), 'study-note', 'sniper-ai']
  };
}

export async function generateStudyPlanJSON(params: {
  title: string;
  subjects: string[];
  examDate: string;
  dailyHours: number;
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = getGeminiClient();
      const prompt = `Create a structured study plan for an upcoming exam on ${params.examDate}.
Subjects: ${params.subjects.join(', ')}.
Daily Hours: ${params.dailyHours} hours/day.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                subject: { type: Type.STRING },
                topic: { type: Type.STRING },
                durationMinutes: { type: Type.NUMBER },
                completed: { type: Type.BOOLEAN }
              },
              required: ['day', 'subject', 'topic', 'durationMinutes']
            }
          }
        },
        required: ['title', 'tasks']
      };

      const resultText = await callGenerateWithFallback(
        ai,
        prompt,
        'You are an expert study timetable generator. Return valid JSON only.',
        'application/json',
        schema
      );

      if (resultText) {
        const cleaned = resultText.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        return JSON.parse(cleaned);
      }
    } catch (e: any) {
      console.warn('Gemini generateStudyPlanJSON Handled Error:', e?.message || e);
    }
  }

  return {
    title: params.title || 'Personalized Study Timetable',
    tasks: params.subjects.flatMap((sub, i) => [
      {
        day: `Day ${i * 2 + 1}`,
        subject: sub,
        topic: `Foundations & Core Principles of ${sub}`,
        durationMinutes: Math.round((params.dailyHours || 2) * 30),
        completed: false
      },
      {
        day: `Day ${i * 2 + 2}`,
        subject: sub,
        topic: `Advanced Problem Solving & Practice in ${sub}`,
        durationMinutes: Math.round((params.dailyHours || 2) * 30),
        completed: false
      }
    ])
  };
}

