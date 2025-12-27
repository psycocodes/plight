import { FastifyInstance } from 'fastify';
import { AttestationRequestSchema, Attestation, AttestationResponse } from '../schemas';
import { mockAggregator } from '../services/aggregator';
import { SignerService } from '../services/signer';

const signer = new SignerService();

export async function attestRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: unknown }>('/attest', async (request, reply) => {
    // 1. Validate Schema
    const parseResult = AttestationRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Invalid schema', details: parseResult.error });
    }
    const params = parseResult.data;

    // 2. Enforce Finality (Mock logic for now)
    // "reject too-recent blocks"
    // In a real system we'd check latestBlock from RPC.
    // For now, assume any block > 1000 ahead of "now" is future? 
    // Or just skip for the mock since we don't have RPC connection here.
    // Let's just log it.
    
    // 3. Aggregate
    const { summaryHash: dataHash, liquidationCount } = await mockAggregator.aggregate(params);

    // 4. Construct Attestation
    const now = Math.floor(Date.now() / 1000);
    const expires = now + (60 * 60 * 24); // 24 hours validity

    // Compute ZK-Friendly Attestation Hash (Poseidon)
    // Inputs: protocol, expiresAt, subject, liquidationCount
    const attestationHash = await signer.computeAttestationHash(
        params.protocol,
        expires,
        params.subject,
        liquidationCount
    );

    const attestation: Attestation = {
      version: '1.0',
      issuer: 'plight-notary-v1', // Should ideally match pubkey or known ID
      subject: params.subject,
      issuedAt: now,
      expiresAt: expires,
      chainId: params.chainId,
      protocol: params.protocol,
      window: params.window,
      blockRange: params.blockRange,
      summaryHash: attestationHash // This is the SIGNED hash (Poseidon Output)
    };

    // 5. Sign (ZK-Friendly EdDSA on Poseidon)
    // Signs the decimal string representation of the Poseidon hash
    const signatureValue = await signer.signAttestationHash(attestationHash);

    const response: AttestationResponse = {
      attestation,
      signature: {
        scheme: 'eddsa-poseidon',
        value: signatureValue // 0x<R8x><R8y><S>
      }
    };

    return response;
  });
}
