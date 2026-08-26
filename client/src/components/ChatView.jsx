import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';

const PERSONA_ICONS = {
  'Legal Expert': '⚖️',
  'Medical Consultant': '🩺',
  'Education Tutor': '🎓',
};

/**
 * Main chat view — message list + input box.
 *
 * Demonstrates: useRef (for auto-scroll), controlled textarea,
 * conditional rendering (welcome vs messages), form handling.
 *
 * Props:
 *   - messages: Array — from useChat hook
 *   - isLoading: boolean
 *   - error: string | null
 *   - persona: string
 *   - onSend: (text: string) => void
 *   - onClearError: () => void
 */
function ChatView({ messages, isLoading, error, persona, onSend, onClearError }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(onClearError, 5000);
      return () => clearTimeout(timer); // Cleanup on unmount or new error
    }
  }, [error, onClearError]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle Enter key (submit), Shift+Enter (new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea as user types
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // Handle clicking an example prompt from the welcome screen
  const handlePromptClick = (text) => {
    onSend(text);
  };

  const hasMessages = messages.length > 0;

  return (
    <main className="chat-area">
      {/* Header */}
      <div className="chat-area__header">
        <span className="chat-area__persona-badge">
          {PERSONA_ICONS[persona] || '🤖'} {persona}
        </span>
        <span className={`chat-area__status chat-area__status--online`}>
          ● Online
        </span>
      </div>

      {/* Messages or Welcome */}
      {hasMessages ? (
        <div className="messages" id="messages-container">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              isStreaming={msg.isStreaming}
              personaIcon={PERSONA_ICONS[persona]}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <WelcomeScreen persona={persona} onPromptClick={handlePromptClick} />
      )}

      {/* Error Toast */}
      {error && (
        <div className="error-toast" onClick={onClearError} role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input">
        <form className="chat-input__form" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className="chat-input__textarea"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Ask your ${persona}...`}
            rows={1}
            disabled={isLoading}
            id="chat-input"
            aria-label="Type your message"
          />
          <button
            type="submit"
            className="chat-input__send"
            disabled={!input.trim() || isLoading}
            id="send-btn"
            aria-label="Send message"
          >
            ➤
          </button>
        </form>
        <div className="chat-input__hint">
          Press Enter to send · Shift+Enter for new line
        </div>
      </div>
    </main>
  );
}

export default ChatView;
