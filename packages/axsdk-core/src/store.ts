import { createStore, type StoreApi } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatSession, ChatMessage, MessagePart, AXSDKTranslationsSchema } from './types/index';
import type { QuestionData } from './types/chat';
import { nanoid } from 'nanoid';

const ERROR_STORE_MAX_CAPACITY = 50;

export interface ApiError {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  status: number;
  statusText: string;
  message: string;
  requestBody?: unknown;
  responseBody?: unknown;
}

export interface ErrorState {
  errors: ApiError[];
  addError: (error: Omit<ApiError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

export const errorStore = createStore<ErrorState>()((set) => ({
  errors: [],
  addError: (error) =>
    set((state) => {
      const newError: ApiError = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...error,
      };
      const updated = [newError, ...state.errors];
      return { errors: updated.slice(0, ERROR_STORE_MAX_CAPACITY) };
    }),
  removeError: (id) =>
    set((state) => ({ errors: state.errors.filter((e) => e.id !== id) })),
  clearErrors: () => set({ errors: [] }),
}));

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
  chatWasEverOpened: boolean;
  session: ChatSession | null;
  setSession: (session: ChatSession | null) => void;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  updateMessage: (message: ChatMessage) => void;
  setIsOpen: (isOpen: boolean) => void;
  setChatWasEverOpened: (value: boolean) => void;
  translations: Record<string, AXSDKTranslationsSchema>;
  setTranslations: (translations: Record<string, AXSDKTranslationsSchema>) => void;
  questions: QuestionData | null;
  setQuestions: (question: QuestionData | null) => void;
}

export const chatStore = createStore<ChatState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      isOpen: false,
      chatWasEverOpened: false,
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
      setChatWasEverOpened: (value: boolean) => set({ chatWasEverOpened: value }),
      translations: {},
      setTranslations: (translations: Record<string, AXSDKTranslationsSchema>) => set({ translations }),
      questions: null,
      setQuestions: (questions: QuestionData | null) => set({ questions }),
    }),
    {
      name: 'axsdk:chat',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session, messages: state.messages, isOpen: state.isOpen }),
    }
  ),
);
