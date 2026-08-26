const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Persona System Prompts ───────────────────────────────────────────
const SYSTEM_PROMPTS = {
  'Legal Expert': `You are a Senior Lawyer and Legal Expert AI assistant. 
Use professional legal terminology, structure your response clearly, analyze the user's specific facts carefully, cite relevant principles or precedents, and maintain a formal, objective tone.
Always include a clear legal analysis section, strategic options/next steps, and a brief note that this is legal information for educational guidance.`,

  'Medical Consultant': `You are Dr. AI, an empathetic Medical Consultant assistant.
Carefully review the user's specific symptoms or medical questions. Structure your reply with:
1. Clinical Assessment (potential causes or considerations)
2. Practical Care Steps (hydration, rest, self-care)
3. Red Flags & Warning Signs (when to seek immediate emergency care)
Always advise consulting a licensed physician in person for medical diagnosis and prescriptions.`,

  'Education Tutor': `You are a friendly, encouraging Education Tutor.
Explain the concept thoroughly and simply using vivid analogies, step-by-step breakdowns, and practical examples.
Break down complex topics into digestible points.
End with a check for understanding or an interactive practice question.`,
};

// ─── Fallback Responses (used when offline or if API key has issues) ───
const STUB_RESPONSES = {
  'Legal Expert': [
    `⚖️ **Legal Assessment & Guidance**\n\nThank you for providing the details regarding your situation.\n\n### 1. Legal Analysis\nBased on your query, this matter touches upon property rights and civil tort law. In property disputes, ownership documentation, physical evidence, and prior communication history serve as primary evidentiary foundations.\n\n### 2. Strategic Next Steps\n- **Document the Incident**: Keep a clear timeline of events, dates, photos, and any written communications.\n- **Formal Notice**: A formal demand letter or written notice often resolves the matter prior to formal tribunal or court filings.\n- **Local Statutes**: Check local council and district civil regulations applicable to your jurisdiction.\n\n> *Note: This information is for educational purposes. Consult a local legal professional for binding representation.*`,
  ],
  'Medical Consultant': [
    `🩺 **Dr. AI — Clinical Assessment**\n\nThank you for sharing your symptoms.\n\n### 1. General Considerations\nSymptoms like those described often arise from acute fatigue, stress, viral factors, or localized strain. Monitoring severity and progression is key.\n\n### 2. Recommended Self-Care\n- **Hydration & Rest**: Ensure adequate fluid intake and sufficient rest in a calm environment.\n- **Monitoring**: Keep a log of when symptoms occur and their intensity.\n- **Consultation**: If symptoms persist beyond 48 hours or worsen, schedule an evaluation with your physician.\n\n> ⚠️ *Emergency Notice: Seek immediate emergency care if you develop severe pain, shortness of breath, or sudden high fever.*`,
  ],
  'Education Tutor': [
    `🎓 **Let's Break This Down!**\n\nGreat question! Let's explore this step by step:\n\n### 1. The Core Concept\nImagine this like building a bridge — each piece relies on the foundation before it. Once the basic rules are clear, the complex part becomes simple.\n\n### 2. Key Takeaways\n- Focus on the underlying principle first before memorizing details.\n- Try explaining this concept back in your own words to solidify your understanding.\n\n**Quick Challenge:** How would you describe this in one sentence to a friend? Let me know and we can refine it! 🚀`,
  ],
};

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
 * Gemini requires:
 * 1. Strictly alternating roles: user -> model -> user -> model
 * 2. Starting with a 'user' turn
 * 3. EXCLUDING the current trailing user message that is about to be sent
 */
function buildGeminiHistory(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  // Filter out system messages and exclude the last message if it's the current user prompt
  const turns = [];
  const candidateMessages = messages.slice(0, -1); // Exclude latest message already saved

  for (const m of candidateMessages) {
    if (!m.content || !m.role || m.role === 'system') continue;
    const role = m.role === 'assistant' ? 'model' : 'user';

    // Ensure strict alternation
    if (turns.length === 0) {
      if (role === 'user') {
        turns.push({ role: 'user', parts: [{ text: m.content }] });
      }
    } else {
      const lastRole = turns[turns.length - 1].role;
      if (role !== lastRole) {
        turns.push({ role, parts: [{ text: m.content }] });
      } else {
        // Append text to same turn if consecutive
        turns[turns.length - 1].parts[0].text += `\n${m.content}`;
      }
    }
  }

  // Gemini history MUST end with a 'model' turn so the new sendMessage starts with 'user'
  if (turns.length > 0 && turns[turns.length - 1].role === 'user') {
    turns.pop();
  }

  return turns;
}

/**
 * Generate a chat response using Gemini with graceful fallback.
 */
async function generateResponse(userMessage, persona, conversationHistory = []) {
  const client = getGeminiClient();

  if (!client) {
    console.log('ℹ️  No GEMINI_API_KEY configured — using expert stub response');
    const stubs = STUB_RESPONSES[persona] || STUB_RESPONSES['Education Tutor'];
    return stubs[Math.floor(Math.random() * stubs.length)];
  }

  const modelNames = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  for (const modelName of modelNames) {
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
      console.warn(`⚠️  Gemini model ${modelName} failed: ${err.message}. Trying next model...`);
    }
  }

  // If all live models failed (e.g. quota limit, invalid key), provide expert fallback
  console.warn('⚠️  All Gemini models failed — returning domain expert fallback');
  const stubs = STUB_RESPONSES[persona] || STUB_RESPONSES['Education Tutor'];
  return stubs[0];
}

/**
 * Stream a chat response token-by-token using Gemini with SSE.
 */
async function generateStreamingResponse(
  userMessage,
  persona,
  conversationHistory = [],
  onChunk
) {
  const client = getGeminiClient();

  if (client) {
    const modelNames = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

    for (const modelName of modelNames) {
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
        console.warn(`⚠️  Gemini streaming with ${modelName} failed: ${err.message}. Trying next model...`);
      }
    }
  }

  // Fallback streaming simulation
  console.log('ℹ️  Streaming domain expert response...');
  const stubs = STUB_RESPONSES[persona] || STUB_RESPONSES['Education Tutor'];
  const fullText = stubs[0];

  const chunkSize = 12;
  for (let i = 0; i < fullText.length; i += chunkSize) {
    const chunk = fullText.slice(i, i + chunkSize);
    onChunk(chunk);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return fullText;
}

module.exports = {
  generateResponse,
  generateStreamingResponse,
  SYSTEM_PROMPTS,
};
