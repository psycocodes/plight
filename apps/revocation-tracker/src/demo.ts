import 'dotenv/config';
import { RevocationTracker } from './tracker';
import { setVerbose } from 'aggregation-engine';

/**
 * DEMO SCRIPT: Real On-Chain Revocation Tracking
 * 
 * Scans the blockchain for revocation events defined in the Protocol Matrix.
 * Updates the local revocation state artifact.
 */
async function runDemo() {
    console.log('--- PLIGHT REVOCATION TRACKER DEMO ---');

    // Environment Check
    if (!process.env.ETH_RPC_URL) {
        console.error('❌ Error: ETH_RPC_URL is missing in .env');
        process.exit(1);
    }

    const tracker = new RevocationTracker(1, process.env.ETH_RPC_URL);

    console.log('1. Starting Scan...');

    try {
        // Scan a range where we know events might accept (or just recent blocks)
        // For demo speed, we scan a small recent range or a range known to have events if we knew one.
        // Since we are using real mainnet, we'll just scan the last 100 blocks.

        // NOTE: If this is the first run, it scans from block 0 (genesis). 
        // Scanning 19M blocks will take forever.
        // For the DEMO, we hack the store to start recently if it's currently 0.

        // Accessing private store for demo setup
        // @ts-ignore
        let state = tracker.store.load(1);
        if (state.last_scanned_block === 0) {
            console.log('   [Demo Setup] Fast-forwarding "last_scanned_block" to recent block for demo purposes...');
            state.last_scanned_block = 18900000;
            // @ts-ignore
            tracker.store.save(state);
        }

        const start = Date.now();
        const result = await tracker.scan(50); // Scan 50 blocks
        const duration = Date.now() - start;

        console.log(`\n2. Scan Complete in ${duration}ms`);
        console.log('   Current Revocation State:');
        console.log(JSON.stringify(result, null, 2));

    } catch (e) {
        console.error('❌ Tracking Failed:', e);
    }
}

runDemo();
