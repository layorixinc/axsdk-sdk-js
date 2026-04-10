import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';
import './App.css';
import { AXSDK } from '@axsdk/core';
import { AXUI } from './lib';

const env = import.meta.env;

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    AXSDK.init({
      baseUrl: env.VITE_AXSDK_API_BASE_URL,
      apiKey: env.VITE_AXSDK_API_KEY,
      appId: env.VITE_AXSDK_APP_ID,
      headers: { 'origin': env.VITE_AXSDK_APP_DOMAIN },
      remote_knowledge: true,
      axHandler: async (command: string, args: unknown) => {
        console.log(command, args);
        return undefined;
      },
      translations: {
        'ko': {
          chatAskMe: '필요하신게 있으시면 저를 불러주세요',
          chatHide: '대화를 숨기시려면 버튼을 누르세요',
          chatBusyGuide: 'AI가 일하는 중입니다. 잠시만 기다려주세요...',
          chatClear: '대화를 지우시려면 눌러주세요.'
        },
        'en': {
          chatAskMe: 'Feel free to call on me.',
          chatHide: 'Tap the button to hide this chat.',
          chatBusyGuide: 'AI is working. Please stand by...',
          chatClear: 'Click here to start over.'
        }
      },
      debug: true
    });
    AXSDK.setAppAuthToken(env.VITE_AXSDK_APP_AUTH_TOKEN_EXAMPLE);

    AXSDK.eventBus().on('message.chat', (event: unknown) => {
      console.log('AXSDK: main:', event, AXSDK.getChatState());
    });
  }, []);

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>

      <AXUI />
    </>
  );
}

export default App;
