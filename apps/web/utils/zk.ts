
import { ethers } from "ethers";

/**
 * Packs the SnarkJS proof object into the bytes format expected by PlightVerifier.sol
 * PlightVerifier.verifyProof(bytes calldata proof, uint256[] calldata publicSignals)
 * 
 * The proof bytes is the abi.encoded version of:
 * (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)
 * corresponding to the flattened pairing elements of Groth16.
 */
export function packProof(proof: any): string {
    const flat = [
        proof.pi_a[0], proof.pi_a[1],
        proof.pi_b[0][1], proof.pi_b[0][0],
        proof.pi_b[1][1], proof.pi_b[1][0],
        proof.pi_c[0], proof.pi_c[1]
    ];
    
    // Encode as 8 uint256s
    const coder = new ethers.AbiCoder();
    return coder.encode(
        ['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
        flat
    );
}
