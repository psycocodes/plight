import { verifyAggregation } from './verify';
import * as reExecutionModule from './re-execution';
// Removed unused jest import
import assert from 'assert';

// Mock Data
const MOCK_TRUSTED_PAYLOAD = JSON.stringify({
    foo: "bar",
    count: 123,
    nested: {
        a: 1
    }
});

// Since I cannot easily use Jest in this environment without setup, I will mock by overwriting the function directly in this test script if possible,
// or better, I will use a simple specialized test runner approach here.

// Simple method swizzling for testing
let mockImpl: any = null;
const originalReExecute = reExecutionModule.reExecuteAggregation;

// @ts-ignore
reExecutionModule.reExecuteAggregation = async (...args) => {
    if (mockImpl) return mockImpl(...args);
    return MOCK_TRUSTED_PAYLOAD;
};


async function runTests() {
    console.log('Running Verification Module Tests...\n');

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

    // Test 1: Exact Match
    await test('Scenario: Perfect Match', async () => {
        // Client sends exact same JSON structure
        const clientPayload = JSON.stringify({
            foo: "bar",
            count: 123,
            nested: { a: 1 }
        });

        const result = await verifyAggregation(clientPayload, [1], 100, 200, "0xSubject");

        assert.strictEqual(result.verified, true, 'Should be verified');
        assert.ok(result.payload, 'Should return payload');
    });

    // Test 2: JSON Formatting Differences (Should pass because of canonicalization)
    await test('Scenario: Formatting Differences (Whitespace)', async () => {
        // Client sends different whitespace
        const clientPayload = `{
      "foo": "bar",
      "count": 123,
      "nested": {
        "a": 1
      }
    }`;

        const result = await verifyAggregation(clientPayload, [1], 100, 200, "0xSubject");

        // It should PASS because verifyAggregation normalizes both inputs
        assert.strictEqual(result.verified, true, 'Should be verified despite whitespace');
    });

    // Test 3: Key Ordering Differences (Should pass because of canonicalization)
    await test('Scenario: Key Ordering Differences', async () => {
        const clientPayload = JSON.stringify({
            count: 123,  // swapped order
            foo: "bar",
            nested: { a: 1 }
        });

        const result = await verifyAggregation(clientPayload, [1], 100, 200, "0xSubject");

        assert.strictEqual(result.verified, true, 'Should be verified despite key order');
    });

    // Test 4: Single Bit Mutation (Value mismatch)
    await test('Scenario: Single Bit Mutation (Value)', async () => {
        const clientPayload = JSON.stringify({
            foo: "baz", // 'r' -> 'z'
            count: 123,
            nested: { a: 1 }
        });

        const result = await verifyAggregation(clientPayload, [1], 100, 200, "0xSubject");

        assert.strictEqual(result.verified, false, 'Should fail verification');
        assert.ok(result.error?.includes('mismatch'), 'Should have mismatch error');
    });

    // Test 5: Single Bit Mutation (Key mismatch)
    await test('Scenario: Single Bit Mutation (Key)', async () => {
        const clientPayload = JSON.stringify({
            foz: "bar", // 'foo' -> 'foz'
            count: 123,
            nested: { a: 1 }
        });

        const result = await verifyAggregation(clientPayload, [1], 100, 200, "0xSubject");

        assert.strictEqual(result.verified, false, 'Should fail verification');
    });

    // Test 6: Missing Field
    await test('Scenario: Missing Field', async () => {
        const clientPayload = JSON.stringify({
            foo: "bar",
            // count missing
            nested: { a: 1 }
        });

        const result = await verifyAggregation(clientPayload, [1], 100, 200, "0xSubject");

        assert.strictEqual(result.verified, false, 'Should fail verification');
    });

    // Test 7: Extra Field
    await test('Scenario: Extra Field', async () => {
        const clientPayload = JSON.stringify({
            foo: "bar",
            count: 123,
            extra: "malicious_data",
            nested: { a: 1 }
        });

        const result = await verifyAggregation(clientPayload, [1], 100, 200, "0xSubject");

        assert.strictEqual(result.verified, false, 'Should fail verification');
    });

    // Test 8: Engine Failure (Re-execution failure)
    await test('Scenario: Engine Failure', async () => {
        // Mock engine failure
        mockImpl = async () => { throw new Error('RPC Error'); };

        const clientPayload = MOCK_TRUSTED_PAYLOAD;
        const result = await verifyAggregation(clientPayload, [1], 100, 200, "0xSubject");

        assert.strictEqual(result.verified, false, 'Should fail verification on engine error');
        assert.ok(result.error?.includes('RPC Error'), 'Should pass through error');

        // Reset mock
        mockImpl = null;
    });

    console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests();
