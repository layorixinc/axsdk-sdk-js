import { AXSDK } from './axsdk';
import { captureScreenshot } from './axtools';

export async function processAXHandler(command: string, args: Record<string, unknown>): Promise<string> {
  let result: string = '';

  const systemResult: Record<string, unknown> = {};
  if (command === 'AX_get_env') {
    systemResult['now'] = new Date().toISOString();
  }
  if (command === 'AXSDK_clear') {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.cancel' });
    AXSDK.resetSession();
    return 'OK'
  }

  if (command === 'AXSDK_screenshot') {
    const dataUrl = await captureScreenshot();
    return dataUrl;
  }

  const appResult = await AXSDK.axHandler()?.(command, args);
  if (!appResult) {
    result = 'OK';
  }
  else if (typeof appResult === 'object') {
    result = JSON.stringify({ ...systemResult, ...appResult });
  }
  else {
    result = `${JSON.stringify(systemResult)}
${appResult}`;
  }

  return result;
}
