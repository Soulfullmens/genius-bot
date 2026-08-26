import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Renders a single message bubble with role-based styling.
 * Assistant messages support Markdown rendering.
 *
 * Props:
 *   - role: 'user' | 'assistant'
 *   - content: string (text or markdown)
 *   - timestamp: ISO string
 *   - isStreaming: boolean (shows cursor animation when true)
 *   - personaIcon: string (emoji for assistant avatar)
 */
function MessageBubble({ role, content, timestamp, isStreaming, personaIcon }) {
  const isUser = role === 'user';

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className={`message message--${role}`}>
      <div className="message__avatar">
        {isUser ? '👤' : personaIcon || '🤖'}
      </div>
      <div>
        <div className="message__body">
          {isUser ? (
            content
          ) : (
            <>
              <ReactMarkdown>{content}</ReactMarkdown>
              {isStreaming && <span className="streaming-cursor">▊</span>}
            </>
          )}
        </div>
        {formattedTime && <div className="message__time">{formattedTime}</div>}
      </div>
    </div>
  );
}

export default React.memo(MessageBubble);
