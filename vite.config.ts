/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { shopifyProxyPlugin } from './server/shopifyProxy.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), shopifyProxyPlugin()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
