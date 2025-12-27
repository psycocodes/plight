# Plight Circuit Implementation Report (Phase 3)

## Overview
This report documents the implementation of the Zero-Knowledge circuits for the Plight protocol, updated to address critical cryptographic independence and trust minimization requirements.

**Statement Version**: v1.1
**Verification Mode**: ZK-Only (Trust Set Enforced)

## Circuit Architecture
The circuit logic is modularized into five key components:
1.  **Commitment Circuit (`commitment.circom`)**: Computes `payload_hash` from semantic signals (`lending`, `dex`, `yield`, `governance`).
    *   **CRITICAL FIX**: `aggregation_block` and engine internals are strictly EXCLUDED from this hash to ensure schema neutrality.
2.  **Signature Verification (`signature.circom`)**: Verifies the EdDSA signature over the `envelope_hash`.
3.  **Merkle Key Enforcement (`merkle_proof.circom`)**: Enforces that the signing key exists within a trusted `notaryKeyRoot`.
4.  **Window Check (`window_check.circom`)**: Enforces temporal logic.
5.  **Main Verifier (`main.circom`)**: Integrates components and enforces invariants.

## Enforced Invariants

### 1. Trust & Authority
- **Authorized Signer**: The Notary Public Key used for verification MUST be a member of the Merkle Tree defined by `notaryKeyRoot` (Public Input).
- **Signature Validity**: The `envelope_hash` MUST be strictly signed by the authorized Private Key.

### 2. Payload Integrity
- **Semantic Binding**: The `payload_hash` verifies ONLY the public signals. Engine internals (`aggregation_block`) are treated as untrusted metadata and excluded from the claim.
- **Envelope Consistency**: `envelope_hash = Poseidon(chainId, windowStart, windowEnd, payloadHash, issuedAt, nullifier, completeChainData, adapterExecutionSuccessful)`.

### 3. Temporal Validity
- **Window Sequence**: `window_start < window_end`.
- **Revocation Safety**: `window_end >= revocation_cutoff`.

### 4. Input Semantics
- **`issuedAt`**: This timestamp is cryptographically bound to the envelope (preventing modification) but is NOT constrained by temporal logic in the circuit. It serves as authenticated metadata.
- **`aggregation_block`**: Excluded from circuit.

## Circuit Stats
- **Total Non-Linear Constraints**: 13,505
- **Total Linear Constraints**: 8,235
- **Constraint Breakdown** (Approximate):
  - **Signature Verification (EdDSA)**: ~3,500
  - **Merkle Proof (Depth 20)**: ~5,000
  - **Commitment Hashing**: ~4,500
  - **Window/Control Logic**: ~500

## Verification checklist
- [x] **Correctness**: Valid proofs verified.
- [x] **Security**: Self-signed attestations by arbitrary keys REJECTED (Merkle Root enforcement).
- [x] **Isolation**: Window constraints verified independently.
- [x] **Independence**: Aggregation Block removed from cryptographic claim.
