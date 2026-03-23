import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function inlineCssPlugin(): Plugin {
  return {
    name: 'axsdk-inline-css',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve('dist');
      const cssFile = path.join(outDir, 'axsdk-browser.css');
      const jsFile = path.join(outDir, 'axsdk-browser-frame.js');

      if (!fs.existsSync(cssFile)) return;
      if (!fs.existsSync(jsFile)) return;

      const css = fs.readFileSync(cssFile, 'utf-8');
      // Escape backticks and backslashes so the CSS is safe inside a template literal
      const escaped = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      const snippet = `(function(){var s=document.createElement('style');s.textContent=\`${escaped}\`;document.head.appendChild(s);})();\n`;

      const original = fs.readFileSync(jsFile, 'utf-8');
      fs.writeFileSync(jsFile, snippet + original);
      // Remove the now-redundant CSS file
      fs.unlinkSync(cssFile);
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineCssPlugin()],
  define: {
    'process.env': {}
  },
  build: {
    lib: {
      entry: 'src/frame.tsx',
      name: 'AXSDKBrowserFrame',
      formats: ['iife'],
      fileName: () => 'axsdk-browser-frame.js',
    },
    cssCodeSplit: false,
    emptyOutDir: false,
    rollupOptions: {
      external: [],
    },
  },
});
