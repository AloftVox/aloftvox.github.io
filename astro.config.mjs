// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://aloftvox.github.io',
  devToolbar: {
    enabled: false,
  },
  vite: {
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'three-vendor',
                test: /node_modules[\\/]three[\\/]/,
                maxSize: 300 * 1024,
              },
            ],
          },
        },
      },
    },
  },
});
