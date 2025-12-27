pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/switcher.circom";

/**
 * Merkle Tree Inclusion Proof
 * Computes the root given a leaf and a path.
 * 
 * nLevels: Depth of the tree
 */
template MerkleTreeInclusionProof(nLevels) {
    signal input leaf;
    signal input pathIndex[nLevels];     // 0 for Left, 1 for Right
    signal input pathElements[nLevels];  // Sibling hash
    signal output root;

    component hashers[nLevels];
    component switchers[nLevels];

    for (var i = 0; i < nLevels; i++) {
        switchers[i] = Switcher();
        // If i=0, input is leaf. Else input is previous hash.
        if (i==0) {
            switchers[i].L <== leaf;
        } else {
            switchers[i].L <== hashers[i-1].out;
        }
        switchers[i].R <== pathElements[i];
        switchers[i].sel <== pathIndex[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== switchers[i].outL;
        hashers[i].inputs[1] <== switchers[i].outR;
    }
    
    root <== hashers[nLevels-1].out;
}
