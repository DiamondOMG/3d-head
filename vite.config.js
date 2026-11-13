import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // เพื่อให้มือถือในวง WiFi เดียวกันเชื่อมต่อเข้ามาได้
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        calibrate: './calibrate.html',
      },
    },
  },
});

