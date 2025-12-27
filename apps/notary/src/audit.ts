import { globalSigner } from './signing/signer';
import { AttestationEnvelope } from './attestation/types';

/**
 * Audit Artifacts
 * 
 * Exposes key system invariants and configuration for external auditors and the Phase 2 Verifier.
 */

// 1. Notary Public Identity
export const NOTARY_PUBLIC_KEY = globalSigner.getPublicKey();
export const NOTARY_ADDRESS = globalSigner.getAddress();

// 2. Schema Definition (JSON Schema could be generated here, effectively documenting the envelope)
// For now, we export the Typescript Interface name references to confirm the code structure.
export const SCHEMA_VERSION = '1.0.0';

export function getAuditInfo() {
    return {
        notary_public_key: NOTARY_PUBLIC_KEY,
        notary_address: NOTARY_ADDRESS,
        schema_version: SCHEMA_VERSION,
        timestamp: new Date().toISOString()
    };
}
