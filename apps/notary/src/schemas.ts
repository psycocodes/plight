import { z } from 'zod';

// Input Schema: Strictly defined by user requirements
// MUST NOT include wallet addresses (PERSISTED).
// However, subject is required for ZK binding.
export const AttestationRequestSchema = z.object({
  version: z.literal('1.0'),
  subject: z.string().regex(/^0x[a-fA-F0-9]{40}$/), // Added for ZK binding
  chainId: z.number().int().positive(),
  protocol: z.string(), // e.g., 'aave_v3'
  window: z.object({
    from: z.number(), // Timestamp or Block? "window: { from: number, to: number }" usually implies time or logical window
    to: z.number(),
  }),
  blockRange: z.object({
    fromBlock: z.number().int().nonnegative(),
    toBlock: z.number().int().nonnegative(),
  }),
});

export type AttestationRequest = z.infer<typeof AttestationRequestSchema>;

// Attestation Structure
export const AttestationSchema = z.object({
  version: z.literal('1.0'),
  issuer: z.string(), // "plight-notary-v1" or public key? using string identifier for now
  subject: z.string(), // Binding
  issuedAt: z.number(),
  expiresAt: z.number(),
  chainId: z.number(),
  protocol: z.string(),
  window: z.object({
    from: z.number(),
    to: z.number(),
  }),
  blockRange: z.object({
    fromBlock: z.number(),
    toBlock: z.number(),
  }),
  summaryHash: z.string(), // Poseidon Hash (BigInt string or Hex)
});

export type Attestation = z.infer<typeof AttestationSchema>;

// Final Response Schema
export const AttestationResponseSchema = z.object({
  attestation: AttestationSchema,
  signature: z.object({
    scheme: z.literal('eddsa-poseidon'), // ZK-Friendly
    value: z.string(), // Hex signature (R8x, R8y, S packed? or object?)
    // Usually we return R8x, R8y, S separately for ZK inputs.
    // Let's keep it as `value` for now but might need expansion.
  }),
});

export interface AttestationResponse {
  attestation: Attestation;
  signature: {
    scheme: string;
    value: string;
    publicKey?: [string, string];
  };
}
