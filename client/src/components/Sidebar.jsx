import React, { useState } from 'react';
import PersonaSelector from './PersonaSelector';

/**
 * Sidebar component — conversation history list + persona selector + new chat button.
 *
 * Props:
 *   - persona: string — active persona
 *   - onPersonaChange: (persona: string) => void
 *   - conversations: Array — list of conversation objects
 *   - activeConversationId: string | null
 *   - onSelectConversation: (id: string) => void
 *   - onDeleteConversation: (id: string) => void
 *   - onRenameConversation: (id: string, title: string) => void
 *   - onNewChat: () => void
 */
function Sidebar({
  persona,
  onPersonaChange,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onNewChat,
}) {
  // Track which conversation is being renamed (null = none)
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startRename = (e, conv) => {
    e.stopPropagation();
    setEditingId(conv._id);
    setEditTitle(conv.title || '');
  };

  const submitRename = (id) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      submitRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <aside className="sidebar">
      {/* Header + New Chat */}
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">🤖</span>
          GeniusBot
        </div>
        <button
          className="sidebar__new-chat"
          onClick={onNewChat}
          id="new-chat-btn"
        >
          ＋ New Chat
        </button>
      </div>

      {/* Persona Selector */}
      <PersonaSelector active={persona} onChange={onPersonaChange} />

      {/* Conversation History */}
      <div className="sidebar__conversations">
        <div className="sidebar__section-title">Recent</div>
        {conversations.length === 0 ? (
          <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv._id}
              className={`conversation-item ${
                activeConversationId === conv._id
                  ? 'conversation-item--active'
                  : ''
              }`}
              onClick={() => onSelectConversation(conv._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === 'Enter' && onSelectConversation(conv._id)
              }
            >
              <span style={{ fontSize: '14px' }}>💬</span>

              {/* Inline rename: show input when editing, text otherwise */}
              {editingId === conv._id ? (
                <input
                  className="conversation-item__rename-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => handleRenameKeyDown(e, conv._id)}
                  onBlur={() => submitRename(conv._id)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  aria-label="Rename conversation"
                />
              ) : (
                <span className="conversation-item__title">
                  {conv.title || 'Untitled'}
                </span>
              )}

              {/* Action buttons (only show when not editing) */}
              {editingId !== conv._id && (
                <>
                  <button
                    className="conversation-item__action"
                    onClick={(e) => startRename(e, conv)}
                    aria-label="Rename conversation"
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    className="conversation-item__delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv._id);
                    }}
                    aria-label="Delete conversation"
                    title="Delete"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
