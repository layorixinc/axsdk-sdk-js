import { Config } from './config';
import { EventBus } from './eventbus';

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const RETRY_BACKOFF_MULTIPLIER = 2;

export const SSEConnectionStatus = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  ERROR: 'ERROR',
};

export interface SSEConfig {
  appId?: string;
  apiKey?: string;
  appUserId?: string;
  sessionId?: string;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  retryBackoffMultiplier?: number;
  enableLogging?: boolean;
  headers?: Record<string, string>;
}

export interface SSEEventData {
  [key: string]: unknown;
}
export type SSEEventCallback = (data: SSEEventData) => void;

interface SSEConnectionController {
  abortController: AbortController;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
}

export class SSE {
  private config: SSEConfig & { headers: Record<string, string> };
  private connection: SSEConnectionController | null = null;
  private status: string = SSEConnectionStatus.DISCONNECTED;
  private retryDelay: number = INITIAL_RETRY_DELAY;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private shouldReconnect: boolean = false;
  private messageCount: number = 0;

  constructor(config: SSEConfig = {}) {
    this.config = {
      initialRetryDelay: config.initialRetryDelay ?? INITIAL_RETRY_DELAY,
      maxRetryDelay: config.maxRetryDelay ?? MAX_RETRY_DELAY,
      retryBackoffMultiplier: config.retryBackoffMultiplier ?? RETRY_BACKOFF_MULTIPLIER,
      enableLogging: config.enableLogging ?? true,
      appId: config.appId ?? '',
      apiKey: config.apiKey ?? '',
      appUserId: config.appUserId ?? '',
      sessionId: config.sessionId ?? '',
      headers: config.headers ?? {},
    };
  }

  public start(): void {
    if (this.status === SSEConnectionStatus.CONNECTED ||
        this.status === SSEConnectionStatus.CONNECTING) {
      if (this.config.enableLogging) console.log('Connection already active or in progress');
      return;
    }

    this.shouldReconnect = true;
    this.connect();
  }

  public async stop(): Promise<void> {
    this.shouldReconnect = false;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }

    await this.closeConnection();
    this.updateStatus(SSEConnectionStatus.DISCONNECTED);

    if (this.config.enableLogging) console.log('SSE connection stopped');
  }

  public getStatus(): string {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === SSEConnectionStatus.CONNECTED;
  }

  public getMessageCount(): number {
    return this.messageCount;
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
    }
    if (this.config.appId) {
      headers['x-app-id'] = this.config.appId;
    }
    if (this.config.appUserId) {
      headers['x-app-user-id'] = this.config.appUserId;
    }
    if (this.config.sessionId) {
      headers['x-app-user-session-id'] = this.config.sessionId;
    }
    return headers;
  }

  private async closeConnection(): Promise<void> {
    if (this.connection) {
      try {
        this.connection.abortController.abort();
      } catch (error) {
        console.warn(error);
      }

      if (this.connection.reader) {
        try {
          await this.connection.reader.cancel();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
        }
        this.connection.reader = null;
      }

      this.connection = null;
    }
  }

  private async connect(): Promise<void> {
    const SSE_URL = `${Config.baseURL}${Config.basePath}/event`;

    this.updateStatus(SSEConnectionStatus.CONNECTING);
    if (this.config.enableLogging) console.log(`Connecting...`);

    try {
      const abortController = new AbortController();

      const headers = await this.buildHeaders();

      const response = await fetch(SSE_URL, {
        method: 'GET',
        headers,
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      this.connection = {
        abortController,
        reader: response.body.getReader() as ReadableStreamDefaultReader<Uint8Array>,
      };

      this.updateStatus(SSEConnectionStatus.CONNECTED);
      if (this.config.enableLogging) console.log('SSE connection established successfully');

      this.resetRetryDelay();

      await this.readStream();

    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private async readStream(): Promise<void> {
    if (!this.connection || !this.connection.reader) {
      console.error('No reader available');
      return;
    }

    const reader = this.connection.reader;
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (this.shouldReconnect) {
        const { done, value } = await reader.read();

        if (done) {
          if (this.config.enableLogging) console.log('Stream ended');
          throw new Error('Stream ended unexpectedly');
        }

        buffer += decoder.decode(value, { stream: true });

        buffer = this.processBuffer(buffer);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (this.config.enableLogging) console.log('Stream aborted');
      } else {
        throw error;
      }
    }
  }

  private processBuffer(buffer: string): string {
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n\n')) >= 0) {
      let message = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 2);
      if (message.startsWith('data: ')) {
        message = message.slice(6);
      }
      this.handleMessage(message);
    }
    return buffer;
  }

  private handleMessage(data: string): void {
    try {
      this.messageCount++;

      let parsedData: SSEEventData;
      try {
        parsedData = JSON.parse(data);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (parseError) {
        if (this.config.enableLogging) console.log(`Message #${this.messageCount} received (not JSON):`, data);
        parsedData = { raw: data };
      }

      if (parsedData.payload && typeof parsedData.payload === 'object') {
        const payload = parsedData.payload as { type?: string; [key: string]: unknown };

        if (payload.type) {
          EventBus.emit(payload.type, payload.properties);
        }
      }

      EventBus.emit('message', parsedData);

    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async handleConnectionError(error: unknown): Promise<void> {
    console.error('Connection error:', error);
    this.updateStatus(SSEConnectionStatus.ERROR);

    await this.closeConnection();

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.updateStatus(SSEConnectionStatus.RECONNECTING);
    if (this.config.enableLogging) console.log(`Scheduling reconnection in ${this.retryDelay}ms...`);

    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      this.closeConnection().then(() => {
        this.increaseRetryDelay();
        this.connect();
      });
    }, this.retryDelay);
  }

  private increaseRetryDelay(): void {
    this.retryDelay = Math.min(
      this.retryDelay * (this.config.retryBackoffMultiplier ?? RETRY_BACKOFF_MULTIPLIER),
      this.config.maxRetryDelay ?? MAX_RETRY_DELAY
    );
  }

  private resetRetryDelay(): void {
    this.retryDelay = this.config.initialRetryDelay ?? INITIAL_RETRY_DELAY;
  }

  private updateStatus(newStatus: string): void {
    if (this.status !== newStatus) {
      if (this.config.enableLogging) console.log(`Status changed: ${this.status} -> ${newStatus}`);
      this.status = newStatus;
    }
  }
}

const sseServices = new Map<string, SSE>();

export function getSSEService(config: SSEConfig) {
  const servicekey = `${config.apiKey}:${config.appUserId}:${config.sessionId}`;
  const deleted: string[] = [];
  for (const [key, value] of sseServices.entries()) {
    if (key === servicekey) {
      continue;
    }
    value.stop();
    deleted.push(key);
  }
  deleted.forEach(key => sseServices.delete(key));

  if (sseServices.has(servicekey)) {
    return sseServices.get(servicekey);
  }
  const service = new SSE(config);
  sseServices.set(servicekey, service);
  return service;
}
