import { AttestationEnvelope } from './types';
import { serializeAttestation, hashAttestation } from './serialize';
import { ethers } from 'ethers';

// Helper to confirm equality
function assertEqual(label: string, actual: any, expected: any) {
    if (actual !== expected) {
        console.error(`❌ ${label} FAILED`);
        console.error(`   Expected: ${expected}`);
        console.error(`   Actual:   ${actual}`);
        process.exit(1);
    } else {
        console.log(`✓ ${label}`);
    }
}

// 1. Golden Vector
const GOLDEN_ENVELOPE: AttestationEnvelope = {
    version: '1.0.0',
    domain: {
        chain_id: 1,
        environment: 'production',
        aggregation_engine_version: '2.1.0'
    },
    aggregation: {
        payload_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        window_start_block: 1000000,
        window_end_block: 1000100
    },
    subject: {
        nullifier_commitment: '0xcommitment123'
    },
    time: {
        issued_at: 1700000000,
        expires_at: 1234 + 3600
    },
    invariants: {
        complete_chain_data: true,
        adapter_execution_successful: true
    },
    signer: {
        key_id: 'test-key'
    }
};

// Expected Canonical JSON (keys sorted alphabetically by fast-json-stable-stringify)
// domain keys: aggregation_engine_version, chain_id, environment
// aggregation keys: payload_hash, window_end_block, window_start_block
const EXPECTED_JSON = '{"aggregation":{"payload_hash":"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef","window_end_block":1000100,"window_start_block":1000000},"domain":{"aggregation_engine_version":"2.1.0","chain_id":1,"environment":"production"},"signer":{"key_id":"key-1"},"subject":{"nullifier_commitment":"0xcommitment123"},"time":{"expires_at":1700003600,"issued_at":1700000000},"version":"1.0.0"}';

// Expected Hash (Keccak256 of the above string)
const EXPECTED_HASH = ethers.keccak256(ethers.toUtf8Bytes(EXPECTED_JSON));

console.log('Running Attestation Golden Vector Tests...\n');

try {
    // Test Serialization
    const serializedBytes = serializeAttestation(GOLDEN_ENVELOPE);
    const serializedString = ethers.toUtf8String(serializedBytes);

    assertEqual('Serialization Stability', serializedString, EXPECTED_JSON);

    // Test Hashing
    const hash = hashAttestation(GOLDEN_ENVELOPE);
    console.log('Generated Hash:', hash);
    assertEqual('Hash Correctness', hash, EXPECTED_HASH);

    console.log('\nAll tests passed!');
} catch (e) {
    console.error('Test crashed:', e);
    process.exit(1);
}
