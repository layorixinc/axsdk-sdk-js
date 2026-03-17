import { createStore, type StoreApi } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatSession, ChatMessage, MessagePart, AXSDKTranslationsSchema } from './types/index';
import { nanoid } from 'nanoid';

export interface AppState {
  isLoading: boolean;
  apiKey: string | undefined;
  appId: string | undefined;
  appUserId: string | undefined;
  appAuthToken: string | undefined;
  language: string;
  setApiKey: (apiKey: string | undefined) => void;
  setAppId: (appId: string | undefined) => void;
  getAppUserId: () => string;
  resetAppUserId: () => void;
  setLanguage: (language: string) => void;
  setAppAuthToken: (token: string | undefined) => void;
}

export const appStore = createStore<AppState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      apiKey: undefined,
      appId: undefined,
      appUserId: undefined,
      appAuthToken: undefined,
      language: 'en',
      setApiKey: (apiKey: string | undefined) => set({ apiKey }),
      setAppId: (appId: string | undefined) => set({ appId }),
      getAppUserId: () => { const appUserId = get().appUserId || `${get().appId}-user-${nanoid()}`; set({ appUserId }); return appUserId; },
      resetAppUserId: () => set({ appUserId: undefined }),
      setAppAuthToken: (token: string | undefined) => set({ appAuthToken: token }),
      setLanguage: (language: string) => set({ language }),
    }),
    {
      name: 'axsdk:app',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ apiKey: state.apiKey, appId: state.appId, appUserId: state.appUserId }),
    }
  ),
);

export interface ChatState {
  isLoading: boolean;
  isOpen: boolean;
  session: ChatSession | null;
  setSession: (session: ChatSession | null) => void;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  updateMessage: (message: ChatMessage) => void;
  setIsOpen: (isOpen: boolean) => void;
  translations: Record<string, AXSDKTranslationsSchema>;
  setTranslations: (translations: Record<string, AXSDKTranslationsSchema>) => void;
}

export const chatStore = createStore<ChatState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      isOpen: false,
      session: null,
      setSession: (session) => set({ session }),
      messages: [],
      setMessages: (messages) => set({ messages }),
      updateMessage: (message: ChatMessage) => {
        const msgs = get().messages;
        const idx = msgs.findIndex(m => m.info.id === message.info.id);
        set({ messages: idx >= 0
          ? msgs.with(idx, { ...msgs[idx], ...message })
          : [...msgs, message].sort((a, b) => a.info.id.localeCompare(b.info.id)),
        });
      },
      setIsOpen: (isOpen) => set({ isOpen }),
      translations: {},
      setTranslations: (translations: Record<string, AXSDKTranslationsSchema>) => set({ translations }),
    }),
    {
      name: 'axsdk:chat',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session, messages: state.messages, isOpen: state.isOpen }),
    }
  ),
);
