import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // ← これを追加！
    port: 3000,   // ← 明示的に3000指定もOK
  },
})
