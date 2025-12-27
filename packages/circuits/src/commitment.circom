pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/poseidon.circom";

/**
 * Computes the commitment (payload_hash) for Plight Phase 3.
 * Matches apps/notary/src/attestation/circuit_mapper.ts `flattenPayload`.
 */
template CommitmentHasher() {
    // Inputs matching flattenPayload order
    // aggregationBlock removed (Internal only)
    
    // Signals
    signal input lending[4]; // had_borrow, had_liq, borrow_cnt, liq_cnt
    signal input dex[3];     // had_swap, swap_cnt, liq_add_cnt
    signal input yield[2];   // had_deposit, deposit_cnt
    signal input governance[2]; // had_vote, vote_cnt
    
    signal output hash;

    // Total inputs = 4 + 3 + 2 + 2 = 11
    component hasher = Poseidon(11);
    
    // Lending
    hasher.inputs[0] <== lending[0];
    hasher.inputs[1] <== lending[1];
    hasher.inputs[2] <== lending[2];
    hasher.inputs[3] <== lending[3];
    
    // Dex
    hasher.inputs[4] <== dex[0];
    hasher.inputs[5] <== dex[1];
    hasher.inputs[6] <== dex[2];
    
    // Yield
    hasher.inputs[7] <== yield[0];
    hasher.inputs[8] <== yield[1];
    
    // Governance
    hasher.inputs[9] <== governance[0];
    hasher.inputs[10] <== governance[1];
    
    hash <== hasher.out;
}
