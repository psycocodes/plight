import fastify from 'fastify';
import { attestRoutes } from './routes/attest';
import * as dotenv from 'dotenv';
import { SignerService } from './services/signer';

import * as path from 'path';

// Load .env from project root to get RPC URLs
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const server = fastify({ logger: true });

// Register routes
server.register(attestRoutes);

// Helper to show pubkey on startup
const signer = new SignerService();

const start = async () => {
  try {
    const port = parseInt(process.env.NOTARY_PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Notary Service running on port ${port}`);
    const pubKey = await signer.getPublicKey();
    console.log(`Notary Public Key: [${pubKey[0]}, ${pubKey[1]}]`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
