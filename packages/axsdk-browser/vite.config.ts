import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function inlineCssPlugin(): Plugin {
  return {
    name: 'axsdk-inline-css-shadow',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve('dist');
      const cssFile =
        fs.existsSync(path.join(outDir, 'axsdk-browser.css'))
          ? path.join(outDir, 'axsdk-browser.css')
          : path.join(outDir, 'browser.css');
      const jsFile = path.join(outDir, 'axsdk-browser.js');

      if (!fs.existsSync(cssFile)) return;
      if (!fs.existsSync(jsFile)) return;

      const css = fs.readFileSync(cssFile, 'utf-8');
      const escaped = css
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');

      const original = fs.readFileSync(jsFile, 'utf-8');

      const snippet =
        `var __AXSDK_INLINED_CSS__=\`${escaped}\`;\n`;

      if (original.includes('var __AXSDK_INLINED_CSS__')) {
        fs.unlinkSync(cssFile);
        return;
      }

      fs.writeFileSync(jsFile, snippet + original);
      fs.unlinkSync(cssFile);
    },
  };
}

// Read the worklet source from @axsdk/voice at build time and inline it as a
// JSON string. At runtime embed.ts wraps it in a Blob + URL.createObjectURL
// so the AudioWorklet loads without an external asset.
const workletPath = path.resolve(
  'node_modules/@axsdk/voice/public/pcm-worklet.js',
);
const workletSource = fs.existsSync(workletPath)
  ? fs.readFileSync(workletPath, 'utf-8')
  : '';

export default defineConfig({
  plugins: [react(), inlineCssPlugin()],
  define: {
    'process.env': {},
    '__AXSDK_INLINED_CSS__': '""',
    '__AXSDK_PCM_WORKLET__': JSON.stringify(workletSource),
  },
  build: {
    lib: {
      entry: 'src/embed.ts',
      name: 'AXSDK',
      formats: ['iife'],
      fileName: () => 'axsdk-browser.js',
    },
    cssCodeSplit: false,
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
});
