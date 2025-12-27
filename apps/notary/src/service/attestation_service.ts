import { verifyAggregation } from '../verification/verify';
import { AttestationEnvelope } from '../attestation/types';
import { hashAttestation, hashPayload } from '../attestation/serialize';
import { globalSigner } from '../signing/signer';

// Configuration
const ATTESTATION_TTL_SECONDS = 3600; // 1 hour validity
const DOMAIN_ENV = 'production'; // Should probably be config driven
const ENGINE_VERSION = '2.1.0';

export interface AttestationRequest {
    clientPayload: string;     // Raw JSON string of user's aggregation result
    chainIds: number[];
    startBlock: number;
    endBlock: number;
    subject: string;
    nullifierCommitment: string;
}

export interface AttestationResponse {
    success: boolean;
    envelope?: AttestationEnvelope;
    signature?: string;
    publicKey?: string;
    error?: string;
}

// Deterministic Time Source Interface
export interface TimeProvider {
    now(): number; // Returns seconds since epoch
}

// Default implementation
const defaultTimeProvider: TimeProvider = {
    now: () => Math.floor(Date.now() / 1000)
};

/**
 * Orchestrates the full Phase 2 Notarization flow.
 * 
 * Flow:
 * 1. VERIFY: Re-execute aggregation and compare byte-for-byte.
 * 2. BIND: Create envelope with current timestamp and expiry.
 * 3. SIGN: Serialize, Hash, and Sign the envelope.
 * 
 * @param request Phase 1 output + metadata
 * @param timeProvider Optional injectable time source for deterministic testing
 * @returns Phase 2 Signed Attestation or Error
 */
export async function issueAttestation(
    request: AttestationRequest,
    timeProvider: TimeProvider = defaultTimeProvider
): Promise<AttestationResponse> {
    try {
        // --- STEP 1: VERIFICATION ---
        console.log('Verifying aggregation...');
        const verification = await verifyAggregation(
            request.clientPayload,
            request.chainIds,
            request.startBlock,
            request.endBlock,
            request.subject
        );

        if (!verification.verified) {
            console.warn('Verification failed:', verification.error);
            return {
                success: false,
                error: `Verification failed: ${verification.error}`
            };
        }

        // --- STEP 2: TIME BINDING & ENVELOPE CONSTRUCTION ---
        const now = timeProvider.now();

        // Extract verified components
        const signals = verification.payload.signals;
        const invariants = verification.payload.invariants;
        const metadata = verification.payload.metadata;

        // Compute Poseidon Commitment
        const payloadHash = hashPayload(signals, metadata.aggregation_block);

        // Construct the canonical envelope
        // This is the CRITICAL Trust Boundary where we promoting raw bytes to a Signed Fact.
        const envelope: AttestationEnvelope = {
            version: '1.0.0',
            domain: {
                chain_id: request.chainIds.length > 0 ? request.chainIds[0] : 0,
                environment: DOMAIN_ENV,
                aggregation_engine_version: ENGINE_VERSION
            },
            aggregation: {
                payload_hash: payloadHash,
                window_start_block: request.startBlock,
                window_end_block: request.endBlock
            },
            subject: {
                nullifier_commitment: request.nullifierCommitment // Opaque pass-through
            },
            time: {
                issued_at: now,
                expires_at: now + ATTESTATION_TTL_SECONDS
            },
            invariants: {
                complete_chain_data: invariants.complete_chain_data,
                adapter_execution_successful: invariants.adapter_execution_successful
            },
            signer: {
                key_id: globalSigner.keyId
            }
        };

        // --- STEP 3: SIGNING ---
        // Calculate the canonical hash of the envelope
        const envelopeHash = hashAttestation(envelope);

        // Sign the hash
        const signature = await globalSigner.sign(envelopeHash);

        return {
            success: true,
            envelope,
            signature,
            publicKey: globalSigner.getPublicKey()
        };

    } catch (error) {
        console.error('Attestation issuance crashed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Internal Notary Error'
        };
    }
}
