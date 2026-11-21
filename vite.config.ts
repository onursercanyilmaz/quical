import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0', 'localhost:3000', '127.0.0.1:3000', '0.0.0.0:3000', 'lashaun-uncausative-nonevanescently.ngrok-free.dev'],
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
