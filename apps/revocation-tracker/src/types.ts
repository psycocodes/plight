/**
 * Revocation State Types
 * 
 * Defines the artifact schema for the global revocation state.
 */

export interface RevocationState {
    version: '1.0.0';
    chain_id: number;

    /**
     * The canonical cutoff block.
     * Any attestation relying on a window ending AFTER this block is potentially invalid.
     * Monotonic: This value can ONLY increase.
     */
    revocation_cutoff_block: number;

    /**
     * The highest block number that has been fully scanned for disqualifying events.
     * Resume scanning from last_scanned_block + 1.
     */
    last_scanned_block: number;

    /**
     * Timestamp when this state was produced.
     */
    produced_at: number;
}
