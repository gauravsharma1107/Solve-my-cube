import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules\\three')) {
            return 'vendor-three';
          }
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules\\react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules\\react-dom') ||
            id.includes('node_modules/scheduler') ||
            id.includes('node_modules\\scheduler')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
})
