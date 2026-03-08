import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,

    proxy: {
      // Mọi request bắt đầu bằng /api sẽ được chuyển hướng sang backend
      // Ví dụ: GET /api/tracks → http://localhost:5000/api/tracks
      '/api': {
        target:       'http://localhost:5000',
        changeOrigin: true,   // ghi đè header Host thành target
        secure:       false,  // cho phép self-signed HTTPS ở môi trường dev
      },
    },
  },

  build: {
    outDir:         'dist',
    sourcemap:      false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Tách vendor bundle để browser cache tốt hơn
        manualChunks: {
          vendor:       ['react', 'react-dom'],
          router:       ['react-router-dom'],
          http:         ['axios'],
        },
      },
    },
  },

  resolve: {
    alias: {
      // Tuỳ chọn: dùng '@' thay cho đường dẫn tương đối './src/...'
      // Ví dụ: import api from '@/api/axiosConfig'
      '@': '/src',
    },
  },
});
