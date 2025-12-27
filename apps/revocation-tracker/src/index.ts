import 'dotenv/config';
import { RevocationTracker } from './tracker';

/**
 * Revocation Tracker Application
 * 
 * Runs a continuous loop to scan for revocation events across supported chains.
 * This is a background service.
 */

const POLL_INTERVAL_MS = 60000; // 1 minute

async function main() {
    console.log('--- PLIGHT REVOCATION TRACKER SERVICE ---');

    if (!process.env.ETH_RPC_URL) {
        console.error('❌ Error: ETH_RPC_URL is missing in .env');
        process.exit(1);
    }

    // In a real app we would iterate over all supported chains.
    // For Phase 2, we focus on Chain 1 (Mainnet).
    const tracker = new RevocationTracker(1, process.env.ETH_RPC_URL);

    console.log('Service started. Polling every 60s...');

    const runLoop = async () => {
        try {
            await tracker.scan();
        } catch (e) {
            console.error('Error in scan loop:', e);
        }
        setTimeout(runLoop, POLL_INTERVAL_MS);
    };

    runLoop();
}

main();
