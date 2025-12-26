/**
 * Vite configuration for browser build
 * This builds a standalone browser version that connects via WebSocket.
 *
 * Usage: npm run build:browser
 */

import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer/browser'),
  base: './',
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'out/browser'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/browser/index.html')
    }
  },
  define: {
    // Define browser mode for conditional compilation
    '__ACE_BROWSER_MODE__': JSON.stringify(true)
  }
})
