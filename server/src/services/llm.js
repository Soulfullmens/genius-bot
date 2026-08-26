const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Persona System Instructions ─────────────────────────────────────
const SYSTEM_PROMPTS = {
  'Legal Expert': `You are a Senior Lawyer and Legal Expert assistant.
Analyze the user's specific scenario in detail. Address the exact facts they provide.
Structure your reply with clear sections:
1. Legal Analysis (applicable legal principles, torts, or statutory considerations)
2. Strategic Options & Remedies (practical steps, notices, documentation)
3. Immediate Recommendation
Maintain a formal, objective tone. Always include a brief disclaimer that this is educational legal information, not binding legal counsel.`,

  'Medical Consultant': `You are Dr. AI, an empathetic Medical Consultant assistant.
Carefully review the user's symptoms and questions.
Structure your reply with:
1. Clinical Impressions (potential considerations based on described symptoms)
2. Practical Care & Self-Care Steps (hydration, rest, observation)
3. Red Flags & Warning Signs (when to seek emergency care immediately)
Always advise consulting a licensed physician in person for proper diagnosis.`,

  'Education Tutor': `You are an engaging, friendly Education Tutor.
Explain concepts thoroughly using vivid real-world analogies, step-by-step breakdowns, and practical examples.
Break down complex topics into digestible points.
End with a quick practice question or check for understanding to keep the student engaged.`,
};

// ─── Honest Demo Stub (used ONLY when no API key is configured) ───────
function getOfflineStub(persona) {
  return `ℹ️ **[Demo Mode — No API Key Configured]**\n\nThis is a static placeholder response for the **${persona}** persona.\n\nTo enable live, dynamic, context-aware AI answers powered by Google Gemini:\n1. Get a free API key at **https://aistudio.google.com/apikey** (starts with \`AIzaSy...\`)\n2. Add it as \`GEMINI_API_KEY\` in your environment variables\n3. Restart the server`;
}

let genAI = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  if (!genAI && apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Format conversation history into valid Gemini turns.
 * Excludes the current trailing message (which is sent via sendMessage).
 * Ensures turns start with 'user' and strictly alternate: user -> model -> user -> model.
 */
function buildGeminiHistory(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const turns = [];
  const candidateMessages = messages.slice(0, -1); // Exclude the active message

  for (const m of candidateMessages) {
    if (!m.content || !m.role || m.role === 'system') continue;
    const role = m.role === 'assistant' ? 'model' : 'user';

    if (turns.length === 0) {
      if (role === 'user') {
        turns.push({ role: 'user', parts: [{ text: m.content }] });
      }
    } else {
      const lastRole = turns[turns.length - 1].role;
      if (role !== lastRole) {
        turns.push({ role, parts: [{ text: m.content }] });
      } else {
        turns[turns.length - 1].parts[0].text += `\n${m.content}`;
      }
    }
  }

  // Gemini history MUST end with a 'model' turn so the next sendMessage starts with 'user'
  if (turns.length > 0 && turns[turns.length - 1].role === 'user') {
    turns.pop();
  }

  return turns;
}

/**
 * Generate a non-streaming response using Google Gemini.
 */
async function generateResponse(userMessage, persona, conversationHistory = []) {
  const client = getGeminiClient();

  if (!client) {
    return getOfflineStub(persona);
  }

  const modelNames = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ];
  let lastError = null;

  for (const modelName of modelNames) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPTS[persona] || SYSTEM_PROMPTS['Education Tutor'],
        });
        const history = buildGeminiHistory(conversationHistory);
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(userMessage);
        const text = result.response.text();
        if (text) return text;
      } catch (err) {
        lastError = err;
        console.warn(`⚠️  Gemini ${modelName} attempt ${attempt + 1} failed: ${err.message}`);
        if (err.message.includes('503') || err.message.includes('429')) {
          await new Promise((r) => setTimeout(r, 600));
        } else {
          break; // Don't retry non-transient errors on same model
        }
      }
    }
  }

  throw new Error(
    lastError?.message?.includes('503')
      ? "Google's AI service is temporarily experiencing high traffic. Please try again in a moment."
      : `Gemini API error: ${lastError?.message || 'Failed to generate response'}`
  );
}

/**
 * Stream a response token-by-token using Google Gemini with SSE.
 */
async function generateStreamingResponse(
  userMessage,
  persona,
  conversationHistory = [],
  onChunk
) {
  const client = getGeminiClient();

  if (!client) {
    const stubText = getOfflineStub(persona);
    const chunkSize = 12;
    for (let i = 0; i < stubText.length; i += chunkSize) {
      const chunk = stubText.slice(i, i + chunkSize);
      onChunk(chunk);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return stubText;
  }

  const modelNames = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ];
  let lastError = null;

  for (const modelName of modelNames) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPTS[persona] || SYSTEM_PROMPTS['Education Tutor'],
        });
        const history = buildGeminiHistory(conversationHistory);
        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(userMessage);

        let fullResponse = '';
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullResponse += text;
            onChunk(text);
          }
        }

        if (fullResponse.trim().length > 0) {
          return fullResponse;
        }
      } catch (err) {
        lastError = err;
        console.warn(`⚠️  Gemini stream ${modelName} attempt ${attempt + 1} failed: ${err.message}`);
        if (err.message.includes('503') || err.message.includes('429')) {
          await new Promise((r) => setTimeout(r, 600));
        } else {
          break;
        }
      }
    }
  }

  throw new Error(
    lastError?.message?.includes('503')
      ? "Google's AI service is temporarily experiencing high traffic. Please try again in a moment."
      : `Gemini API error: ${lastError?.message || 'Streaming failed'}`
  );
}

module.exports = {
  generateResponse,
  generateStreamingResponse,
  SYSTEM_PROMPTS,
};
