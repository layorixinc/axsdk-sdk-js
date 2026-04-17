export * from './axsdk';
export * from './axtools';
export * from './axhandler';
export * as DeferredCallManager from './deferred';
export type { DeferFn, DeferOptions } from './deferred';
export type { DeferredCall } from './store';

export function isPromise(value: unknown): boolean {
  return !!value && (typeof value === 'function' || typeof value === 'object') && typeof (value as any).then === 'function'
}
