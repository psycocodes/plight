import fastify from 'fastify';
import { checkRoutes } from './routes/check';
import * as dotenv from 'dotenv';
// Import cron to start it as side-effect or separate process?
// Plan said "schedule job script". Usually run separately.
// But for "deployable now" locally, running it inside index is easier?
// User said "NOT in the request path". 
// Let's import it conditionally or just let it run if this is the "app".
// Ideally the cron is a separate entry point `src/cron.ts`.
// I'll keep them separate in execution but defined here. 
// No, I'll rely on `npm run cron` for the updater.

dotenv.config();

const server = fastify({ logger: true });

// Register routes
server.register(checkRoutes);

const start = async () => {
  try {
    const port = parseInt(process.env.REGISTRY_PORT || '3001');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Revocation Registry running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
