import { ethers } from 'ethers';
import { RevocationState } from './types';
import { REVOCATION_CONFIG } from './config';
import { RevocationStore } from './store';

/**
 * Revocation Tracker
 * 
 * Scans the blockchain for disqualifying events and updates the revocation state.
 * 
 * Invariant:
 * - Forward-only scanning.
 * - Monotonic cutoff block.
 * - Deterministic output.
 */
export class RevocationTracker {
    private store: RevocationStore;
    private provider: ethers.JsonRpcProvider;
    private chainId: number;

    constructor(chainId: number, rpcUrl: string, provider?: ethers.JsonRpcProvider | any) {
        this.chainId = chainId;
        this.store = new RevocationStore();
        this.provider = provider || new ethers.JsonRpcProvider(rpcUrl);
    }

    /**
     * Runs a scan cycle.
     * 
     * @param maxBlocksToScan Safety limit to prevent massive queries
     */
    public async scan(maxBlocksToScan: number = 1000): Promise<RevocationState> {
        // 1. Load current state
        let state = this.store.load(this.chainId);

        // 2. Determine scan range
        const currentBlock = await this.provider.getBlockNumber();
        const fromBlock = state.last_scanned_block + 1;
        let toBlock = Math.min(fromBlock + maxBlocksToScan, currentBlock);

        // If nothing to scan
        if (fromBlock > toBlock) {
            return state;
        }

        console.log(`Scanning revocation events from ${fromBlock} to ${toBlock}...`);

        // 3. Get configuration for this chain
        const eventsConfig = REVOCATION_CONFIG[this.chainId];
        if (!eventsConfig || eventsConfig.length === 0) {
            console.warn(`No revocation configuration for chain ${this.chainId}`);
            // Advance scanner anyway so we don't get stuck
            state.last_scanned_block = toBlock;
            state.produced_at = Math.floor(Date.now() / 1000);
            this.store.save(state);
            return state;
        }

        // 4. Scan for EACH configured event
        // To ensure determinism, we can process them sequentially or parallel, 
        // but the aggregation of max(blockNumber) is commutative/associative so order doesn't matter for the result.

        let maxDisqualifyingBlock = state.revocation_cutoff_block;

        for (const config of eventsConfig) {
            try {
                const contract = this.createContract(config.address, config.abi);
                // Get logs
                const filter = contract.filters[config.eventName]();
                const logs = await contract.queryFilter(filter, fromBlock, toBlock);

                for (const log of logs) {
                    const blockNumber = log.blockNumber;
                    // Monotonic update
                    if (blockNumber > maxDisqualifyingBlock) {
                        maxDisqualifyingBlock = blockNumber;
                    }
                }
            } catch (e) {
                console.error(`Failed to scan ${config.protocol} ${config.eventName}:`, e);
                // CRITICAL: If a scan fails, we MUST NOT advance the last_scanned_block
                // throwing here to abort the update
                throw new Error(`Scan failed for ${config.protocol}: ${e instanceof Error ? e.message : e}`);
            }
        }

        // 5. Update state
        state.revocation_cutoff_block = maxDisqualifyingBlock;
        state.last_scanned_block = toBlock;
        state.produced_at = Math.floor(Date.now() / 1000);

        // 6. Persist
        this.store.save(state);

        console.log(`Scan complete. Cutoff: ${state.revocation_cutoff_block}, Scanned: ${state.last_scanned_block}`);
        return state;
    }

    // Seam for testing
    protected createContract(address: string, abi: any[]): ethers.Contract {
        return new ethers.Contract(address, abi, this.provider);
    }
}
