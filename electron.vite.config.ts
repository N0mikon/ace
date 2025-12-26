import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { build } from 'vite'
import { existsSync, mkdirSync } from 'fs'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})

/**
 * Browser build configuration
 * Run separately with: npx vite build --config electron.vite.config.browser.ts
 * Or call buildBrowser() programmatically
 */
export const browserConfig = {
  root: resolve(__dirname, 'src/renderer'),
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
    '__ACE_BROWSER_MODE__': 'true'
  }
}

/**
 * Build browser version programmatically
 */
export async function buildBrowser(): Promise<void> {
  const outDir = resolve(__dirname, 'out/browser')
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }

  await build(browserConfig)
  console.log('Browser build complete: out/browser/')
}
