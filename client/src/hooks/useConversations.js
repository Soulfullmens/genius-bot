import { useState, useEffect, useCallback } from 'react';
import {
  getConversations,
  getConversation,
  deleteConversation,
  renameConversation,
} from '../services/api';

/**
 * Custom hook for managing the conversation list.
 *
 * Handles fetching, selecting, deleting, and renaming conversations.
 * The selected conversation's messages are loaded via the onSelect callback.
 */
export function useConversations(onSelect) {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);

  /**
   * Fetch all conversations from the API.
   * Called on mount and after creating/deleting conversations.
   */
  const fetchConversations = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /**
   * Select a conversation — fetches its messages.
   */
  const selectConversation = useCallback(
    async (id) => {
      if (id === activeId) return;
      setActiveId(id);
      try {
        const data = await getConversation(id);
        onSelect?.(data.messages, id, data.persona);
      } catch (err) {
        console.error('Failed to load conversation:', err);
      }
    },
    [activeId, onSelect]
  );

  /**
   * Delete a conversation.
   */
  const removeConversation = useCallback(
    async (id) => {
      try {
        await deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c._id !== id));
        if (activeId === id) {
          setActiveId(null);
          onSelect?.([], null, null);
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [activeId, onSelect]
  );

  /**
   * Rename a conversation.
   */
  const rename = useCallback(async (id, title) => {
    try {
      const updated = await renameConversation(id, title);
      setConversations((prev) =>
        prev.map((c) => (c._id === id ? { ...c, title: updated.title } : c))
      );
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  }, []);

  /**
   * Clear selection (start new conversation).
   */
  const clearSelection = useCallback(() => {
    setActiveId(null);
  }, []);

  return {
    conversations,
    activeId,
    isLoadingList,
    setActiveId,
    fetchConversations,
    selectConversation,
    removeConversation,
    rename,
    clearSelection,
  };
}
