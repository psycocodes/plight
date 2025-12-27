import 'dotenv/config';
import { aggregate } from 'aggregation-engine';

/**
 * Plight Notary Service - Phase 2
 * 
 * TRUST BOUNDARY EXPLANATION:
 * - aggregation-engine: Shared, deterministic computation library. Pure logic.
 * - aggregator (apps/oracle): Phase 1 runner. Collects data, runs engine, publishes result.
 * - notary (this app): Phase 2 signer. Re-runs the SAME engine to verify results before signing.
 * 
 * This service currently unimplemented.
 * Future goal:
 * 1. Listen for Phase 1 proposals.
 * 2. Re-run aggregation engine using the same inputs as the proposal.
 * 3. Verify output matches proposal.
 * 4. Sign and submit attestation.
 */

import { initCrypto } from './crypto';

async function main() {
    console.log('Plight Notary Service starting...');
    await initCrypto();
    console.log('Crypto initialized (EdDSA/Poseidon)');

    console.log('TODO: Implement listening for Phase 1 proposals and re-running aggregation-engine.');

    // Example usage (commented out):
    // const output = await aggregate(chains, startBlock, endBlock, subject);
    // verify(output, proposal);
}

main();
