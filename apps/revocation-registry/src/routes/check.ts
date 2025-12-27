import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { revocationStorage } from '../services/storage';

const CheckQuerySchema = z.object({
  attestationHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export async function checkRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: unknown }>('/revoked', async (request, reply) => {
    // 1. Validate Query
    const parseResult = CheckQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parseResult.error });
    }
    const { attestationHash } = parseResult.data;

    // 2. Check Storage
    const isRevoked = await revocationStorage.isRevoked(attestationHash);

    // 3. Return Result
    return {
      revoked: isRevoked,
      attestationHash,
      timestamp: Date.now()
    };
  });
}
