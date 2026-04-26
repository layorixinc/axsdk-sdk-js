import { resolve } from 'node:path'
import fs from 'node:fs'
import { defineConfig, esmExternalRequirePlugin } from 'vite'
import react from '@vitejs/plugin-react'
import preserveUseClientDirective from 'rollup-plugin-preserve-use-client';

const workletPath = resolve(
  import.meta.dirname,
  'node_modules/@axsdk/voice/public/pcm-worklet.js',
);
const workletSource = fs.existsSync(workletPath)
  ? fs.readFileSync(workletPath, 'utf-8')
  : '';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preserveUseClientDirective()],
  define: {
    'process.env': {},
    '__AXSDK_PCM_WORKLET__': JSON.stringify(workletSource),
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/lib.ts"),
      formats: ["es"],
      name: "AXSDKReact",
      fileName: "lib",
    },
    rolldownOptions: {
      plugins: [esmExternalRequirePlugin({
        external: ["react", "react-dom", "@axsdk/core", 'react/jsx-runtime']
      })],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "@axsdk/core": "AXSDKCore"
        }
      }
    }
  }
})
