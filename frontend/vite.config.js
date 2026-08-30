import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
<<<<<<< HEAD
      '/api': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/get': 'http://localhost:8000',
=======
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
      '/admin': 'http://localhost:3001',
>>>>>>> f9945e9872f20ceecd9ff32a9a669cf462a91ea7
    },
  },
})