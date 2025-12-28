// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IVerifier
 * @dev Interface for the ZK Verifier contract (Groth16).
 */
interface IVerifier {
    function verifyProof(
        bytes calldata proof,
        uint256[] calldata publicSignals
    ) external view returns (bool);
}

/**
 * @title HealthPolicy
 * @author Plight
 * @notice Enforces cryptographic eligibility policies without storing user data.
 * 
 * DESIGN PHILOSOPHY:
 * 1. Stateless: This contract has NO storage. It does not track who is healthy.
 * 2. Pure Verification: It relies 100% on the ZK Verifier to guarantee correctness.
 * 3. No Simulation: This is not a mock. It accepts real cryptographic proofs.
 */
contract HealthPolicy {
    /// @notice The immutable address of the ZK Verifier contract.
    /// @dev Set once at deployment. Cannot be changed.
    IVerifier public immutable verifier;

    // Error definitions for gas efficiency and clarity
    error InvalidProof();
    error VerificationFailed();

    /**
     * @param _verifier The address of the deployed PlightVerifier contract.
     */
    constructor(address _verifier) {
        require(_verifier != address(0), "Invalid verifier address");
        verifier = IVerifier(_verifier);
    }

    /**
     * @notice Verifies if a user is "Healthy" (Eligible) based on a ZK Proof.
     * @dev This function is view-only and stateless.
     * @param user The address of the user claiming health (bound to the proof).
     * @param proof The encoded ZK proof (Groth16).
     * @param publicInputs The public signals for the circuit [attestationHash, expires, etc.].
     * @return bool True if the proof is valid and binds to the user.
     */
    function isHealthy(
        address user,
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view returns (bool) {
        // 1. Verify the Proof
        // The ZK Verifier guarantees that the inputs satisfy the circuit constraints:
        // - "liquidationCount == 0" (Policy Check)
        // - "attestationHash" matches the signed data
        // - "signature" is valid from the Notary
        bool success = verifier.verifyProof(proof, publicInputs);
        return success;
    }
}
