// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],
  server: {
    host: true
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: [
        'host.docker.internal',
        'localhost',
        '*.bongga.dev',
        'unshapeable-nontaxably-shantay.ngrok-free.dev'
      ],
      watch: {
        ignored: ['**/data/**', '**/sessions-data/**']
      }
    }
  },

  adapter: node({
    mode: 'standalone'
  })
});