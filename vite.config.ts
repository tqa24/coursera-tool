import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
//@ts-ignore
import manifest from './src/manifest';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // const manifest =
  //   mode === 'firefox'
  //     ? require('./src/manifest.firefox').default
  //     : require('./src/manifest.edge').default;

  return {
    build: {
      emptyOutDir: true,
      outDir: `build-${mode}`,
      rollupOptions: {
        input: {
          popup: './src/third-party/popup.js',
          pascoli: './src/third-party/pascoli.js',
          meucci: './src/third-party/meucci.js',
        },
        output: {
          entryFileNames: '[name].js',
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
