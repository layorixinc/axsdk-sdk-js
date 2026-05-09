import EventEmitter from 'eventemitter3';
import type { ChatMessage, ChatSession } from '@axsdk/core';
import { VoicePlugin } from './plugin';
import type { VoiceTransport, VoiceTransportEvents } from './transport';

interface TestChatState {
  isOpen: boolean;
  session: ChatSession | null;
  messages: ChatMessage[];
  latestAssistantWithText?: ChatMessage | null;
  ttsEnabled?: boolean;
}

interface TestAppState {
  appAuthToken: string | undefined;
  appUserId: string | undefined;
  getAppUserId(): string;
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class TestChatStore {
  #state: TestChatState;
  readonly #listeners = new Set<(state: TestChatState, prev: TestChatState) => void>();

  constructor(initial: TestChatState) {
    this.#state = initial;
  }

  getState(): TestChatState {
    return this.#state;
  }

  subscribe(listener: (state: TestChatState, prev: TestChatState) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  setState(next: TestChatState): void {
    const prev = this.#state;
    this.#state = next;
    for (const listener of this.#listeners) listener(next, prev);
  }
}

class TestAppStore {
  readonly #state: TestAppState = {
    appAuthToken: undefined,
    appUserId: 'app-user',
    getAppUserId: () => 'app-user',
  };

  getState(): TestAppState {
    return this.#state;
  }

  subscribe(): () => void {
    return () => {};
  }
}

class TestTransport implements VoiceTransport {
  readonly #emitter = new EventEmitter();
  synthesizeCalls = 0;
  readonly ready = false;

  async open(): Promise<void> {}
  async close(): Promise<void> {}
  async reconnect(): Promise<void> {}
  sendAudio(): void {}

  async synthesize(): Promise<Blob> {
    this.synthesizeCalls++;
    return new Blob(['audio'], { type: 'audio/mpeg' });
  }

  on<K extends keyof VoiceTransportEvents>(
    event: K,
    fn: (payload: VoiceTransportEvents[K]) => void,
  ): void {
    this.#emitter.on(event, fn as (...args: unknown[]) => void);
  }

  off<K extends keyof VoiceTransportEvents>(
    event: K,
    fn: (payload: VoiceTransportEvents[K]) => void,
  ): void {
    this.#emitter.off(event, fn as (...args: unknown[]) => void);
  }
}

function installAudioMock(): () => void {
  const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      addEventListener: () => {},
      removeEventListener: () => {},
      hidden: false,
      createElement: () => ({
        src: '',
        playbackRate: 1,
        currentTime: 0,
        play: () => Promise.resolve(),
        pause: () => {},
        load: () => {},
        removeAttribute: () => {},
        addEventListener: (event: string, handler: () => void) => {
          if (event === 'ended') setTimeout(handler, 0);
        },
        removeEventListener: () => {},
      } as unknown as HTMLAudioElement),
    } satisfies Partial<Document>,
  });
  URL.createObjectURL = () => 'blob:voice-test';
  URL.revokeObjectURL = () => {};

  return () => {
    if (originalDocumentDescriptor) {
      Object.defineProperty(globalThis, 'document', originalDocumentDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'document');
    }
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  };
}

function assistantMessage(id: string, text: string): ChatMessage {
  return {
    info: { id, role: 'assistant' },
    parts: [{ type: 'text', text }],
  } as ChatMessage;
}

function session(status: string): ChatSession {
  return {
    id: 'session-1',
    status,
    title: 'Test session',
    time: {},
  } as ChatSession;
}

function createSdk(chatStore: TestChatStore, bus: EventEmitter) {
  return {
    config: { apiKey: 'key', appId: 'app' },
    eventBus: () => bus,
    getChatStore: () => chatStore,
    getAppStore: () => new TestAppStore(),
    getEndpoint: () => ({ baseUrl: 'https://example.test', basePath: '/axsdk' }),
    t: () => '',
  };
}

async function restoredAssistantIsNotReplayed(): Promise<void> {
  const cleanup = installAudioMock();
  try {
    const restored = assistantMessage('assistant-restored', 'Already heard');
    const state = {
      isOpen: true,
      session: session('idle'),
      messages: [restored],
      latestAssistantWithText: restored,
      ttsEnabled: true,
    };
    const chatStore = new TestChatStore(state);
    const bus = new EventEmitter();
    const transport = new TestTransport();
    const queued: string[] = [];
    bus.on('voice.tts.queued', ({ messageId }: { messageId: string }) => queued.push(messageId));

    const plugin = new VoicePlugin({
      stt: false,
      primeMicOnAttach: false,
      transportFactory: () => transport,
    });
    plugin.attach(createSdk(chatStore, bus));

    chatStore.setState({ ...state });
    await wait(900);

    assert(queued.length === 0, 'restored assistant message should not queue TTS');
    assert(transport.synthesizeCalls === 0, 'restored assistant message should not synthesize audio');
    plugin.detach();
  } finally {
    cleanup();
  }
}

async function restoredDisabledTtsCanSpeakWhenReenabled(): Promise<void> {
  const cleanup = installAudioMock();
  try {
    const restored = assistantMessage('assistant-pending', 'Pending while disabled');
    const disabledState = {
      isOpen: true,
      session: session('idle'),
      messages: [restored],
      latestAssistantWithText: restored,
      ttsEnabled: false,
    };
    const chatStore = new TestChatStore(disabledState);
    const bus = new EventEmitter();
    const transport = new TestTransport();
    const queued: string[] = [];
    bus.on('voice.tts.queued', ({ messageId }: { messageId: string }) => queued.push(messageId));

    const plugin = new VoicePlugin({
      stt: false,
      primeMicOnAttach: false,
      transportFactory: () => transport,
    });
    plugin.attach(createSdk(chatStore, bus));

    chatStore.setState({ ...disabledState, ttsEnabled: true });
    await wait(10);

    assert(queued.includes('assistant-pending'), 'restored pending assistant should queue when TTS is re-enabled');
    assert(transport.synthesizeCalls === 1, 'restored pending assistant should synthesize once when TTS is re-enabled');
    plugin.detach();
  } finally {
    cleanup();
  }
}

async function newAssistantStillSpeaks(): Promise<void> {
  const cleanup = installAudioMock();
  try {
    const initial = {
      isOpen: true,
      session: session('busy'),
      messages: [],
      latestAssistantWithText: null,
      ttsEnabled: true,
    };
    const chatStore = new TestChatStore(initial);
    const bus = new EventEmitter();
    const transport = new TestTransport();
    const queued: string[] = [];
    bus.on('voice.tts.queued', ({ messageId }: { messageId: string }) => queued.push(messageId));

    const plugin = new VoicePlugin({
      stt: false,
      primeMicOnAttach: false,
      transportFactory: () => transport,
    });
    plugin.attach(createSdk(chatStore, bus));

    const fresh = assistantMessage('assistant-new', 'Fresh response');
    chatStore.setState({
      isOpen: true,
      session: session('idle'),
      messages: [fresh],
      latestAssistantWithText: fresh,
      ttsEnabled: true,
    });
    await wait(10);

    assert(queued.includes('assistant-new'), 'new assistant message should queue TTS');
    assert(transport.synthesizeCalls === 1, 'new assistant message should synthesize audio once');
    plugin.detach();
  } finally {
    cleanup();
  }
}

await restoredAssistantIsNotReplayed();
await restoredDisabledTtsCanSpeakWhenReenabled();
await newAssistantStillSpeaks();

console.log('plugin: all scenarios passed');
