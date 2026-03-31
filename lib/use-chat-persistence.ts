/**
 * useChatPersistence — shared chat persistence for all Zaeli channels.
 *
 * Uses expo-file-system (already in project, no native rebuild needed).
 * Persists last MAX_MESSAGES messages per channel with a 24hr TTL.
 *
 * Usage:
 *   const { messages, setMessages, clearMessages } = useChatPersistence('shopping');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

export interface PersistedMsg {
  id: string;
  role: 'user' | 'zaeli';
  text: string;
  ts?: string;
  isLoading?: boolean;
  quickReplies?: string[];
  imageUri?: string; // used by Calendar channel
}

const MAX_MESSAGES = 30;
const TTL_MS       = 24 * 60 * 60 * 1000; // 24 hours

interface StoredPayload {
  messages: PersistedMsg[];
  savedAt: number;
}

function chatFilePath(channelKey: string): string {
  return `${FileSystem.documentDirectory}zaeli_chat_${channelKey}.json`;
}

export function useChatPersistence(channelKey: string) {
  const [messages, setMessagesState] = useState<PersistedMsg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount
  useEffect(() => {
    (async () => {
      try {
        const path = chatFilePath(channelKey);
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          const raw = await FileSystem.readAsStringAsync(path);
          const payload: StoredPayload = JSON.parse(raw);
          const age = Date.now() - (payload.savedAt || 0);
          if (age < TTL_MS && Array.isArray(payload.messages)) {
            const clean = payload.messages.filter(m => !m.isLoading);
            setMessagesState(clean);
          } else {
            await FileSystem.deleteAsync(path, { idempotent: true });
          }
        }
      } catch (e) {
        console.log('[useChatPersistence] load error:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, [channelKey]);

  // Debounced save whenever messages change
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const toSave = messages.filter(m => !m.isLoading).slice(-MAX_MESSAGES);
        const path = chatFilePath(channelKey);
        if (toSave.length === 0) {
          await FileSystem.deleteAsync(path, { idempotent: true });
          return;
        }
        const payload: StoredPayload = { messages: toSave, savedAt: Date.now() };
        await FileSystem.writeAsStringAsync(path, JSON.stringify(payload));
      } catch (e) {
        console.log('[useChatPersistence] save error:', e);
      }
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages, loaded, channelKey]);

  // Wrapped setter with rolling cap
  const setMessages = useCallback(
    (updater: PersistedMsg[] | ((prev: PersistedMsg[]) => PersistedMsg[])) => {
      setMessagesState(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const nonLoading = next.filter(m => !m.isLoading);
        if (nonLoading.length > MAX_MESSAGES) {
          const overflow = nonLoading.length - MAX_MESSAGES;
          return [...next.filter(m => m.isLoading), ...nonLoading.slice(overflow)];
        }
        return next;
      });
    },
    [],
  );

  const clearMessages = useCallback(async () => {
    setMessagesState([]);
    try {
      await FileSystem.deleteAsync(chatFilePath(channelKey), { idempotent: true });
    } catch {}
  }, [channelKey]);

  return { messages, setMessages, clearMessages, loaded };
}
