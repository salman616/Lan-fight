import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupGameWebSocket } from './src/server/gameServer.js';
import { getLocalIpAddresses } from './src/server/networkInfo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Local IP discovery
app.get('/api/network-info', (_req, res) => {
  res.json({
    ips: getLocalIpAddresses(),
    port: process.env.PORT || 3000,
  });
});

// Serve frontend dist files if built
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Attach WebSocket server
setupGameWebSocket(server);

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Mini Militia Server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[Mini Militia Server] Local IPs:`, getLocalIpAddresses());
});
