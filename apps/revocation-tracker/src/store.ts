import * as fs from 'fs';
import * as path from 'path';
import stringify from 'fast-json-stable-stringify';
import { RevocationState } from './types';

const DATA_DIR = path.join(__dirname, '../../data');
const STATE_FILE = path.join(DATA_DIR, 'revocation_state.json');

/**
 * Handles persistence of the RevocationState.
 * Guarantees atomic writes and deterministic formatting.
 */
export class RevocationStore {
    constructor() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    /**
     * Loads the current revocation state from disk.
     * If no file exists, returns a genesis state.
     */
    public load(chainId: number): RevocationState {
        if (fs.existsSync(STATE_FILE)) {
            try {
                const content = fs.readFileSync(STATE_FILE, 'utf-8');
                const state = JSON.parse(content) as RevocationState;

                // Sanity check
                if (state.chain_id !== chainId) {
                    // In a real multi-chain system, we'd have a map by chainId.
                    // For this phase, we assume single chain operation or separate files.
                    // Returning genesis if chain mismatch (safest default)
                    return this.genesis(chainId);
                }
                return state;
            } catch (e) {
                console.error('Failed to parse revocation state file, resetting to genesis', e);
                return this.genesis(chainId);
            }
        }
        return this.genesis(chainId);
    }

    /**
     * Saves the revocation state to disk atomically.
     */
    public save(state: RevocationState): void {
        const currentState = this.load(state.chain_id);

        // HARDENING: Monotonicity Checks
        if (state.revocation_cutoff_block < currentState.revocation_cutoff_block) {
            throw new Error(`CRITICAL: Revocation cutoff regression detected! New: ${state.revocation_cutoff_block}, Old: ${currentState.revocation_cutoff_block}`);
        }

        if (state.last_scanned_block < currentState.last_scanned_block) {
            throw new Error(`CRITICAL: Scanner regression detected! New: ${state.last_scanned_block}, Old: ${currentState.last_scanned_block}`);
        }

        const tempFile = `${STATE_FILE}.tmp`;
        const content = stringify(state); // Deterministic stringify

        fs.writeFileSync(tempFile, content);
        fs.renameSync(tempFile, STATE_FILE); // Atomic replace
    }

    private genesis(chainId: number): RevocationState {
        return {
            version: '1.0.0',
            chain_id: chainId,
            revocation_cutoff_block: 0,
            last_scanned_block: 0,
            produced_at: Math.floor(Date.now() / 1000)
        };
    }
}
