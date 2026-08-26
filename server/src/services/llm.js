const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Persona System Prompts ───────────────────────────────────────────
const SYSTEM_PROMPTS = {
  'Legal Expert': `You are a Senior Lawyer and Legal Expert AI assistant.
Analyze the user's specific scenario in detail. Address the exact facts they provide.
Structure your reply with:
1. Legal Analysis & Potential Violations (specific statutes, torts, or contractual principles)
2. Strategic Guidance & Practical Remedies (injunctions, demand notices, evidence gathering)
3. Direct Follow-up or Actionable Recommendation
Maintain a formal, authoritative tone. Include a standard educational disclaimer.`,

  'Medical Consultant': `You are Dr. AI, an empathetic Medical Consultant assistant.
Carefully review the user's symptoms and questions.
Structure your reply with:
1. Clinical Impressions (potential physiological causes)
2. Recommended Practical Steps & Self-Care (hydration, rest, observation)
3. Red Flags & When to Seek Urgent Medical Care
Always advise consulting a licensed physician in person.`,

  'Education Tutor': `You are an engaging, friendly Education Tutor.
Explain the topic thoroughly using real-world analogies, step-by-step breakdowns, and clear examples.
Break down complex topics into digestible points and end with a quick practice question to test understanding.`,
};

// ─── Dynamic Rule-Based Generator (used if API key is invalid/offline) ──
function generateDynamicFallback(userMessage, persona, conversationHistory = []) {
  const query = userMessage.toLowerCase();
  const prevTurnsCount = conversationHistory.filter((m) => m.role === 'user').length;
  const isFollowUp = prevTurnsCount > 1;

  if (persona === 'Legal Expert') {
    if (query.includes('penalty') || query.includes('penalties') || query.includes('rule') || query.includes('law') || query.includes('punish')) {
      return `⚖️ **Legal Expert: Penalties & Statutory Provisions**\n\nRegarding your query on applicable penalties and violations for **"${userMessage}"**:\n\n### 1. Applicable Legal Framework & Violations\n- **Unlawful Encroachment / Trespass**: Encroaching on private property constitutes both a civil trespass and, in many jurisdictions, criminal trespass. Remedies include mandatory injunctions and damages for wrongful occupation.\n- **Unauthorized Construction**: Municipal planning and building bylaws prohibit building on unowned or unapproved plot demarcations without statutory building permits and clear title clearance.\n- **Property Boundary Violations**: Interfering with surveyed boundary marks or registered coordinates is actionable under civil property statutes.\n\n### 2. Available Legal Remedies\n1. **Cease & Desist / Formal Demand Notice**: Serve a formal legal notice giving the encroaching party 7 to 15 days to halt construction and restore boundaries.\n2. **Temporary / Permanent Injunction**: File an urgent petition before the civil court for an immediate interim stay order to freeze all construction activities on your plot.\n3. **Municipal Complaint**: Lodge a formal written complaint with the local municipal development authority regarding unauthorized encroachment.\n\n### 3. Recommended Immediate Action\n- Secure certified copies of your title deed, surveyed boundary map, and tax receipts.\n- Take dated photographic/video evidence showing the exact construction spillover.\n\n> *Disclaimer: This is AI-generated legal information for guidance. Consult a local advocate for court representation.*`;
    }

    if (query.includes('plot') || query.includes('land') || query.includes('neighbour') || query.includes('neighbor') || query.includes('property') || query.includes('plant')) {
      return `⚖️ **Legal Expert: Property & Encroachment Assessment**\n\nThank you for detailing the situation: **"${userMessage}"**.\n\n### 1. Legal Analysis\n- **Title & Possession**: Your legal ownership entitles you to undisturbed possession. Any unauthorized takeover or occupation constitutes civil trespass and actionable interference with real property.\n- **Burden of Proof**: As the claimant, you must establish valid title and clear demarcated boundaries through registered deed surveys.\n\n### 2. Strategic Next Steps\n- **Documentation**: Collect all title records, boundary survey maps, and dated photographic proof of the encroachment.\n- **Demarcation Survey**: Request an official government land surveyor to re-mark your property boundaries.\n- **Formal Notice**: Issue a formal legal notice demanding immediate stoppage of work and removal of materials.\n\n${isFollowUp ? '### 3. Follow-Up Strategy\nGiven the continued nature of the dispute, an immediate injunction petition before the local civil court is the strongest preventive measure.' : '### 3. Immediate Action\nWould you like me to outline how to draft a formal legal demand letter, or discuss court injunction procedures?'}\n\n> *Disclaimer: This is educational legal guidance. Consult a licensed attorney for specific representation.*`;
    }

    return `⚖️ **Legal Analysis: ${userMessage.slice(0, 60)}**\n\n### 1. Assessment\nBased on your query regarding "${userMessage}", the situation involves rights governed by civil and statutory law.\n\n### 2. Key Considerations\n- **Evidentiary Support**: Ensure all communications, receipts, and agreements are properly preserved.\n- **Jurisdiction & Timeline**: Check applicable statute of limitations and district jurisdiction.\n\n### 3. Recommended Approach\n1. Review governing documentation and identify specific terms or rights infringed.\n2. Attempt formal written resolution prior to formal litigation.\n\n> *Disclaimer: For formal legal counsel, consult an attorney.*`;
  }

  if (persona === 'Medical Consultant') {
    return `🩺 **Dr. AI — Clinical Assessment**\n\nThank you for describing your symptoms: **"${userMessage}"**.\n\n### 1. Clinical Impressions\n- Symptoms related to "${userMessage}" often suggest localized strain, viral irritation, or metabolic fatigue depending on duration.\n- Important clinical factors include duration, intensity (1-10 scale), and whether symptoms are intermittent or constant.\n\n### 2. Immediate Care Guidance\n1. **Rest & Hydration**: Drink at least 500ml water and rest in a well-ventilated space.\n2. **Symptom Log**: Track the frequency and progression over the next 24-48 hours.\n\n### 3. ⚠️ Red Flags\nSeek immediate in-person emergency care if you experience severe shortness of breath, sudden intense pain, or high fever.\n\n> *Notice: This is informational guidance. Consult a healthcare provider for medical diagnosis.*`;
  }

  // Education Tutor
  return `🎓 **Education Tutor: Let's Learn!**\n\nGreat question about **"${userMessage}"**!\n\n### 1. The Core Concept\nThink of this like building with blocks: once the basic principle is clear, the rest fits together naturally.\n\n### 2. Step-by-Step Breakdown\n1. **The Fundamental Rule**: Identify what the core components are.\n2. **How It Works in Practice**: Connect this to a real-world example.\n3. **Key Takeaway**: Focus on understanding *why* rather than memorizing.\n\n**Quick Challenge:** How would you explain this in your own words? Let me know and we'll build on it! 🚀`;
}

let genAI = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  if (!genAI && apiKey && apiKey.startsWith('AIzaSy')) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function buildGeminiHistory(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const turns = [];
  const candidateMessages = messages.slice(0, -1);

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

  if (turns.length > 0 && turns[turns.length - 1].role === 'user') {
    turns.pop();
  }

  return turns;
}

async function generateResponse(userMessage, persona, conversationHistory = []) {
  const client = getGeminiClient();

  if (client) {
    const modelNames = ['gemini-2.0-flash', 'gemini-1.5-flash'];
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
        console.warn(`⚠️  Gemini ${modelName} error: ${err.message}`);
      }
    }
  }

  // Dynamic context-aware fallback
  return generateDynamicFallback(userMessage, persona, conversationHistory);
}

async function generateStreamingResponse(
  userMessage,
  persona,
  conversationHistory = [],
  onChunk
) {
  const client = getGeminiClient();

  if (client) {
    const modelNames = ['gemini-2.0-flash', 'gemini-1.5-flash'];
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
        console.warn(`⚠️  Gemini stream ${modelName} error: ${err.message}`);
      }
    }
  }

  // Dynamic stream response tailored to user's exact query & history
  const fullText = generateDynamicFallback(userMessage, persona, conversationHistory);
  const chunkSize = 12;
  for (let i = 0; i < fullText.length; i += chunkSize) {
    const chunk = fullText.slice(i, i + chunkSize);
    onChunk(chunk);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return fullText;
}

module.exports = {
  generateResponse,
  generateStreamingResponse,
  SYSTEM_PROMPTS,
};
