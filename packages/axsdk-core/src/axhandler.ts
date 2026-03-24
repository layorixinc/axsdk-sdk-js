import { AXSDK } from './axsdk';
import { captureScreenshot } from './axtools';

function isPromise(value: unknown): boolean {
  return !!value && (typeof value === 'function' || typeof value === 'object') && typeof (value as any).then === 'function'
}

function mergeResults(systemResult: any, appResult: any) {
  if (!appResult) {
    return JSON.stringify(systemResult);
  }
  else if (typeof appResult === 'object') {
    return JSON.stringify({ ...systemResult, ...appResult });
  }
  else if (typeof appResult === 'function') {
    return mergeResults(systemResult, appResult())
  }
  
  return `${JSON.stringify(systemResult)}
${appResult}`;
}

export async function processAXHandler(command: string, args: Record<string, unknown>): Promise<string|{ "$": () => Promise<void>, message: string}> {
  let result: string = '';

  const systemResult: Record<string, unknown> = {};
  if (command === 'AX_get_env') {
    systemResult['now'] = new Date().toISOString();

    const envState = AXSDK.getEnvStore().getState();
    const env = AXSDK.config?.env && (typeof AXSDK.config?.env == 'function' ? await AXSDK.config?.env() : AXSDK.config?.env) || {}
    envState.setEnv(env);

    Object.assign(systemResult, env);
  }
  if (command === 'AX_clear') {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.cancel' });
    AXSDK.resetSession();
    return 'OK'
  }
  if (command === 'AX_screenshot') {
    const dataUrl = await captureScreenshot();
    return dataUrl;
  }

  const appResult = await AXSDK.axHandler()?.(command, args);
  if(!!appResult && typeof appResult === 'object' && (appResult as any).$) {
    return {
      "$": (appResult as any).$,
      message: mergeResults(systemResult, (appResult as any).message)
    }
  }
  else {
    result = mergeResults(systemResult, appResult)
  }
  return result;
}
