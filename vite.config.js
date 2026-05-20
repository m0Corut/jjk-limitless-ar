import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    open: true,
    https: false,
  },
  build: {
    target: 'esnext',
  },
});
