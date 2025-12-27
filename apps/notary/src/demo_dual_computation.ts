import 'dotenv/config';
import { aggregate, setVerbose } from 'aggregation-engine';
import { issueAttestation } from './service/attestation_service';

// Enable verbose logging to show internal engine mechanics
setVerbose('default');

/**
 * DEMO SCRIPT: Dual Computation & Attestation Flow
 * 
 * This script demonstrates the end-to-end integration:
 * 1. [CLIENT] Runs aggregation-engine to generate a payload.
 * 2. [NOTARY] Receives payload, RE-RUNS aggregation-engine (dual computation).
 * 3. [NOTARY] Verifies match.
 * 4. [NOTARY] Issues signed attestation.
 */

async function runDemo() {
    console.log('--- PLIGHT PHASE 2 DEMONSTRATION ---');
    console.log('Context: Dual Computation & Signed Attestation\n');

    // Parameters
    // Using a mock subject/block for demonstration.
    // NOTE: This will fail if RPCs are not configured in .env!
    const chainIds = [1];
    const startBlock = 18900000;
    const endBlock = 18900100;
    const subject = '0x87870Bca3F5fD8f63AC37fCc982BbBD6d30e6C0B5'; // Some address
    const nullifierCommitment = '0x12345...commitment...67890';

    try {
        // --- STEP 1: CLIENT COMPUTATION ---
        console.log('1. [CLIENT] Running Aggregation Engine locally...');
        // We expect this to fail if keys are missing, which is FINE for the demo to show it's hitting the engine.
        const clientPayload = await aggregate(chainIds, startBlock, endBlock, subject);
        console.log('   ✓ Client Payload Generated:', clientPayload.substring(0, 100) + '...');

        // --- STEP 2: NOTARY REQUEST ---
        console.log('\n2. [NOTARY] Submitting Request to Notary Service...');

        const request = {
            clientPayload,
            chainIds,
            startBlock,
            endBlock,
            subject,
            nullifierCommitment
        };

        const response = await issueAttestation(request);

        if (response.success) {
            console.log('\n3. [NOTARY] Success! Attestation Issued.');
            console.log('   ✓ Verified Payload Hash:', response.envelope?.aggregation.payload_hash);
            console.log('   ✓ Issued At:', response.envelope?.time.issued_at);
            console.log('   ✓ Signature:', response.signature);
        } else {
            console.error('\n3. [NOTARY] Failed:', response.error);
        }

    } catch (error) {
        console.error('\n❌ DEMO HALTED');
        console.error('Reason:', error instanceof Error ? error.message : error);

        if (error instanceof Error && error.message.includes('required for chain')) {
            console.log('\n>>> NOTE TO USER: Missing RPC Keys detected. This confirms the engine is initialized correctly but needs .env configuration.');
        }
    }
}

runDemo();
