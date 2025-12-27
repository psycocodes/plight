pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/eddsaposeidon.circom";

template PlightVerifier() {
    // --- Public Inputs ---
    signal input attestationHash;
    signal input expiresAt;
    signal input policyId;
    signal input notaryKeyAx;
    signal input notaryKeyAy;
    signal input userAddress; // Binds proof to user

    // --- Private Inputs ---
    signal input liquidationCount; // Policy value
    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;

    // 1. Policy Check
    // Requirement: liquidationCount == 0
    // We enforce this constraint directly.
    liquidationCount === 0;

    // 2. Attestation Integrity
    // Verify attestationHash == hash(attestation fields)
    // Fields: policyId, expiresAt, userAddress, liquidationCount
    component hasher = Poseidon(4);
    hasher.inputs[0] <== policyId;
    hasher.inputs[1] <== expiresAt;
    hasher.inputs[2] <== userAddress;
    hasher.inputs[3] <== liquidationCount;

    hasher.out === attestationHash;

    // 3. Signature Verification
    // Verify notary signature over attestationHash
    component sigVerifier = EdDSAPoseidonVerifier();
    sigVerifier.enabled <== 1;
    sigVerifier.Ax <== notaryKeyAx;
    sigVerifier.Ay <== notaryKeyAy;
    sigVerifier.S <== sigS;
    sigVerifier.R8x <== sigR8x;
    sigVerifier.R8y <== sigR8y;
    sigVerifier.M <== attestationHash;
}

component main {public [attestationHash, expiresAt, policyId, notaryKeyAx, notaryKeyAy, userAddress]} = PlightVerifier();
