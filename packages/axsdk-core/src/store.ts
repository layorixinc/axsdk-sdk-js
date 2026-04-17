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
        id: `err${nanoid()}`,
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
  appInfoReady: boolean;
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
  setAppInfoReady: (ready: boolean) => void;
}

export const appStore = createStore<AppState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      appInfoReady: false,
      apiKey: undefined,
      appId: undefined,
      appUserId: undefined,
      appAuthToken: undefined,
      language: 'en',
      setAppInfoReady: (ready: boolean) => set({ appInfoReady: ready }),
      setApiKey: (apiKey: string | undefined) => set({ apiKey }),
      setAppId: (appId: string | undefined) => set({ appId }),
      getAppUserId: () => {
        let appUserId = get().appUserId;
        if(!appUserId || !appUserId.startsWith(get().appId || ''))
          appUserId = `${get().appId}-user-${nanoid()}`;
        set({ appUserId });
        return appUserId;
      },
      resetAppUserId: () => set({ appUserId: undefined }),
      setAppAuthToken: (token: string | undefined) => set({ appAuthToken: token }),
      setLanguage: (language: string) => set({ language }),
    }),
    {
      name: 'axsdk:app',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : (() => {
        const noop = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        return noop;
      })())),
      partialize: (state) => ({ apiKey: state.apiKey, appId: state.appId, appUserId: state.appUserId }),
    }
  ),
);

export interface SessionClosed {
  message?: string;
}

export interface DeferredCall {
  deferId: string;
  callId: string;
  command: string;
  args: Record<string, unknown>;
  hints?: Record<string, unknown>;
  timeout: number;
  registeredAt: number;
}

export interface ChatState {
  isLoading: boolean;
  isOpen: boolean;
  chatWasEverOpened: boolean;
  session: ChatSession | null;
  setSession: (session: ChatSession | null) => void;
  sessionClosed: SessionClosed | null;
  setSessionClosed: (sessionClosed: SessionClosed | null) => void;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  updateMessage: (message: ChatMessage) => void;
  setIsOpen: (isOpen: boolean) => void;
  setChatWasEverOpened: (value: boolean) => void;
  translations: Record<string, AXSDKTranslationsSchema>;
  setTranslations: (translations: Record<string, AXSDKTranslationsSchema>) => void;
  questions: QuestionData | null;
  setQuestions: (question: QuestionData | null) => void;
  deferredCalls: DeferredCall[];
  setDeferredCalls: (calls: DeferredCall[]) => void;
  addDeferredCall: (call: DeferredCall) => void;
  removeDeferredCall: (deferId: string) => void;
}

export const chatStore = createStore<ChatState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      isOpen: false,
      chatWasEverOpened: false,
      session: null,
      setSession: (session) => set({ session }),
      sessionClosed: null,
      setSessionClosed: (sessionClosed) => set({ sessionClosed }),
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
      deferredCalls: [],
      setDeferredCalls: (calls: DeferredCall[]) => set({ deferredCalls: calls }),
      addDeferredCall: (call: DeferredCall) => set((state) => ({
        deferredCalls: [...state.deferredCalls, call],
      })),
      removeDeferredCall: (deferId: string) => set((state) => ({
        deferredCalls: state.deferredCalls.filter((c) => c.deferId !== deferId),
      })),
    }),
    {
      name: 'axsdk:chat',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : (() => {
        const noop = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        return noop;
      })())),
      partialize: (state) => ({ session: state.session, sessionClosed: state.sessionClosed, messages: state.messages, isOpen: state.isOpen, deferredCalls: state.deferredCalls }),
    }
  ),
);

export interface EnvState {
  isLoading: boolean;
  env?: Record<string, unknown>;
  setEnv: (env?: Record<string, unknown>) => void;
  updateEnv: (env?: Record<string, unknown>) => void;
  clear: () => void;
}

export const envStore = createStore<EnvState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      env: undefined,
      setEnv: (env?: Record<string, unknown>) => set({ env }),
      updateEnv: (env?: Record<string, unknown>) => set({ env: { ...get().env, ...env } }),
      clear: () => set({ env: undefined }),
    }),
    {
      name: 'axsdk:env',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : (() => {
        const noop = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        return noop;
      })())),
      partialize: (state) => ({ }),
    }
  ),
);

export interface DataState {
  isLoading: boolean;
  data?: Record<string, unknown>;
  setData: (data?: Record<string, unknown>) => void;
  updateData: (data?: Record<string, unknown>) => void;
  clearData: () => void;
}

export const dataStore = createStore<DataState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      data: undefined,
      setData: (data?: Record<string, unknown>) => set({ data }),
      updateData: (data?: Record<string, unknown>) => set({ data: { ...get().data, ...data } }),
      clearData: () => set({ data: undefined }),
    }),
    {
      name: 'axsdk:data',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : (() => {
        const noop = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        return noop;
      })())),
      partialize: (state) => ({ }),
    }
  ),
);

export interface KnowledgeState {
  isLoading: boolean;
  knowledge: Record<string, unknown[]>;
  setKnowledge: (knowledge: Record<string, unknown[]>) => void;
  updateKnowledge: (knowledge: Record<string, unknown[]>) => void;
  clearKnowledge: () => void;
}

export const knowledgeStore = createStore<KnowledgeState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      knowledge: {},
      setKnowledge: (knowledge: Record<string, unknown[]>) => set({ knowledge: knowledge ?? {} }),
      updateKnowledge: (knowledge: Record<string, unknown[]>) => {
        const prev = get().knowledge;
        const next: Record<string, unknown[]> = { ...prev };
        for (const [group, items] of Object.entries(knowledge ?? {})) {
          next[group] = [...(prev[group] ?? []), ...items];
        }
        set({ knowledge: next });
      },
      clearKnowledge: () => set({ knowledge: {} }),
    }),
    {
      name: 'axsdk:knowledge',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : (() => {
        const noop = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        return noop;
      })())),
      partialize: (state) => ({ }),
    }
  ),
);
