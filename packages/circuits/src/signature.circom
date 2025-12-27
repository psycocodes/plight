pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/eddsaposeidon.circom";

/**
 * Verifies that the Attestation Envelope Hash was signed by the Notary.
 */
template SignatureVerifier() {
    signal input envelopeHash;
    
    // Signature (R8, S)
    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;
    
    // Notary Public Key
    signal input pubKeyAx;
    signal input pubKeyAy;
    
    component verifier = EdDSAPoseidonVerifier();
    verifier.enabled <== 1;
    verifier.Ax <== pubKeyAx;
    verifier.Ay <== pubKeyAy;
    verifier.S <== sigS;
    verifier.R8x <== sigR8x;
    verifier.R8y <== sigR8y;
    verifier.M <== envelopeHash;
}
