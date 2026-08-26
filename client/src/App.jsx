import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import { useChat } from './hooks/useChat';
import { useConversations } from './hooks/useConversations';

/**
 * Root App component.
 *
 * Manages global state (persona selection) and wires together:
 *   - Sidebar (persona selector + conversation history)
 *   - ChatView (message list + input)
 *   - useChat hook (chat logic + streaming)
 *   - useConversations hook (conversation CRUD)
 *
 * State lifting: persona lives here because both Sidebar and ChatView need it.
 * Chat messages live in useChat, conversations in useConversations.
 */
function App() {
  const [persona, setPersona] = useState('Legal Expert');

  // Chat hook — owns messages, loading, error, streaming
  const {
    messages,
    isLoading,
    error,
    conversationId,
    sendChat,
    loadMessages,
    clearChat,
    clearError,
  } = useChat();

  // Handler for when a conversation is selected from the sidebar
  const handleConversationSelect = useCallback(
    (loadedMessages, id, loadedPersona) => {
      if (loadedPersona) setPersona(loadedPersona);
      loadMessages(loadedMessages, id);
    },
    [loadMessages]
  );

  // Conversations hook — owns the conversation list
  const {
    conversations,
    activeId,
    setActiveId,
    fetchConversations,
    selectConversation,
    removeConversation,
    rename,
    clearSelection,
  } = useConversations(handleConversationSelect);

  // Send a message — after it completes, refresh the conversation list
  const handleSend = useCallback(
    async (text) => {
      await sendChat(text, persona);
      // Refresh conversations so the new/updated one appears in the sidebar
      fetchConversations();
    },
    [sendChat, persona, fetchConversations]
  );

  // Update activeId when the chat hook gets a conversationId from the server
  React.useEffect(() => {
    if (conversationId && conversationId !== activeId) {
      setActiveId(conversationId);
    }
  }, [conversationId, activeId, setActiveId]);

  // New chat: clear messages and deselect conversation
  const handleNewChat = useCallback(() => {
    clearChat();
    clearSelection();
  }, [clearChat, clearSelection]);

  // Persona change: start fresh
  const handlePersonaChange = useCallback(
    (newPersona) => {
      setPersona(newPersona);
      clearChat();
      clearSelection();
    },
    [clearChat, clearSelection]
  );

  return (
    <div className="app" data-persona={persona}>
      <Sidebar
        persona={persona}
        onPersonaChange={handlePersonaChange}
        conversations={conversations}
        activeConversationId={activeId}
        onSelectConversation={selectConversation}
        onDeleteConversation={removeConversation}
        onRenameConversation={rename}
        onNewChat={handleNewChat}
      />
      <ChatView
        messages={messages}
        isLoading={isLoading}
        error={error}
        persona={persona}
        onSend={handleSend}
        onClearError={clearError}
      />
    </div>
  );
}

export default App;
