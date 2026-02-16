import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: process.env.VITE_ALLOWED_HOSTS
      ? process.env.VITE_ALLOWED_HOSTS.split(',')
      : []
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:8001',
      '/members': 'http://localhost:8001',
      '/sessions': 'http://localhost:8001',
      '/attendance': 'http://localhost:8001',
      '/statistics': 'http://localhost:8001',
    }
  }
})
