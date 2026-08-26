const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Persona System Prompts ───────────────────────────────────────────
// Ported from the original Python GeniusBot — these shape the LLM's personality.
const SYSTEM_PROMPTS = {
  'Legal Expert': `You are a Senior Lawyer and Legal Expert AI assistant. 
Use professional legal jargon, cite legal precedents when relevant (e.g., "In the landmark case of..."), 
and maintain a formal, cautious tone. Structure your responses with clear sections when appropriate.
Always include a disclaimer that this is AI-generated legal information, not legal advice.
Ask clarifying questions when needed to provide more specific guidance.`,

  'Medical Consultant': `You are Dr. AI, a Medical Consultant assistant.
Be empathetic and clear. Use proper medical terminology but explain it in plain language.
Structure your responses: symptoms assessment, possible considerations, and recommended next steps.
Always advise consulting a healthcare professional in person for actual medical decisions.
Ask about symptom severity, duration, and relevant history to provide better guidance.`,

  'Education Tutor': `You are a friendly, encouraging Education Tutor.
Use analogies, real-world examples, and simple language to explain complex topics.
Break down concepts into digestible parts using bullet points and numbered steps.
Adapt your explanations based on the learner's apparent level.
End responses with encouragement and suggest next learning steps.
Ask what the student already knows to tailor your explanation.`,
};

// ─── Stub Responses (used when no API key is set) ─────────────────────
// These aren't random — they demonstrate the persona concept even without an LLM.
const STUB_RESPONSES = {
  'Legal Expert': [
    `⚖️ **Legal Analysis**\n\nThank you for your query. Based on the information provided:\n\n1. **Preliminary Assessment**: This matter would typically fall under civil jurisdiction.\n2. **Relevant Framework**: The applicable statutes would need to be reviewed in the context of your jurisdiction.\n3. **Recommended Action**: I would advise documenting all relevant communications and evidence.\n\n> *Disclaimer: This is AI-generated information for educational purposes, not legal advice. Please consult a licensed attorney for your specific situation.*`,
    `⚖️ **Legal Perspective**\n\nThis is an interesting legal question. Let me break it down:\n\n- **Key Consideration**: The burden of proof in such matters typically rests with the claimant.\n- **Precedent**: Similar cases have generally been resolved through mediation before reaching trial.\n- **Timeline**: Statute of limitations varies by jurisdiction — this is critical to verify.\n\nWould you like me to explore any of these points in more detail?`,
  ],
  'Medical Consultant': [
    `🩺 **Dr. AI — Medical Assessment**\n\nThank you for sharing that information. Here's my assessment:\n\n**Symptom Review:**\n- The symptoms you describe could have several possible explanations\n- Duration and severity are important factors\n\n**General Guidance:**\n1. Stay hydrated and get adequate rest\n2. Monitor symptoms for any changes\n3. Keep a symptom diary with times and severity\n\n> ⚠️ **Important**: Please consult a healthcare professional for proper diagnosis and treatment. This is informational guidance only.`,
    `🩺 **Dr. AI Here**\n\nI appreciate you reaching out. Let me help you think through this:\n\n**What I'd Want to Know:**\n- How long have you experienced this?\n- Any recent changes in diet, stress, or medication?\n- Is the discomfort constant or intermittent?\n\n**In the Meantime:**\n- Rest and hydration are always good first steps\n- Over-the-counter pain relief if appropriate\n\nCould you share more details so I can provide more specific guidance?`,
  ],
  'Education Tutor': [
    `🎓 **Let's Learn Together!**\n\nGreat question! Let me break this down in a way that makes sense:\n\n**Think of it like this:**\nImagine you're building with LEGO blocks. Each concept is a block, and understanding how they connect is what makes the full picture.\n\n**Key Points:**\n1. Start with the fundamentals — they're the foundation\n2. Practice with small examples before tackling big problems\n3. Don't worry about memorizing everything — focus on understanding *why*\n\n**Try This:** Can you explain what you already know about this topic? That way I can fill in the gaps!\n\nKeep up the great work! 🌟`,
    `🎓 **Great Question!**\n\nI love your curiosity! Here's a simple way to understand this:\n\n**The Simple Version:**\nThink of it as a recipe — you need ingredients (inputs), a process (the method), and you get a result (output).\n\n**Step by Step:**\n1. **First**, identify what you already know\n2. **Then**, connect it to what's new\n3. **Finally**, test your understanding with an example\n\n**Homework Challenge:** Try explaining this concept to someone else in your own words. If you can teach it, you've truly learned it!\n\nYou're doing amazing — keep that curiosity alive! 🚀`,
  ],
};

// ─── Gemini Client (lazy-initialized) ─────────────────────────────────
let genAI = null;

function getGeminiClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Build the message history array that Gemini expects.
 * Gemini uses { role: 'user' | 'model', parts: [{ text }] } format.
 */
function buildGeminiHistory(messages) {
  return messages
    .filter((m) => m.role !== 'system') // Gemini handles system prompt separately
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

// ─── Main Chat Function ──────────────────────────────────────────────

/**
 * Generate a chat response using Gemini, or fall back to stub responses.
 *
 * @param {string} userMessage - The user's message
 * @param {string} persona - One of the 3 persona keys
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<string>} The assistant's reply
 */
async function generateResponse(userMessage, persona, conversationHistory = []) {
  const client = getGeminiClient();

  // If no API key is configured, return a stub response
  if (!client) {
    console.log('ℹ️  No GEMINI_API_KEY set — using stub response');
    const stubs = STUB_RESPONSES[persona] || STUB_RESPONSES['Education Tutor'];
    return stubs[Math.floor(Math.random() * stubs.length)];
  }

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPTS[persona],
    });

    const history = buildGeminiHistory(conversationHistory);

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    // Graceful degradation: if the API fails, still return something useful
    throw new Error('LLM service temporarily unavailable. Please try again.');
  }
}

// ─── Streaming Chat Function (SSE) ──────────────────────────────────

/**
 * Stream a chat response token-by-token using Gemini's streaming API.
 * Calls `onChunk` for each text chunk as it arrives.
 *
 * @param {string} userMessage
 * @param {string} persona
 * @param {Array} conversationHistory
 * @param {Function} onChunk - Called with each text chunk: onChunk(text)
 * @returns {Promise<string>} The full assembled response
 */
async function generateStreamingResponse(
  userMessage,
  persona,
  conversationHistory = [],
  onChunk
) {
  const client = getGeminiClient();

  // Stub mode: simulate streaming by sending chunks with delays
  if (!client) {
    console.log('ℹ️  No GEMINI_API_KEY set — simulating streamed stub response');
    const stubs = STUB_RESPONSES[persona] || STUB_RESPONSES['Education Tutor'];
    const fullText = stubs[Math.floor(Math.random() * stubs.length)];

    // Simulate streaming: send ~10 chars at a time with small delays
    const chunkSize = 10;
    for (let i = 0; i < fullText.length; i += chunkSize) {
      const chunk = fullText.slice(i, i + chunkSize);
      onChunk(chunk);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return fullText;
  }

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPTS[persona],
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

    return fullResponse;
  } catch (err) {
    console.error('❌ Gemini streaming error:', err.message);
    throw new Error('LLM service temporarily unavailable. Please try again.');
  }
}

module.exports = {
  generateResponse,
  generateStreamingResponse,
  SYSTEM_PROMPTS,
};
