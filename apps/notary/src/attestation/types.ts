/**
 * Phase 2 Attestation Envelope Types
 * 
 * Invariants:
 * - Deterministic structure
 * - No optional fields
 * - Platform independent types (strings/numbers)
 */

export interface AttestationDomain {
    chain_id: number;
    environment: 'production' | 'staging' | 'development';
    aggregation_engine_version: string;
}

export interface AttestationAggregation {
    payload_hash: string;         // Hash of the aggregation output
    window_start_block: number;
    window_end_block: number;
}

export interface AttestationSubject {
    nullifier_commitment: string; // Opaque commitment
}

export interface AttestationTime {
    issued_at: number;            // Unix timestamp (seconds)
    expires_at: number;           // Unix timestamp (seconds)
}

export interface AttestationSigner {
    key_id: string;               // Identifier of the signing key
}

export interface AttestationInvariants {
    complete_chain_data: boolean;
    adapter_execution_successful: boolean;
}

export interface AttestationSignals {
    lending: {
        had_borrow: boolean;
        had_liquidation: boolean;
        borrow_count: number;
        liquidation_count: number;
    };
    dex: {
        had_swap: boolean;
        swap_count: number;
        liquidity_add_count: number;
    };
    yield: {
        had_deposit: boolean;
        deposit_count: number;
    };
    governance: {
        had_vote: boolean;
        vote_count: number;
    };
}

export interface AttestationEnvelope {
    version: '1.0.0';
    domain: AttestationDomain;
    aggregation: AttestationAggregation;
    subject: AttestationSubject;
    time: AttestationTime;
    invariants: AttestationInvariants;
    signer: AttestationSigner;
}
