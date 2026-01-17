import fastify from 'fastify';
import cors from '@fastify/cors';
import { attestRoutes } from '../src/routes/attest';
import * as dotenv from 'dotenv';
// Re-use logic from src/index.ts but as a serverless handler

dotenv.config();

const app = fastify({ logger: true });

// Register CORS
app.register(cors, {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
});

// Register routes
app.register(attestRoutes);

app.get('/', async () => {
  return { status: 'ok', service: 'Notary Service (Serverless)' };
});

// Vercel serverless function handler
export default async function handler(req: any, res: any) {
  try {
    await app.ready();
    app.server.emit('request', req, res);
  } catch (err) {
    console.error('Notary Vercel Handler Error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error: ' + String(err));
  }
}
