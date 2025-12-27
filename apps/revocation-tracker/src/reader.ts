import { RevocationStore } from './store';
import { RevocationState } from './types';

const store = new RevocationStore();

/**
 * Read-Only Access to Global Revocation State.
 * 
 * Used by Phase 3 (Signing) to verify if an attestation window is valid.
 * This function handles NO enforcement; it only retrieves the fact.
 * 
 * @param chainId The chain to query
 * @returns The current revocation state
 */
export function getRevocationState(chainId: number): RevocationState {
    return store.load(chainId);
}
