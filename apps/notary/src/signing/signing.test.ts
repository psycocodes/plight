import { issueAttestation } from '../service/attestation_service';
import { verifyAggregation } from '../verification/verify';
import { ethers } from 'ethers';
import assert from 'assert';
import * as verifyModule from '../verification/verify'; // For mocking

// We need to mock verifyAggregation to control the outcome without running the real engine
// Since we are in a simple node script environment without jest.mock, checking if we can swap the property.

// We will test `NotarySigner` separately? No, integration test is better.
// Monkey-patching verifyAggregation
const originalVerify = verifyModule.verifyAggregation;
const MOCK_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

let mockVerifyResult: {
    verified: boolean;
    verified_payload_hash: string | undefined;
    error: string | undefined;
} = {
    verified: true,
    verified_payload_hash: MOCK_HASH,
    error: undefined
};

// @ts-ignore
verifyModule.verifyAggregation = async () => {
    return mockVerifyResult;
};

async function runTests() {
    console.log('Running Signing Service Tests...\n');

    let passed = 0;
    let failed = 0;

    async function test(name: string, fn: () => Promise<void>) {
        try {
            await fn();
            console.log(`✓ ${name}`);
            passed++;
        } catch (e) {
            console.error(`✗ ${name} FAILED`);
            console.error(e);
            failed++;
        }
    }

    // Common Request Data
    const baseRequest = {
        clientPayload: '{}', // Mocked away
        chainIds: [1],
        startBlock: 100,
        endBlock: 200,
        subject: '0xSubject',
        nullifierCommitment: '0xNullifier'
    };

    // Test 1: Successful Issuance
    await test('Scenario: Successful Issuance', async () => {
        mockVerifyResult = { verified: true, verified_payload_hash: MOCK_HASH, error: undefined };

        const result = await issueAttestation(baseRequest);

        assert.strictEqual(result.success, true);
        assert.ok(result.envelope, 'Envelope should be present');
        assert.ok(result.signature, 'Signature should be present');

        // Check Payload binding
        assert.strictEqual(result.envelope?.aggregation.payload_hash, MOCK_HASH);

        // Check Time binding
        const now = Math.floor(Date.now() / 1000);
        assert.ok(result.envelope?.time.issued_at! <= now);
        assert.ok(result.envelope?.time.issued_at! > now - 5); // Within last 5 seconds
        assert.strictEqual(result.envelope?.time.expires_at, result.envelope?.time.issued_at! + 3600);
    });

    // Test 2: Verification Failure
    await test('Scenario: Verification Failure Aborts Signing', async () => {
        mockVerifyResult = { verified: false, verified_payload_hash: undefined, error: 'Mismatch' };

        const result = await issueAttestation(baseRequest);

        assert.strictEqual(result.success, false);
        assert.strictEqual(result.envelope, undefined);
        assert.strictEqual(result.signature, undefined);
        assert.ok(result.error?.includes('Mismatch'));
    });

    // Test 3: Signature Verification
    await test('Scenario: Signature is Valid', async () => {
        mockVerifyResult = { verified: true, verified_payload_hash: MOCK_HASH, error: undefined };
        const result = await issueAttestation(baseRequest);

        if (!result.success || !result.envelope || !result.signature || !result.publicKey) {
            throw new Error('Issuance failed unexpectedly');
        }

        // Manually verify
        // Reconstruct the hash
        const { hashAttestation } = require('../attestation/serialize');
        const msgHash = hashAttestation(result.envelope); // 0x... hex string
        const msgHashBytes = ethers.getBytes(msgHash);

        // Verify
        const recoveredAddress = ethers.verifyMessage(msgHashBytes, result.signature);

        // Derive address from exposed public key
        const expectedAddress = ethers.computeAddress(result.publicKey);

        assert.strictEqual(recoveredAddress, expectedAddress, 'Signature must recover to signer address');
    });

    // Test 4: Indeterminism of Time (Wait 1s)
    await test('Scenario: Different Time = Different Envelope', async () => {
        mockVerifyResult = { verified: true, verified_payload_hash: MOCK_HASH, error: undefined };

        const res1 = await issueAttestation(baseRequest);

        // Wait 1.1s to ensure distinct timestamp
        await new Promise(r => setTimeout(r, 1100));

        const res2 = await issueAttestation(baseRequest);

        assert.notDeepStrictEqual(res1.envelope, res2.envelope);
        assert.notStrictEqual(res1.envelope?.time.issued_at, res2.envelope?.time.issued_at);
        assert.notStrictEqual(res1.signature, res2.signature);
    });

    console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests();
