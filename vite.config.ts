/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Normalize path separators
          const path = id.replace(/\\/g, '/')
          if (path.includes('/react/') || path.includes('/react-dom/')) return 'vendor-react'
          if (path.includes('/recharts')) return 'vendor-charts'
          if (
            path.includes('/react-markdown') ||
            path.includes('/remark-gfm') ||
            path.includes('/react-syntax-highlighter')
          )
            return 'vendor-markdown'
          if (
            path.includes('/lucide-react') ||
            path.includes('/clsx') ||
            path.includes('/tailwind-merge')
          )
            return 'vendor-ui'
          if (path.includes('/zustand')) return 'vendor-state'
          if (path.includes('/jsonc-parser')) return 'vendor-jsonc'
          if (path.includes('/@agentclientprotocol')) return 'vendor-acp'
          return 'vendor'
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'electron/**/*.test.{ts,tsx}'],
  },
})
