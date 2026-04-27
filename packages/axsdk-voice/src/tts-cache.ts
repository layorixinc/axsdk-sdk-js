export interface TtsCacheOptions {
  enabled?: boolean;
  memoryMaxEntries?: number;
  idbMaxBytes?: number;
  idbTtlMs?: number;
  dbName?: string;
}

interface MetaRecord {
  size: number;
  createdAt: number;
  lastAccessAt: number;
}

const DEFAULTS = {
  memoryMaxEntries: 50,
  idbMaxBytes: 100 * 1024 * 1024,
  idbTtlMs: 7 * 24 * 60 * 60 * 1000,
  dbName: 'axsdk-tts-cache',
};

const AUDIO_STORE = 'audio';
const META_STORE = 'meta';
const DB_VERSION = 1;

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

function hasSubtleCrypto(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

export class TtsCache {
  readonly #enabled: boolean;
  readonly #memoryMax: number;
  readonly #idbMaxBytes: number;
  readonly #idbTtlMs: number;
  readonly #dbName: string;

  // Insertion order = LRU order. On hit: delete + set to bump.
  readonly #memory = new Map<string, Blob>();
  #dbPromise: Promise<IDBDatabase> | null = null;
  #trimming = false;

  static isSupported(): boolean {
    return hasSubtleCrypto();
  }

  constructor(opts: TtsCacheOptions = {}) {
    this.#enabled = opts.enabled !== false && hasSubtleCrypto();
    this.#memoryMax = opts.memoryMaxEntries ?? DEFAULTS.memoryMaxEntries;
    this.#idbMaxBytes = opts.idbMaxBytes ?? DEFAULTS.idbMaxBytes;
    this.#idbTtlMs = opts.idbTtlMs ?? DEFAULTS.idbTtlMs;
    this.#dbName = opts.dbName ?? DEFAULTS.dbName;
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  async get(text: string, voice: string | undefined): Promise<Blob | null> {
    if (!this.#enabled) return null;
    const key = await this.#key(text, voice);

    const mem = this.#memory.get(key);
    if (mem) {
      this.#memory.delete(key);
      this.#memory.set(key, mem);
      return mem;
    }

    const fromIdb = await this.#idbGet(key).catch(() => null);
    if (!fromIdb) return null;

    const { blob, meta } = fromIdb;
    if (Date.now() - meta.createdAt > this.#idbTtlMs) {
      this.#idbDelete(key).catch(() => {});
      return null;
    }
    this.#idbTouch(key, meta).catch(() => {});
    this.#memoryPut(key, blob);
    return blob;
  }

  async set(text: string, voice: string | undefined, blob: Blob): Promise<void> {
    if (!this.#enabled) return;
    const key = await this.#key(text, voice);
    this.#memoryPut(key, blob);
    this.#idbPut(key, blob).catch(() => {});
  }

  async clear(): Promise<void> {
    this.#memory.clear();
    if (!hasIndexedDB()) return;
    try {
      const db = await this.#openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([AUDIO_STORE, META_STORE], 'readwrite');
        tx.objectStore(AUDIO_STORE).clear();
        tx.objectStore(META_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  #key(text: string, voice: string | undefined): Promise<string> {
    return sha256Hex(text).then((h) => `${h}:${voice ?? ''}`);
  }

  #memoryPut(key: string, blob: Blob): void {
    if (this.#memory.has(key)) this.#memory.delete(key);
    this.#memory.set(key, blob);
    while (this.#memory.size > this.#memoryMax) {
      const oldest = this.#memory.keys().next().value;
      if (oldest === undefined) break;
      this.#memory.delete(oldest);
    }
  }

  #openDB(): Promise<IDBDatabase> {
    if (!hasIndexedDB()) return Promise.reject(new Error('IndexedDB unavailable'));
    if (this.#dbPromise) return this.#dbPromise;
    this.#dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(this.#dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(AUDIO_STORE)) db.createObjectStore(AUDIO_STORE);
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.#dbPromise;
  }

  async #idbGet(key: string): Promise<{ blob: Blob; meta: MetaRecord } | null> {
    if (!hasIndexedDB()) return null;
    const db = await this.#openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([AUDIO_STORE, META_STORE], 'readonly');
      const audioReq = tx.objectStore(AUDIO_STORE).get(key);
      const metaReq = tx.objectStore(META_STORE).get(key);
      tx.oncomplete = () => {
        const blob = audioReq.result as Blob | undefined;
        const meta = metaReq.result as MetaRecord | undefined;
        if (!blob || !meta) resolve(null);
        else resolve({ blob, meta });
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async #idbPut(key: string, blob: Blob): Promise<void> {
    if (!hasIndexedDB()) return;
    const db = await this.#openDB();
    const now = Date.now();
    const meta: MetaRecord = { size: blob.size, createdAt: now, lastAccessAt: now };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([AUDIO_STORE, META_STORE], 'readwrite');
      tx.objectStore(AUDIO_STORE).put(blob, key);
      tx.objectStore(META_STORE).put(meta, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    this.#trim().catch(() => {});
  }

  async #idbDelete(key: string): Promise<void> {
    if (!hasIndexedDB()) return;
    const db = await this.#openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([AUDIO_STORE, META_STORE], 'readwrite');
      tx.objectStore(AUDIO_STORE).delete(key);
      tx.objectStore(META_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async #idbTouch(key: string, prev: MetaRecord): Promise<void> {
    if (!hasIndexedDB()) return;
    const db = await this.#openDB();
    const next: MetaRecord = { ...prev, lastAccessAt: Date.now() };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put(next, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async #trim(): Promise<void> {
    if (this.#trimming || !hasIndexedDB()) return;
    this.#trimming = true;
    try {
      const db = await this.#openDB();
      const entries: Array<{ key: string; meta: MetaRecord }> = [];
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readonly');
        const req = tx.objectStore(META_STORE).openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            entries.push({ key: String(cursor.key), meta: cursor.value as MetaRecord });
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      const now = Date.now();
      const expired = entries.filter((e) => now - e.meta.createdAt > this.#idbTtlMs);
      const fresh = entries.filter((e) => now - e.meta.createdAt <= this.#idbTtlMs);
      const toDelete = new Set(expired.map((e) => e.key));

      fresh.sort((a, b) => a.meta.lastAccessAt - b.meta.lastAccessAt);
      let total = fresh.reduce((sum, e) => sum + e.meta.size, 0);
      for (const e of fresh) {
        if (total <= this.#idbMaxBytes) break;
        toDelete.add(e.key);
        total -= e.meta.size;
      }

      if (toDelete.size === 0) return;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([AUDIO_STORE, META_STORE], 'readwrite');
        for (const key of toDelete) {
          tx.objectStore(AUDIO_STORE).delete(key);
          tx.objectStore(META_STORE).delete(key);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      this.#trimming = false;
    }
  }
}
