import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  return {
    plugins: [react()],
    define: { __API_URL__: JSON.stringify(env.VITE_API_URL ?? '') },
  }
})
