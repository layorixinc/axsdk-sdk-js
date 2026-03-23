import { resolve } from 'node:path'
import { defineConfig, esmExternalRequirePlugin } from 'vite'
import react from '@vitejs/plugin-react'
import preserveUseClientDirective from 'rollup-plugin-preserve-use-client';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preserveUseClientDirective()],
  define: {
    'process.env': {}
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
