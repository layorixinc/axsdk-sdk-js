#!/usr/bin/env bun
/**
 * CLI test harness for @axsdk/core
 *
 * Usage:
 *   bun run ./src/cli.ts
 *
 * Reads env from packages/axsdk-core/.env (Bun auto-loads .env):
 *   VITE_AXSDK_API_BASE_URL
 *   VITE_AXSDK_API_KEY
 *   VITE_AXSDK_APP_ID
 *   VITE_AXSDK_APP_DOMAIN        (optional)
 *   VITE_AXSDK_APP_AUTH_TOKEN    (optional)
 */

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { AXSDK } from './lib';

const env = process.env;

const BASE_URL = env.VITE_AXSDK_API_BASE_URL;
const API_KEY = env.VITE_AXSDK_API_KEY;
const APP_ID = env.VITE_AXSDK_APP_ID;
const APP_DOMAIN = env.VITE_AXSDK_APP_DOMAIN;
const APP_AUTH_TOKEN = env.VITE_AXSDK_APP_AUTH_TOKEN;

function fail(msg: string): never {
  console.error(`[cli] ${msg}`);
  process.exit(1);
}

if (!API_KEY) fail('Missing VITE_AXSDK_API_KEY in .env');
if (!APP_ID) fail('Missing VITE_AXSDK_APP_ID in .env');

const HELP = `
Commands:
  help                            Show this help
  send <text>                     Send a chat message
  knowledge [group] [page]        Get knowledge (default page=1, limit=100)
  search <regex> [group] [page]   Search knowledge by regex
  state                           Dump chat state summary
  messages                        List chat messages
  errors                          List recent API errors
  clear                           Reset chat session
  quit | exit                     Exit
`.trim();

function summarizeState() {
  const chat = AXSDK.getChatState();
  const session = chat.session;
  console.log(JSON.stringify({
    session: session ? { id: session.id, status: session.status } : null,
    messageCount: chat.messages.length,
    isOpen: chat.isOpen,
  }, null, 2));
}

function listMessages() {
  const chat = AXSDK.getChatState();
  for (const m of chat.messages) {
    const text = (m.parts ?? [])
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text ?? '')
      .join('')
      .trim();
    console.log(`[${m.info.role}] ${m.info.id}: ${text}`);
  }
}

function listErrors() {
  const errs = AXSDK.getErrorStore().getState().errors;
  for (const e of errs.slice(0, 10)) {
    console.log(`${e.method} ${e.url} — ${e.status} ${e.statusText}: ${e.message}`);
  }
}

async function main() {
  console.log('[cli] Initializing AXSDK...');
  console.log(`[cli] baseUrl: ${BASE_URL ?? '(default)'}`);
  console.log(`[cli] appId:   ${APP_ID}`);

  await AXSDK.init({
    baseUrl: BASE_URL,
    apiKey: API_KEY,
    appId: APP_ID,
    headers: APP_DOMAIN ? { origin: APP_DOMAIN } : undefined,
    axHandler: async (command: string, args: unknown) => {
      console.log(`[axHandler] ${command}`, args);
      return { status: 'OK' };
    },
    debug: true,
    remote_knowledge: true,
  });

  if (APP_AUTH_TOKEN) {
    AXSDK.setAppAuthToken(APP_AUTH_TOKEN);
  }

  AXSDK.eventBus().on('message.chat', (event: unknown) => {
    const e = event as { type: string; data?: unknown };
    if (e.type === 'message.part.delta') return; // noisy
    console.log(`[event] ${e.type}`);
  });

  console.log('[cli] Ready.');
  console.log(HELP);

  const rl = readline.createInterface({ input, output });
  rl.on('close', async () => {
    await AXSDK.destroy().catch(() => {});
    process.exit(0);
  });

  while (true) {
    let line: string;
    try {
      line = (await rl.question('axsdk> ')).trim();
    } catch {
      break;
    }
    if (!line) continue;
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');

    try {
      switch (cmd) {
        case 'help':
          console.log(HELP);
          break;
        case 'send':
          if (!arg) {
            console.log('usage: send <text>');
            break;
          }
          AXSDK.sendMessage(arg);
          break;
        case 'knowledge': {
          // knowledge [group] [page]
          let group: string | undefined;
          let page = 1;
          if (rest.length === 1) {
            const n = Number(rest[0]);
            if (Number.isFinite(n)) page = n;
            else group = rest[0];
          } else if (rest.length >= 2) {
            group = rest[0];
            page = Number(rest[1]) || 1;
          }
          const result = await AXSDK.getKnowledge({ group, page, limit: 100 });
          console.log(JSON.stringify(result, null, 2));
          break;
        }
        case 'search': {
          // search <regex> [group] [page]
          if (!rest.length) {
            console.log('usage: search <regex> [group] [page]');
            break;
          }
          const regex = rest[0]!;
          const group = rest[1];
          const page = rest[2] ? Number(rest[2]) || 1 : 1;
          const result = await AXSDK.searchKnowledge({ regex, group, page, limit: 100 });
          console.log(JSON.stringify(result, null, 2));
          break;
        }
        case 'state':
          summarizeState();
          break;
        case 'messages':
          listMessages();
          break;
        case 'errors':
          listErrors();
          break;
        case 'clear':
          AXSDK.resetSession();
          console.log('[cli] session cleared');
          break;
        case 'quit':
        case 'exit':
          rl.close();
          return;
        default:
          console.log(`unknown command: ${cmd}`);
          console.log(HELP);
      }
    } catch (err) {
      console.error('[cli] error:', err);
    }
  }
}

main().catch((err) => {
  console.error('[cli] fatal:', err);
  process.exit(1);
});
