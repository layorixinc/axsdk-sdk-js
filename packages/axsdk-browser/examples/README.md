# @axsdk/browser — Browser Examples

This folder contains standalone HTML examples for the [`@axsdk/browser`](../README.md) package. Each example can be opened directly in a browser with no build step required — the SDK is loaded via CDN.

These examples are intended for developers who want to quickly prototype or test AXSDK features without setting up a bundler or framework.

---

## Examples

| File | Description |
|------|-------------|
| [`browser_sitemap_faq.html`](./browser_sitemap_faq.html) | Demonstrates initializing AXSDK with a markdown sitemap (`env.sitemap`), a static FAQ dataset (`data.faq`), and a custom command handler (`axHandler`). A good starting point for content-aware AI integrations. |

---

## How to Run

1. Open the desired `.html` file directly in your browser (e.g. double-click the file, or use *File → Open* in your browser).
2. Replace the placeholder credentials in the `AXSDK.init()` call with your actual `apiKey` and `appId`.
3. Open the browser DevTools console to see debug output.

No installation, bundler, or server is required. The SDK is loaded automatically from [unpkg](https://unpkg.com/@axsdk/browser/dist/axsdk-browser.js).

---

## Prerequisites

- A valid **`apiKey`** and **`appId`** from the [AXSDK platform](https://axsdk.ai).

---

## Configuration Guide

Each example calls `AXSDK.init()` with an options object. The key options are described below.

### `apiKey` / `appId`

```js
AXSDK.init({
  apiKey: 'YOUR-API-KEY',
  appId:  'YOUR-APP-ID',
});
```

Authentication credentials issued by the AXSDK platform. Both values are required for the SDK to connect to the AI backend.

---

### `debug`

```js
AXSDK.init({
  debug: true,
});
```

When set to `true`, the SDK emits detailed logs to the browser DevTools console. Useful during development; disable in production.

---

### `env.me`

```js
AXSDK.init({
  env: {
    me: 'user@example.com',
  },
});
```

Identifies the current user, typically as an email address. This value is passed to the AI as context about who is interacting with the assistant.

---

### `env.sitemap`

```js
AXSDK.init({
  env: {
    sitemap: `# My Site
## Home
- [Home](/): Landing page.
## Products
- [Products](/products): Browse products.
`,
  },
});
```

A markdown-formatted map of your site's navigation structure. The AI uses this to understand the available pages and routes, enabling contextually relevant navigation suggestions and answers.

---

### `data.faq`

```js
AXSDK.init({
  data: {
    faq: [
      { id: 1, question: 'What is this site?', answer: 'A demo site.' },
      { id: 2, question: 'How do I contact support?', answer: 'Email us at support@example.com.' },
    ],
  },
});
```

A static array of FAQ entries. Each entry must have:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Unique identifier for the FAQ item |
| `question` | `string` | The frequently asked question |
| `answer` | `string` | The answer to the question |

The AI uses this dataset to answer user questions directly from your FAQ content.

---

### `axHandler`

```js
AXSDK.init({
  axHandler: async (command, args) => {
    console.log(command, args);

    if (command === 'navigate') {
      window.location.href = args.url;
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  },
});
```

An async callback invoked when the AI dispatches a command to your application. Use this to handle actions such as navigation, form submissions, or any custom behaviour your app needs to support.

- `command` — a string identifying the action to perform
- `args` — an object containing arguments for the command

Throwing an error inside `axHandler` signals to the AI that the command could not be handled.
