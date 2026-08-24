import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        arcade: resolve(__dirname, 'arcade/index.html'),
      },
    },
  },
});
