import EventEmitter from 'eventemitter3';
import { type StoreApi } from 'zustand/vanilla';
import { EventBus } from './eventbus';
import type { AXSDKConfig, AXHandler } from './types';
export type * from './types';
import { ApiError } from './apiclient';
import * as api from './axapi';
import { appStore, chatStore, errorStore, type AppState, type ChatState } from './store';
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
      if (type === 'session.status'
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

    console.log('AXSDK initialized');

    Config.baseURL = config.baseUrl || Config.baseURL
    Config.basePath = config.basePath || Config.basePath
    appStore.getState().setApiKey(config.apiKey);
    appStore.getState().setAppId(config.appId);
    const browserLanguage = (typeof navigator !== 'undefined' && navigator.language)
      ? navigator.language.split('-')[0]
      : 'en';
    appStore.getState().setLanguage(config.language ?? browserLanguage ?? 'en');
    const translations = Object.fromEntries([...Object.keys(AXSDK_TRANSLATIONS), ...Object.keys(config?.translations ?? {})].map(lang => [lang, { ...AXSDK_TRANSLATIONS[lang], ...config?.translations?.[lang] }]));
    chatStore.getState().setTranslations(translations || {});

    if (!isUpdate) {
      api.init(this.requestInterceptor.bind(this), this.errorInterceptor.bind(this));
      await AXCHAT.start();
      await AXCALL.start();
    }

    const health = await api.health();
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

  public getChatState(): ChatState {
    return chatStore.getState();
  }

  public resetSession() {
    const chatState = this.getChatState();
    chatState.setSession(null);
    chatState.setMessages([]);
    chatState.setIsOpen(false);
  }

  public sendMessage(text: string) {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.message', data: { text } });
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
