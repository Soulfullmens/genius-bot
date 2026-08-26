import { useState, useCallback, useRef } from 'react';
import { sendMessageStream, sendMessage } from '../services/api';

/**
 * Custom hook for chat functionality with streaming support.
 *
 * Encapsulates: sending messages, receiving streamed responses,
 * loading state, and error handling.
 *
 * Interview note: "Custom hooks let me extract stateful logic out of
 * components so it's reusable and testable. The component just calls
 * sendChat() and reads messages/isLoading — it doesn't know about
 * SSE parsing or API details."
 */
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const abortRef = useRef(false);

  /**
   * Send a message and stream the response.
   * Adds the user message immediately (optimistic UI),
   * then streams the assistant's response token by token.
   */
  const sendChat = useCallback(
    async (text, persona) => {
      if (!text.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);
      abortRef.current = false;

      // Optimistic: add user message immediately
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };

      // Prepare a placeholder for the assistant's streamed response
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        await sendMessageStream(
          text,
          persona,
          conversationId,
          // onChunk — append each token to the assistant message
          (chunk) => {
            if (abortRef.current) return;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + chunk,
                };
              }
              return updated;
            });
          },
          // onMeta — receive the conversationId from the server
          (newConversationId) => {
            setConversationId(newConversationId);
          },
          // onDone
          () => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  isStreaming: false,
                };
              }
              return updated;
            });
            setIsLoading(false);
          },
          // onError
          (errorMessage) => {
            setError(errorMessage);
            setIsLoading(false);
          }
        );
      } catch (err) {
        // Fallback: if streaming fails entirely, try non-streaming
        console.warn('Streaming failed, falling back to standard request:', err.message);
        try {
          const result = await sendMessage(text, persona, conversationId);
          setConversationId(result.conversationId);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: result.reply,
                isStreaming: false,
              };
            }
            return updated;
          });
        } catch (fallbackErr) {
          setError(fallbackErr.message || 'Failed to send message');
          // Remove the empty assistant message on total failure
          setMessages((prev) => prev.slice(0, -1));
        }
        setIsLoading(false);
      }
    },
    [conversationId, isLoading]
  );

  /**
   * Load an existing conversation's messages (when user clicks history).
   */
  const loadMessages = useCallback((loadedMessages, loadedConversationId) => {
    setMessages(
      loadedMessages.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        isStreaming: false,
      }))
    );
    setConversationId(loadedConversationId);
    setError(null);
  }, []);

  /**
   * Clear messages for a new conversation.
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  /**
   * Dismiss error toast.
   */
  const clearError = useCallback(() => setError(null), []);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    sendChat,
    loadMessages,
    clearChat,
    clearError,
  };
}
