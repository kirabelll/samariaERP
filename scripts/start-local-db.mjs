/**
 * Starts a local PGlite-backed PostgreSQL-compatible TCP server on port 5432
 */
import { PGlite } from '@electric-sql/pglite';
import { fromNodeSocket } from 'pg-gateway/node';
import net from 'net';

console.log('🐘 Starting PGlite in-memory database server...');

// In-memory (no persistence needed for local testing)
const db = new PGlite();
await db.waitReady;
console.log('✅ PGlite in-memory ready');

const server = net.createServer(async (socket) => {
  await fromNodeSocket(socket, {
    serverVersion: '16.0',
    auth: { method: 'trust' },
    async onMessage(data, { isAuthenticated }) {
      if (!isAuthenticated) return;
      return db.execProtocolRaw(data);
    },
  });
});

server.listen(5432, '127.0.0.1', () => {
  console.log('🟢 PostgreSQL proxy listening on 127.0.0.1:5432');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('⚠️  Port 5432 already in use');
    process.exit(0);
  }
  console.error('Server error:', err);
  process.exit(1);
});

process.on('SIGINT', () => { server.close(); process.exit(0); });
