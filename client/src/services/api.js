import axios from 'axios';

/**
 * Axios instance configured for the Express API.
 *
 * In development, Vite's proxy handles /api → localhost:3001.
 * In production, set VITE_API_URL to the deployed API URL.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout for LLM responses
});

// ─── Chat API ─────────────────────────────────────────────────────────

/**
 * Send a message (non-streaming).
 * Used as fallback if streaming fails.
 */
export async function sendMessage(message, persona, conversationId = null) {
  const { data } = await api.post('/chat', {
    message,
    persona,
    ...(conversationId && { conversationId }),
  });
  return data.data; // { conversationId, reply }
}

/**
 * Send a message with streaming (SSE).
 * Returns a reader that yields text chunks.
 *
 * We use fetch instead of axios here because axios doesn't support
 * reading response streams in the browser.
 */
export async function sendMessageStream(
  message,
  persona,
  conversationId,
  onChunk,
  onMeta,
  onDone,
  onError
) {
  const baseURL = import.meta.env.VITE_API_URL || '/api';

  const response = await fetch(`${baseURL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      persona,
      ...(conversationId && { conversationId }),
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Stream request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE format: each event is "data: <json>\n\n"
    const lines = buffer.split('\n\n');
    buffer = lines.pop(); // Keep incomplete data in buffer

    for (const line of lines) {
      const dataLine = line.trim();
      if (!dataLine.startsWith('data: ')) continue;

      try {
        const parsed = JSON.parse(dataLine.slice(6)); // Remove "data: "

        switch (parsed.type) {
          case 'meta':
            onMeta?.(parsed.conversationId);
            break;
          case 'chunk':
            onChunk?.(parsed.content);
            break;
          case 'done':
            onDone?.();
            break;
          case 'error':
            onError?.(parsed.message);
            break;
        }
      } catch {
        // Skip malformed events
      }
    }
  }
}

// ─── Conversations API ────────────────────────────────────────────────

export async function getConversations() {
  const { data } = await api.get('/chat/conversations');
  return data.data; // Array of conversations
}

export async function getConversation(id) {
  const { data } = await api.get(`/chat/conversations/${id}`);
  return data.data; // Conversation with messages
}

export async function deleteConversation(id) {
  await api.delete(`/chat/conversations/${id}`);
}

export async function renameConversation(id, title) {
  const { data } = await api.put(`/chat/conversations/${id}/title`, { title });
  return data.data;
}

// ─── Health API ───────────────────────────────────────────────────────

export async function getHealth() {
  const { data } = await api.get('/health');
  return data.data;
}

export default api;
