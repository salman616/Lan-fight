import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import { setupGameWebSocket } from './src/server/gameServer';
import { getLocalIpAddresses } from './src/server/networkInfo';

function gameServerPlugin(): Plugin {
  return {
    name: 'mini-militia-game-server',
    configureServer(server) {
      if (server.httpServer) {
        setupGameWebSocket(server.httpServer);
      }
      server.middlewares.use('/api/network-info', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({
          ips: getLocalIpAddresses(),
          port: 3000,
        }));
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), gameServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
