import assert from 'assert';
import { RevocationTracker } from './tracker';
import { RevocationStore } from './store';
import { RevocationState } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { ethers } from 'ethers';

// --- MOCKS ---
const mockLogs: any[] = [];
let mockBlockNumber = 1000;

// Mock Provider Interface
const mockProvider = {
    getBlockNumber: async () => mockBlockNumber,
} as unknown as ethers.JsonRpcProvider;

// Mock Contract that satisfies our needs
class MockContract {
    filters = {
        LiquidationCall: () => ({}),
        AbsorbDebt: () => ({}),
        LiquidateBorrow: () => ({})
    };

    async queryFilter(filter: any, from: number, to: number) {
        // Return logs that fall within the range
        return mockLogs.filter(log => log.blockNumber >= from && log.blockNumber <= to);
    }
}

// Testable Subclass
class TestableTracker extends RevocationTracker {
    protected createContract(address: string, abi: any[]): ethers.Contract {
        return new MockContract() as unknown as ethers.Contract;
    }
}

// --- TESTS ---

async function runTests() {
    console.log('Running Revocation Tracker Tests with Subclass Mocking...\n');

    // Clean up previous test data
    const testDataDir = path.join(__dirname, '../../data');
    const testStateFile = path.join(testDataDir, 'revocation_state.json');
    if (fs.existsSync(testStateFile)) fs.unlinkSync(testStateFile);

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

    // 1. Genesis State
    await test('Genesis State', async () => {
        const store = new RevocationStore();
        const state = store.load(1);
        assert.strictEqual(state.chain_id, 1);
        assert.strictEqual(state.revocation_cutoff_block, 0);
        assert.strictEqual(state.last_scanned_block, 0);
    });

    // 2. Scan with No Events
    await test('Scan with No Events', async () => {
        // Inject mockProvider
        const tracker = new TestableTracker(1, 'http://localhost:8545', mockProvider);
        mockBlockNumber = 100;
        mockLogs.length = 0; // Clear logs

        const state = await tracker.scan();

        assert.strictEqual(state.last_scanned_block, 100);
        assert.strictEqual(state.revocation_cutoff_block, 0); // Still 0
    });

    // 3. Scan with Events (Monotonic Increase)
    await test('Scan with Revocation Event', async () => {
        const tracker = new TestableTracker(1, 'http://localhost:8545', mockProvider);
        mockBlockNumber = 200;

        // Inject log at block 150
        mockLogs.push({ blockNumber: 150 });

        const state = await tracker.scan();

        assert.strictEqual(state.last_scanned_block, 200);
        assert.strictEqual(state.revocation_cutoff_block, 150);
    });

    // 4. Scan with OLDER Events (Monotonicity Check)
    await test('Monotonicity Check (Older Event)', async () => {
        const tracker = new TestableTracker(1, 'http://localhost:8545', mockProvider);
        mockBlockNumber = 300;

        // Previous scan finished at 200, cutoff at 150.
        // Inject log at 250.
        mockLogs.push({ blockNumber: 250 });

        const state = await tracker.scan();

        assert.strictEqual(state.revocation_cutoff_block, 250);
    });

    // 5. Restart Persistence
    await test('Persistence & Restart', async () => {
        // New tracker instance (simulates restart)
        const tracker = new TestableTracker(1, 'http://localhost:8545', mockProvider);
        // It should load state from disk (cutoff 250, scanned 300)

        mockBlockNumber = 400;
        // Inject log at 350
        mockLogs.push({ blockNumber: 350 });

        const state = await tracker.scan();

        assert.strictEqual(state.last_scanned_block, 400); // started from 301
        assert.strictEqual(state.revocation_cutoff_block, 350);
    });

    console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
}

runTests();
