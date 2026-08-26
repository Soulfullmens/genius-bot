import React from 'react';

/**
 * Animated typing indicator (three bouncing dots).
 * Shown while waiting for the LLM response.
 */
function TypingIndicator() {
  return (
    <div className="message message--assistant">
      <div className="message__avatar">🤖</div>
      <div className="message__body">
        <div className="typing-indicator">
          <div className="typing-indicator__dot" />
          <div className="typing-indicator__dot" />
          <div className="typing-indicator__dot" />
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;
