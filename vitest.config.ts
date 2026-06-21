import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://xwqwgvhwallvtmrwhjiw.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cXdndmh3YWxsdnRtcndoaml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5ODg3ODYsImV4cCI6MjA5NzU2NDc4Nn0.I3NSAbXVubyn3DkfmKxEc9nnsaYNfBV-TKTGSLSpNZw',
    NEXT_PUBLIC_JAMENDO_CLIENT_ID: 'de7ecb31',
  },
})
