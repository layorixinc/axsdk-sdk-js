export * from './axsdk';
export * from './axtools';
export * from './axhandler';

export function isPromise(value: unknown): boolean {
  return !!value && (typeof value === 'function' || typeof value === 'object') && typeof (value as any).then === 'function'
}
