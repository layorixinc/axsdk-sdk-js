import EventEmitter from 'eventemitter3';
import { type StoreApi } from 'zustand/vanilla';
import { EventBus } from './eventbus';
import type { AXSDKConfig, AXHandler } from './types';
export type * from './types';
import { ApiError } from './apiclient';
import * as api from './axapi';
import { appStore, chatStore, envStore, dataStore, errorStore, knowledgeStore, type AppState, type ChatState, type EnvState, type DataState, type ErrorState, type KnowledgeState } from './store';
import * as AXCHAT from './axchat';
import * as AXCALL from './axcall';
import { AXSDK_TRANSLATIONS } from './translations';
import { Config } from './config';

class AxSdk extends EventEmitter {
  public config: AXSDKConfig | undefined;

  constructor() {
    super();

    EventBus.on('message', async (data: unknown) => {
      const { payload: { type, properties } } = data as { payload: { type: string; properties: unknown } };
      if (type === 'server.connected'
        || type === 'session.status'
        || type === 'session.updated'
        || type === 'message.updated'
        || type === 'message.part.updated'
        || type === 'message.part.delta'
        || type === 'question.asked'
      ) {
        EventBus.emit('message.chat', { type, data: properties });
      }
    });
  }

  public async init(config: AXSDKConfig): Promise<void> {
    const isUpdate = !!this.config;
    this.config = config;

    if (config.debug) console.log('AXSDK initialized');

    Config.baseURL = config.baseUrl || Config.baseURL;
    Config.basePath = config.basePath || Config.basePath;
    appStore.getState().setApiKey(config.apiKey);
    appStore.getState().setAppId(config.appId);
    const browserLanguage = (typeof navigator !== 'undefined' && navigator.language)
      ? navigator.language.split('-')[0]
      : 'en';
    appStore.getState().setLanguage(config.language ?? browserLanguage ?? 'en');

    if (!isUpdate) {
      api.init(this.requestInterceptor.bind(this), this.errorInterceptor.bind(this));
    }

    appStore.getState().setAppInfoReady(false);
    {
      const baseLangs = new Set([
        ...Object.keys(AXSDK_TRANSLATIONS),
        ...Object.keys(config?.translations ?? {}),
      ]);
      const baseTranslations = Object.fromEntries(
        [...baseLangs].map(lang => [lang, {
          ...AXSDK_TRANSLATIONS[lang],
          ...config?.translations?.[lang],
        }])
      );
      chatStore.getState().setTranslations(baseTranslations);
    }

    let appInfo: Awaited<ReturnType<typeof api.getAppInfo>> | undefined;
    try {
      appInfo = await api.getAppInfo();
    } catch (e) {
      if (config.debug) console.warn('AXSDK getAppInfo failed', e);
    }
    if (appInfo) appStore.getState().setAppInfoReady(true);
    const remoteTranslations = appInfo?.app?.translations ?? {};
    const translationLangs = new Set([
      ...Object.keys(AXSDK_TRANSLATIONS),
      ...Object.keys(remoteTranslations),
      ...Object.keys(config?.translations ?? {}),
    ]);
    const translations = Object.fromEntries(
      [...translationLangs].map(lang => [lang, {
        ...AXSDK_TRANSLATIONS[lang],
        ...remoteTranslations[lang],
        ...config?.translations?.[lang],
      }])
    );
    chatStore.getState().setTranslations(translations || {});
    envStore.getState().setEnv(config.env && (typeof config.env == 'function' ? await config.env() : config.env) || {});
    dataStore.getState().setData(config.data && (typeof config.data == 'function' ? await config.data() : config.data) || {});

    if (!config.remote_knowledge) {
      const localKnowledge = config.knowledge && (typeof config.knowledge == 'function' ? await config.knowledge() : config.knowledge) || {};
      knowledgeStore.getState().setKnowledge(localKnowledge as Record<string, unknown[]>);
    }

    if (!isUpdate) {
      await AXCHAT.start();
      await AXCALL.start();
    }
  }

  public async destroy() {
    await AXCALL.stop();
    await AXCHAT.stop();
  }

  public axHandler(): AXHandler | undefined {
    return this.config?.axHandler;
  }

  public eventBus() {
    return EventBus;
  }

  public headers() {
    return this.config?.headers;
  }

  public getAppStore(): StoreApi<AppState> {
    return appStore;
  }

  public setAppAuthToken(appAuthToken: string | undefined): void {
    appStore.getState().setAppAuthToken(appAuthToken);
  }

  public getLanguage(): string {
    return appStore.getState().language ?? 'en';
  }

  public t(id: string): string {
    const language = appStore.getState().language;
    const translations = chatStore.getState().translations;
    return translations[language]?.[id] || '';
  }

  public getChatStore(): StoreApi<ChatState> {
    return chatStore;
  }

  public getEnvStore(): StoreApi<EnvState> {
    return envStore;
  }

  public getDataStore(): StoreApi<DataState> {
    return dataStore;
  }

  public getErrorStore(): StoreApi<ErrorState> {
    return errorStore;
  }

  public getKnowledgeStore(): StoreApi<KnowledgeState> {
    return knowledgeStore;
  }

  public async getKnowledgeGroups(): Promise<{ groups: { group: string; count: number }[] }> {
    if (this.config?.remote_knowledge) {
      return await api.getKnowledgeGroups();
    }
    const knowledge = knowledgeStore.getState().knowledge ?? {};
    return {
      groups: Object.entries(knowledge).map(([group, items]) => ({ group, count: items.length })),
    };
  }

  public async fetchKnowledge(options?: { group?: string; page?: number; limit?: number }) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 100;
    const result = await api.getKnowledge({ group: options?.group, page, limit }) as {
      groups: Record<string, unknown[]>;
      total: number;
      page: number;
      limit: number;
    };
    return result;
  }

  public async getKnowledge(options?: { group?: string; page?: number; limit?: number }): Promise<{
    groups: Record<string, unknown[]>;
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;

    if (this.config?.remote_knowledge) {
      return await this.fetchKnowledge({ group: options?.group, page, limit });
    }

    const knowledge = knowledgeStore.getState().knowledge ?? {};

    const pickedGroups: Record<string, unknown[]> = options?.group
      ? { [options.group]: knowledge[options.group] ?? [] }
      : knowledge;

    const total = Object.values(pickedGroups).reduce((acc, items) => acc + items.length, 0);

    const start = (page - 1) * limit;
    const end = start + limit;
    const sliced: Record<string, unknown[]> = {};
    let seen = 0;
    for (const [group, items] of Object.entries(pickedGroups)) {
      const groupStart = seen;
      const groupEnd = seen + items.length;
      seen = groupEnd;
      if (groupEnd <= start || groupStart >= end) continue;
      const localStart = Math.max(0, start - groupStart);
      const localEnd = Math.min(items.length, end - groupStart);
      sliced[group] = items.slice(localStart, localEnd);
    }

    return {
      groups: sliced,
      total,
      page,
      limit,
    };
  }

  public async searchKnowledge(options: { group?: string; regex: string | RegExp; page?: number; limit?: number }): Promise<{
    groups: Record<string, unknown[]>;
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;

    if (this.config?.remote_knowledge) {
      const regexStr = typeof options.regex === 'string' ? options.regex : options.regex.source;
      return await api.searchKnowledge({ group: options.group, regex: regexStr, page, limit }) as {
        groups: Record<string, unknown[]>;
        total: number;
        page: number;
        limit: number;
      };
    }

    const re = typeof options.regex === 'string' ? new RegExp(options.regex, 'i') : options.regex;
    const knowledge = knowledgeStore.getState().knowledge ?? {};
    const source: Record<string, unknown[]> = options.group
      ? { [options.group]: knowledge[options.group] ?? [] }
      : knowledge;

    const matches = (value: unknown): boolean => {
      if (value == null) return false;
      if (typeof value === 'string') return re.test(value);
      if (typeof value === 'number' || typeof value === 'boolean') return re.test(String(value));
      if (typeof value === 'object') {
        for (const v of Object.values(value as Record<string, unknown>)) {
          if (matches(v)) return true;
        }
      }
      return false;
    };

    const filtered: Record<string, unknown[]> = {};
    let total = 0;
    for (const [group, items] of Object.entries(source)) {
      const hit = items.filter(matches);
      if (hit.length) {
        filtered[group] = hit;
        total += hit.length;
      }
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const sliced: Record<string, unknown[]> = {};
    let seen = 0;
    for (const [group, items] of Object.entries(filtered)) {
      const groupStart = seen;
      const groupEnd = seen + items.length;
      seen = groupEnd;
      if (groupEnd <= start || groupStart >= end) continue;
      const localStart = Math.max(0, start - groupStart);
      const localEnd = Math.min(items.length, end - groupStart);
      sliced[group] = items.slice(localStart, localEnd);
    }

    return {
      groups: sliced,
      total,
      page,
      limit,
    };
  }

  public async complete(message?: string): Promise<void> {
    const chatState = this.getChatState();
    if (!chatState.session) {
      return;
    }
    chatState.setSessionClosed({ message });
  }

  public getChatState(): ChatState {
    return chatStore.getState();
  }

  public getDataState(): DataState {
    return dataStore.getState();
  }

  public resetSession() {
    const chatState = this.getChatState();
    chatState.setSession(null);
    chatState.setSessionClosed(null);
    chatState.setMessages([]);
    this.getErrorStore().getState().clearErrors();
  }

  public sendMessage(text: string) {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.message', data: { text } });
  }

  public setData(data?: any): void {
    this.getDataState().setData(data)
  }

  public updateData(key: string, data?: any[]): void {
    this.getDataState().updateData({ [key]: data })
  }

  public clearData() {
    this.getDataState().clearData()
  }

  public getData(key: string): any[] | undefined {
    return this.getDataState().data?.[key] as any;
  }

  public getAllData(): any[] | undefined {
    const data = this.getDataState().data as any;
    if(!data) {
      return data
    }
    if(typeof data == 'object') {
      return Object.keys(data).map(key => ({ key, data: data[key] }))
    }
    return data
  }

  private async errorInterceptor(error: ApiError): Promise<ApiError> {
    errorStore.getState().addError({
      url: error.url || '',
      method: error.method || '',
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      responseBody: error.response,
    });
    return error;
  }

  private async requestInterceptor(url: string, options: RequestInit): Promise<RequestInit> {
    const appState = appStore.getState();
    const chatState = chatStore.getState();
    options.headers = {
      ...options.headers,
      ...this.config?.headers,
      'x-api-key': this.config?.apiKey ?? '',
      'x-app-id': this.config?.appId ?? '',
      'x-app-user-id': appState.getAppUserId() ?? '',
      'x-app-user-session-id': chatState.session?.id ?? '',
      'x-app-authorization': appState.appAuthToken ?? '',
    };
    return options;
  }
}

export const AXSDK = new AxSdk();
export default AXSDK;
