import { AttestationEnvelope, AttestationSignals } from './types';

// Constants matching Schema v2.1.0
// Order must match circuit signal assignment
// Signals: [
//   lending.had_borrow, lending.had_liquidation, lending.borrow_count, lending.liquidation_count,
//   dex.had_swap, dex.swap_count, dex.liquidity_add_count,
//   yield.had_deposit, yield.deposit_count,
//   governance.had_vote, governance.vote_count
// ]
// TOTAL: 11 signals + Padding? No, poseidon takes variable inputs.
// Circuit will expect these in specific indices.

export function flattenPayload(signals: AttestationSignals, aggregationBlock: number): bigint[] {
    const s = signals;
    // Helper to bool -> bigInt
    const b = (val: boolean) => val ? 1n : 0n;
    const n = (val: number) => BigInt(val);

    return [
        // Payload Content - aggregationBlock REMOVED from hash
        // n(aggregationBlock), 

        // Lending (4)
        b(s.lending.had_borrow),
        b(s.lending.had_liquidation),
        n(s.lending.borrow_count),
        n(s.lending.liquidation_count),

        // Dex (3)
        b(s.dex.had_swap),
        n(s.dex.swap_count),
        n(s.dex.liquidity_add_count),

        // Yield (2)
        b(s.yield.had_deposit),
        n(s.yield.deposit_count),

        // Governance (2)
        b(s.governance.had_vote),
        n(s.governance.vote_count)
    ];
}

export function flattenEnvelope(envelope: AttestationEnvelope): bigint[] {
    // Envelope Hash Structure for Signing
    // We cannot hash JSON anymore. We must hash the FIELDS.
    // Order:
    // 1. chain_id
    // 2. window_start
    // 3. window_end
    // 4. payload_hash (decimal representation of the hex hash)
    // 5. nullifier (decimal representation of hex)
    // 6. issued_at
    // 7. complete_chain_data (0/1)
    // 8. adapter_execution_successful (0/1)

    // Note: We hash the 'Preimage' of the envelope signature.

    return [
        BigInt(envelope.domain.chain_id),
        BigInt(envelope.aggregation.window_start_block),
        BigInt(envelope.aggregation.window_end_block),
        BigInt(envelope.aggregation.payload_hash), // Assuming payload_hash is already proper hex/dec string that fits in BigInt
        BigInt(envelope.time.issued_at),
        BigInt(envelope.subject.nullifier_commitment), // Nullifier
        envelope.invariants.complete_chain_data ? 1n : 0n,
        envelope.invariants.adapter_execution_successful ? 1n : 0n
    ];
}
