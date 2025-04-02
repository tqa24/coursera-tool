import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import manifest from './src/manifest';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    build: {
      emptyOutDir: true,
      outDir: 'build',
      rollupOptions: {
        input: {
          pascoli: 'src/third-party/pascoli.js',
        },
        output: {
          entryFileNames: 'src/third-party/[name].js',
          // entryFileNames: ({ name }) => {
          //   return name === 'pascoli' ? 'third-party/[name].js' : 'assets/[name]-[hash].js';
          // },
          chunkFileNames: 'assets/chunk-[hash].js',
        },
      },
    },

    plugins: [crx({ manifest }), react()],
  };
});
// 'zzzzz'
// \"zzzzz”
// –
// ‘
// ’
// “
// ”
//
