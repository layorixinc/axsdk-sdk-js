import { useEffect } from 'react';
import './App.css';
import { AXSDK } from '@axsdk/core';
import { AXUI, useVoicePlugin, type AXVoiceConfig, type AXTheme } from './lib';

const env = import.meta.env;

const theme: AXTheme = {
  colorMode: 'light',
  buttonImageUrl: 'https://objectstorage.ap-seoul-1.oraclecloud.com/n/axqpxq9illpn/b/axsdk/o/favicon-196x196.png',
  buttonAnimationImageUrl: 'https://objectstorage.ap-seoul-1.oraclecloud.com/n/axqpxq9illpn/b/axsdk/o/axsdk.gif',
  colors: {
    primary: {
      primaryLight: '#ccc',
    }
  },
}

const voiceConfig: AXVoiceConfig = {
  stt: true,
  tts: true,
  mode: 'assistant',
  autoActivateWhileChatOpen: true,
  primeMicOnAttach: true,
  debug: true,
  ttsPlaybackRate: 1.5,
  ttsMaxChars: 50,
};

const playgroundHighlights = [
  {
    eyebrow: '01 / Discovery',
    title: 'Catalog search stays local to the playground.',
    body: 'The mock handler answers delivery discovery questions with predictable menu data, pagination, and regex matching so UI states are easy to reproduce.',
    meta: 'Try: chicken, pizza, .*',
  },
  {
    eyebrow: '02 / Options',
    title: 'Menu configuration returns grouped choices.',
    body: 'Delivery options are shaped like add-ons, grouped variants, and standalone sides to exercise assistant tool responses without touching production APIs.',
    meta: 'Grouped + standalone items',
  },
  {
    eyebrow: '03 / Checkout',
    title: 'Order attempts intentionally stop at auth.',
    body: 'The checkout branch returns a login prompt, making it safe to verify command routing and unhappy paths in a visually complete page shell.',
    meta: 'Safe mock boundary',
  },
];

const playgroundScenarios = [
  'Open the floating AX button and ask for delivery menus using natural language.',
  'Request options for one returned delivery URL and compare grouped selections.',
  'Trigger an order command to confirm the playground preserves the login boundary.',
  'Scroll the page while the assistant remains available as a fixed fab surface.',
];

const playgroundMenuCards = [
  {
    name: 'Golden Olive Chicken',
    tone: 'Crisp, savory, familiar',
    detail: 'A reliable result for validating price formatting, description truncation, and menu link generation.',
  },
  {
    name: 'Honey Original Set',
    tone: 'Sweet heat, shareable',
    detail: 'Useful for checking longer assistant replies and combo-style branch handling in mocked delivery data.',
  },
  {
    name: 'Cheese Ball Sidecar',
    tone: 'Small add-on moment',
    detail: 'Keeps option lists feeling realistic when the assistant explains grouped choices and standalone sides.',
  },
];

const playgroundMetrics = [
  { label: 'Handlers', value: '3', note: 'Search, options, order' },
  { label: 'Voice bridge', value: 'On', note: 'Assistant mode enabled' },
  { label: 'Auth token', value: 'Set', note: 'Example app token applied' },
  { label: 'Surface', value: 'FAB', note: 'Floating chat variant' },
];

const playgroundNotes = [
  'The app bar, middle content, and footer remain in the same shell so layout regressions are visible while scrolling.',
  'Warm paper panels and compact badges mirror the hero section instead of using raw placeholder text.',
  'Sections use semantic headings, lists, articles, and definition lists to keep the filler content accessible.',
];

function App() {
  useVoicePlugin(voiceConfig);

  useEffect(() => {
    AXSDK.init({
      baseUrl: env.VITE_AXSDK_API_BASE_URL,
      apiKey: env.VITE_AXSDK_API_KEY,
      appId: env.VITE_AXSDK_APP_ID,
      apiVersion: 'v2',
      headers: { 'origin': env.VITE_AXSDK_APP_DOMAIN },
      remote_knowledge: true,
      voice: voiceConfig,
      axHandler: async (command: string, args: unknown) => {
        console.log(command, args);
        const a = args as Record<string, unknown>;

        if (command == 'AX_search_delivery')
        {
          const query = String(a.query || a.q || a.keyword || '');
          const page = Math.max(1, parseInt(String(a.page)) || 1);
          const pageSize = Math.min(25, Math.max(1, parseInt(String(a.pageSize)) || 5));

          if (!query) return "Please specify a search query. e.g. 'chicken', 'pizza', or '.*' for all.";

          let regex;
          try { regex = new RegExp(query, 'i'); }
          catch (e) { return `Invalid regex pattern: ${query}. Error: ${(e as Error).message}`; }

          try {
            const json = {
                "total": 25,"updated_at": "2026-04-18T05:58:39.483+00:00",  "languages": "en",
                "provider": "KoreaCoupon", "currency": "KRW", "category": "deliveries",
                data: [
                {
                    "thumbnail": "https://d29k3ua3tefksn.cloudfront.net/home/ec2-user/koreacoupon/2025/09/11/f7b491d4-0f2a-4b9a-9568-909225245b8b.gif",
                    "price": 24200,
                    "name": "BHC Chicken - Fried Chicken Delivery",
                    "description": "BHC Chicken is a popular South Korean fried chicken chain known for its crispy, flavorful chicken and a wide range of unique and savory sauces. Founded in 1997, BHC offers a variety of fried chicken options, including their signature \"BHC\" sauce, as well as popular choices like crispy fried, soy garlic, and spicy chicken. The brand also features boneless options and sides such as wings, potato wedges, and cheese balls. BHC is especially well-loved for its high-quality ingredients, crispy texture, and deliciously bold flavors, making it a favorite among Korean chicken enthusiasts.",
                    "id": 7,
                    "category": "DELIVERY",
                    "tags": [
                      "CHICKEN",
                      "friedchicken"
                    ],
                    "status": "COMPLETE"
                  },
                  {
                    "thumbnail": "https://d29k3ua3tefksn.cloudfront.net/app/koreacoupon/upload/2025/01/23/1e49d92f-77d1-44f2-a2cf-7bc6434aa271.jpg",
                    "price": 27600,
                    "name": "BBQ Chicken - Fried Chicken Delivery",
                    "description": "BBQ Chicken is a well-known Korean fried chicken brand famous for its crispy, golden-brown chicken cooked in premium olive oil, which results in a less greasy yet flavorful bite. The brand offers a wide variety of options, including its signature Golden Olive Chicken, spicy and sweet sauces, and other choices like fried, soy garlic, and hot wings. BBQ Chicken is also popular for its premium quality and diverse menu, which includes sides like fries, salads, and even pizza. With its commitment to using fresh ingredients and high-quality oils, BBQ has become a top choice for chicken lovers, known for its consistent flavor and crispy texture.",
                    "id": 6,
                    "category": "DELIVERY",
                    "tags": [
                      "CHICKEN",
                      "friedchicken"
                    ],
                    "status": "COMPLETE"
                  },
                  {
                    "thumbnail": "https://d29k3ua3tefksn.cloudfront.net/app/koreacoupon/upload/2025/01/23/42bab725-1de5-474b-b64c-075ef1acf76c.jpg",
                    "price": 21900,
                    "name": "Kyochon Chicken - Fried Chicken Delivery",
                    "description": "Kyochon Chicken is a popular Korean fried chicken brand known for its crispy and flavorful fried chicken, made with a special batter that creates a light, crunchy exterior while keeping the inside tender and juicy. Founded in 1991, Kyochon is famous for its signature original, red, and honey sauces, which offer a unique balance of savory, spicy, and sweet flavors. The chicken is cooked using fresh ingredients and premium oils to ensure a high-quality taste. Kyochon also offers boneless options for easier eating, and it has expanded its menu to include sides like cheese balls and wedge fries. Known for its commitment to quality, Kyochon is a top choice for chicken lovers both in Korea and internationally.",
                    "id": 5,
                    "category": "DELIVERY",
                    "tags": [
                      "CHICKEN",
                      "friedchicken"
                    ],
                    "status": "COMPLETE"
                  }                
                ]
            }
            if (!Array.isArray(json.data)) return "Unexpected catalog format.";

            const toSlug = (s: string) => (s || '').replace(/\s+/g, '');
            const matches = json.data.filter(d => {
              if (regex.test(d.name)) return true;
              if (regex.test(d.description || '')) return true;
              if ((d.tags || []).some(t => regex.test(t))) return true;
              return false;
            });

            const totalResults = matches.length;
            const totalPages = Math.ceil(totalResults / pageSize);
            const startIdx = (page - 1) * pageSize;
            const pageItems = matches.slice(startIdx, startIdx + pageSize);

            const results = pageItems.map(d => {
              const isCombo = d.name.startsWith('[Combo]');
              const slug = toSlug(d.name);
              return {
                id: d.id,
                name: d.name,
                description: (d.description || '').slice(0, 200),
                price: d.price,
                currency: json.currency || 'KRW',
                tags: d.tags || [],
                link: isCombo ? `/delivery/set/${d.id}/${slug}` : `/delivery/${d.id}/${slug}`,
                isCombo,
              };
            });

            if (totalResults === 0) {
              return `No delivery menus found for "${query}".`;
            }

            const header = `Found ${totalResults} result${totalResults > 1 ? 's' : ''} for "${query}" (page ${page}/${totalPages}):`;
            const lines = results.map((r, i) =>
              `${startIdx + i + 1}. ${r.name} — ₩${r.price.toLocaleString()}${r.isCombo ? ' [COMBO]' : ''}\n   ${r.description}${r.description.length >= 200 ? '...' : ''}\n   ${r.link}`
            );
            const footer = page < totalPages
              ? `\n(Use page: ${page + 1} to see more results)`
              : '';

            return `${header}\n\n${lines.join('\n\n')}${footer}`;

          } catch (e) {
            return `Search failed: ${(e as Error).message}`;
          }
        }

        if (command == 'AX_get_delivery_options') {
          const targetUrl = String(a.url || a.path || a.link || '');
          if (!targetUrl) return "Please specify a delivery URL. e.g. '/delivery/6/BBQChicken-FriedChickenDelivery'";

          const options = [
            {
                "type": "grouped",
                "name": "Original",
                "groupName": "Ppulingkeul",
                "optionId": "55",
                "price": 21900,
                "selected": false,
                "toggleTarget": {},
                "plus": {},
                "minus": {},
                "valueEl": {}
            },
            {
                "type": "grouped",
                "name": "Bonless",
                "groupName": "Ppulingkeul",
                "optionId": "56",
                "price": 24200,
                "selected": false,
                "toggleTarget": {},
                "plus": {},
                "minus": {},
                "valueEl": {}
            },
            {
                "type": "grouped",
                "name": "Original",
                "groupName": "Matchoking",
                "optionId": "58",
                "price": 26500,
                "selected": false,
                "toggleTarget": {},
                "plus": {},
                "minus": {},
                "valueEl": {}
            },
            {
                "type": "grouped",
                "name": "Bonless",
                "groupName": "Matchoking",
                "optionId": "59",
                "price": 28800,
                "selected": false,
                "toggleTarget": {},
                "plus": {},
                "minus": {},
                "valueEl": {}
            },
            {
                "type": "standalone",
                "name": "Ppuling Cheese Ball(5p)",
                "groupName": null,
                "optionId": "60",
                "price": 7500,
                "selected": false,
                "toggleTarget": {},
                "plus": {},
                "minus": {},
                "valueEl": {}
            },
            {
                "type": "standalone",
                "name": "Ppuling Potatoes",
                "groupName": null,
                "optionId": "61",
                "price": 5800,
                "selected": false,
                "toggleTarget": {},
                "plus": {},
                "minus": {},
                "valueEl": {}
            },
            {
                "type": "standalone",
                "name": "Cajun Fries",
                "groupName": null,
                "optionId": "349",
                "price": 4600,
                "selected": false,
                "toggleTarget": {},
                "plus": {},
                "minus": {},
                "valueEl": {}
            },
            {
                "type": "standalone",
                "name": "Pickled Radish",
                "groupName": null,
                "optionId": "350",
                "price": 1200,
                "selected": false,
                "toggleTarget": {},
                "plus": {},
                "minus": {},
                "valueEl": {}
            }
        ]
          const groupMap: Record<string, { groupName: string; items: { name: string; optionId: string; price: number }[] }> = {};
          const standalone: { name: string; optionId: string; price: number }[] = [];
          for (const o of options) {
            if (o.groupName) {
              if (!groupMap[o.groupName]) groupMap[o.groupName] = { groupName: o.groupName, items: [] };
              groupMap[o.groupName].items.push({ name: o.name, optionId: o.optionId, price: o.price });
            } else {
              standalone.push({ name: o.name, optionId: o.optionId, price: o.price });
            }
          }
          return {
            groupMap, standalone
          }
        }
        if(command == "AX_delivery_order") {
          return "Please login"
        }
        return undefined;
      },
      translations: {
        'ko': {
          chatAskMe: '필요하신게 있으시면 저를 불러주세요',
          chatHide: '대화를 숨기시려면 버튼을 누르세요',
          chatInput: '여기에 입력해주세요',
          chatBusyGuide: 'AI가 일하는 중입니다. 잠시만 기다려주세요...',
          chatClear: '대화를 지우시려면 눌러주세요.',
          chatShortcutChips: '다시, 계속',
          chatPreviewTitle: '',
          chatBottomSearchReset: '지우기',
          chatBottomSearchClose: '닫기'
        },
        'en': {
          chatAskMe: 'Feel free to call on me.',
          chatHide: 'Tap the button to hide this chat.',
          chatInput: 'Please type here',
          chatBusyGuide: 'AI is working. Please stand by...',
          chatClear: 'Click here to start over.',
          chatShortcutChips: 'Again, Continue',
          chatPreviewTitle: '',
          chatBottomSearchReset: 'Clear',
          chatBottomSearchClose: 'Close'
        }
      },
      debug: true
    });
    AXSDK.setAppAuthToken(env.VITE_AXSDK_APP_AUTH_TOKEN_EXAMPLE);

    const onChat = (event: unknown) => console.log('AXSDK: main:', event, AXSDK.getChatState());
    const onVoiceState = (p: unknown) => console.log('[voice.state]', p);
    const onVoiceError = (p: unknown) => console.error('[voice.error]', p);
    const onGesture = () => console.warn('[voice.tts.gesture_required]');
    AXSDK.eventBus().on('message.chat', onChat);
    AXSDK.eventBus().on('voice.state', onVoiceState);
    AXSDK.eventBus().on('voice.error', onVoiceError);
    AXSDK.eventBus().on('voice.tts.gesture_required', onGesture);
    return () => {
      AXSDK.eventBus().off('message.chat', onChat);
      AXSDK.eventBus().off('voice.state', onVoiceState);
      AXSDK.eventBus().off('voice.error', onVoiceError);
      AXSDK.eventBus().off('voice.tts.gesture_required', onGesture);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-brand" aria-label="AXSDK React playground">
          <span className="app-brand-mark" aria-hidden="true">AX</span>
          <div>
            <p className="app-eyebrow">React package playground</p>
            <p className="app-brand-name">AXSDK Search Demo</p>
          </div>
        </div>
        <div className="app-status-pill" aria-label="Mounted surface">
          <span className="app-status-dot" aria-hidden="true" />
          <span>Search bar variant mounted</span>
        </div>
      </header>

      <main className="app-content">
        <section className="app-stage" aria-labelledby="playground-title">
          <div className="app-copy-card">
            <p className="app-kicker">Delivery assistant sandbox</p>
            <h1 id="playground-title">Test AXSDK commands in a clean React surface.</h1>
            <p className="app-lede">
              The playground initializes the SDK with the local mock delivery handlers,
              app auth token, voice bridge, and event listeners so the search-bar UI can
              be exercised without touching production library components.
            </p>
            <div className="app-command-row" aria-label="Available mock commands">
              <span>AX_search_delivery</span>
              <span>AX_get_delivery_options</span>
              <span>AX_delivery_order</span>
            </div>
          </div>

          <aside className="app-panel" aria-label="Playground guide">
            <div className="app-panel-header">
              <span className="app-panel-label">Try this</span>
              <span className="app-panel-badge">Mock API</span>
            </div>
            <p className="app-prompt">Search for chicken, pizza, or <code>.*</code> to exercise delivery discovery.</p>
            <div className="app-steps" aria-label="Demo setup status">
              <span>SDK init preserved</span>
              <span>Voice plugin active</span>
              <span>Auth token applied</span>
            </div>
          </aside>
        </section>

        <section className="app-demo-section" aria-labelledby="playground-scroll-title">
          <header className="app-section-header">
            <p className="app-kicker">Long-scroll playground</p>
            <h2 id="playground-scroll-title">A warmer test page for real widget behavior.</h2>
            <p>
              These demo blocks create several viewport heights of intentional content so the floating assistant can be tested while the host page scrolls like a real commerce surface.
            </p>
          </header>

          <div className="app-highlight-grid" aria-label="Mock command coverage">
            {playgroundHighlights.map((item) => (
              <article className="app-highlight-card" key={item.eyebrow}>
                <p className="app-card-eyebrow">{item.eyebrow}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span>{item.meta}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="app-demo-section app-demo-section--split" aria-labelledby="playground-scenarios-title">
          <div className="app-section-header">
            <p className="app-kicker">Scroll rehearsal</p>
            <h2 id="playground-scenarios-title">Four passes through the same assistant loop.</h2>
          </div>

          <ol className="app-scenario-list">
            {playgroundScenarios.map((scenario) => (
              <li key={scenario}>
                <span aria-hidden="true" />
                <p>{scenario}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="app-demo-section" aria-labelledby="playground-menu-title">
          <header className="app-section-header app-section-header--centered">
            <p className="app-kicker">Demo menu texture</p>
            <h2 id="playground-menu-title">Placeholder dishes with purposeful testing roles.</h2>
            <p>
              The content is fictional, but each card mirrors a state the mock delivery assistant can describe during command testing.
            </p>
          </header>

          <div className="app-menu-grid">
            {playgroundMenuCards.map((card) => (
              <article className="app-menu-card" key={card.name}>
                <span className="app-menu-plate" aria-hidden="true" />
                <div>
                  <p className="app-card-eyebrow">{card.tone}</p>
                  <h3>{card.name}</h3>
                  <p>{card.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="app-demo-section app-demo-section--ledger" aria-labelledby="playground-metrics-title">
          <div className="app-ledger-copy">
            <p className="app-kicker">Runtime checklist</p>
            <h2 id="playground-metrics-title">Everything important is still wired before the page gets decorative.</h2>
            <p>
              The filler content only changes the host page around AXSDK. Initialization, auth, translations, voice configuration, and mock handlers stay in place for repeatable manual QA.
            </p>
          </div>

          <dl className="app-metric-grid">
            {playgroundMetrics.map((metric) => (
              <div className="app-metric-card" key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
                <p>{metric.note}</p>
              </div>
            ))}
          </dl>
        </section>

        <section className="app-demo-section app-demo-section--notes" aria-labelledby="playground-notes-title">
          <header className="app-section-header">
            <p className="app-kicker">Host-page notes</p>
            <h2 id="playground-notes-title">Enough vertical rhythm to catch fixed-surface problems.</h2>
          </header>

          <ul className="app-note-list">
            {playgroundNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <span>Dev playground only</span>
        <span>React 19 + AXSDK</span>
      </footer>

      <AXUI theme={theme} variant='bottomSearchBar' />
    </div>
  );
}

export default App;
