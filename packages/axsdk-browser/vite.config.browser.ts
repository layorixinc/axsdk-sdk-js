import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env': {}
  },
  build: {
    lib: {
      entry: 'src/embed.ts',
      name: 'AXSDK',
      formats: ['iife'],
      fileName: () => 'axsdk-browser.js',
    },
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
});
