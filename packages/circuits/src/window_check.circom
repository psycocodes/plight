pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/comparators.circom";

/**
 * Enforces temporal validity and revocation safety.
 */
template WindowCheck() {
    signal input windowStart;
    signal input windowEnd;
    signal input revocationCutoff;
    
    // 1. Enforce windowStart < windowEnd
    // Using 64 bits for block numbers (safe for Ethereum)
    component lt = LessThan(64);
    lt.in[0] <== windowStart;
    lt.in[1] <== windowEnd;
    lt.out === 1; // Assert Input 0 < Input 1
    
    // 2. Enforce windowEnd >= revocationCutoff
    // "The aggregation window end block must be greater than or equal to the revocation cutoff block."
    // Wait, zk_statement says: "end_block >= revocation_cutoff_block".
    // Is it end or start?
    // Logic: If cutoff is 1000, and window is [500, 600]. End(600) < Cutoff(1000). Window is OLD.
    // If revocatin cutoff is "blocks after this are valid", then window must end AFTER or AT cutoff?
    // No, revocation cutoff usually means "Any attestation depending on state BEFORE this block is invalid".
    // Actually, "revocation_cutoff_block" usually means "The system is valid from this block onwards".
    // If cutoff is 1000. Window [500, 600] depends on state at 600.
    // If state at 600 is "revoked" because history was bad?
    // Task 3.2 says: "observation_window.end_block >= revocation_cutoff_block".
    // I will implement strictly as requested.
    
    component ge = GreaterEqThan(64);
    ge.in[0] <== windowEnd;
    ge.in[1] <== revocationCutoff;
    ge.out === 1;
}
