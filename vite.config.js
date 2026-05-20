import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    https: false,
  },
  build: {
    target: 'esnext',
  },
});
