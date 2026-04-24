import type EventEmitter from 'eventemitter3';
import { type StoreApi } from 'zustand/vanilla';
import type {
  AppState,
  ChatState,
  DataState,
  EnvState,
  ErrorState,
  KnowledgeState,
} from './store';

export interface PluginCoreStores {
  app: StoreApi<AppState>;
  chat: StoreApi<ChatState>;
  env: StoreApi<EnvState>;
  data: StoreApi<DataState>;
  error: StoreApi<ErrorState>;
  knowledge: StoreApi<KnowledgeState>;
}

export interface PluginLogger {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

// Anything the AxSdk facade exposes to plugin authors. Typed as `unknown` here
// so core doesn't have to expose its internal class shape via this file —
// downstream plugins cast or use the host SDK directly.
export interface AxSdkLike {
  eventBus(): EventEmitter;
  getAppStore(): StoreApi<AppState>;
  getChatStore(): StoreApi<ChatState>;
  getEnvStore(): StoreApi<EnvState>;
  getDataStore(): StoreApi<DataState>;
  getErrorStore(): StoreApi<ErrorState>;
  getKnowledgeStore(): StoreApi<KnowledgeState>;
}

export interface PluginContext {
  sdk: AxSdkLike;
  events: EventEmitter;
  stores: PluginCoreStores;
  logger: PluginLogger;
}

export interface AxPlugin<Config = unknown, Api = unknown> {
  readonly name: string;
  readonly version?: string;
  install(ctx: PluginContext, config: Config): Api | Promise<Api>;
  uninstall?(api: Api, ctx: PluginContext): void | Promise<void>;
}

interface InstalledPlugin {
  plugin: AxPlugin;
  config: unknown;
  api: unknown;
  context: PluginContext;
}

export class PluginRegistry {
  readonly #entries = new Map<string, InstalledPlugin>();
  readonly #makeContext: () => PluginContext;
  readonly #debug: () => boolean;

  constructor(makeContext: () => PluginContext, debug: () => boolean) {
    this.#makeContext = makeContext;
    this.#debug = debug;
  }

  async install<C, A>(plugin: AxPlugin<C, A>, config: C): Promise<A> {
    if (this.#entries.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already installed.`);
    }
    const baseCtx = this.#makeContext();
    const context: PluginContext = {
      ...baseCtx,
      logger: prefixedLogger(baseCtx.logger, plugin.name),
    };
    const api = await plugin.install(context, config);
    this.#entries.set(plugin.name, {
      plugin: plugin as unknown as AxPlugin,
      config,
      api,
      context,
    });
    if (this.#debug()) {
      console.log(`[axsdk:plugin] installed "${plugin.name}"${plugin.version ? `@${plugin.version}` : ''}`);
    }
    return api;
  }

  async uninstall(name: string): Promise<void> {
    const entry = this.#entries.get(name);
    if (!entry) return;
    this.#entries.delete(name);
    try {
      await entry.plugin.uninstall?.(entry.api, entry.context);
    } finally {
      if (this.#debug()) console.log(`[axsdk:plugin] uninstalled "${name}"`);
    }
  }

  async uninstallAll(): Promise<void> {
    const names = Array.from(this.#entries.keys()).reverse();
    for (const name of names) {
      await this.uninstall(name);
    }
  }

  get<A = unknown>(name: string): A | undefined {
    return this.#entries.get(name)?.api as A | undefined;
  }

  has(name: string): boolean {
    return this.#entries.has(name);
  }

  list(): Array<{ name: string; version?: string }> {
    return Array.from(this.#entries.values()).map(({ plugin }) => ({
      name: plugin.name,
      version: plugin.version,
    }));
  }
}

function prefixedLogger(base: PluginLogger, name: string): PluginLogger {
  const prefix = `[${name}]`;
  return {
    log: (...args) => base.log(prefix, ...args),
    warn: (...args) => base.warn(prefix, ...args),
    error: (...args) => base.error(prefix, ...args),
  };
}
