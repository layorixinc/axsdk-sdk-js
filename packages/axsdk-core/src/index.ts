import { AXSDK } from './lib';

async function main() {
  AXSDK.init({
    apiKey: process.env.AXSDK_API_KEY || "",
    appId: process.env.AXSDK_APP_ID || "",
    headers: { 'origin': process.env.AXSDK_APP_DOMAIN || "" },
    axHandler: async (command: string, args: unknown) => {
      console.log(command, args);
      return { result: 'OK' };
    },
    translations: {
      'ko': {
        chatAskMe: '필요하신게 있으시면 저를 불러주세요',
        chatHide: '대화를 숨기시려면 버튼을 누르세요',
        chatEmpty: `AI에게 필요한 것을 말해보세요.
예)뭐 팔아?, 가장 저렴한 사과 구매해줘, 주문 내역 보여줘, 어제 산 초코렛 취소해줘`,
        chatIdleGuide: 'AI는 실수를 할 수 있습니다.\n그럴 때는 다시 요청해보세요.',
        chatBusyGuide: 'AI가 일하는 중입니다. 잠시만 기다려주세요...',
        chatClear: '대화를 지우시려면 눌러주세요.',
      },
      'en': {
        chatAskMe: 'Feel free to call on me.',
        chatHide: 'Tap the button to hide this chat.',
        chatEmpty: `Just tell the AI what you need.
e.g., What do you sell?, Buy the cheapest apples, Show my order history, Cancel the chocolate I bought yesterday.`,
        chatIdleGuide: 'AI may make mistakes.\nFeel free to ask again if needed.',
        chatBusyGuide: 'AI is working. Please stand by...',
        chatClear: 'Click here to start over.',
      },
    },
  });

  AXSDK.eventBus().on('message.chat', (event: unknown) => {
    console.log('AXSDK: main:', event, AXSDK.getChatState());
  });
  AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.message', data: { text: '라면 사줘' } });
}
await main();

export * from './axtools';
export { errorStore } from './store';
export type { ApiError, ErrorState } from './store';
export type { DeferredCall } from './store';
