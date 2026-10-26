/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { habitflowSetupPlugin } from './dev/setupApi'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), habitflowSetupPlugin()],
  server: { port: 5173 },
  // supabase-js + React add up to ~530 kB before gzip (~155 kB gzipped), which is fine.
  build: { chunkSizeWarningLimit: 650 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Tests must never depend on a real Supabase project or a local .env file.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
})
