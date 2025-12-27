// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IHealthPolicy
 * @dev Interface for the HealthPolicy contract.
 */
interface IHealthPolicy {
    function isHealthy(
        address user,
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view returns (bool);
}

/**
 * @title SampleProtocol
 * @notice Demonstrates how a real protocol integrates a Plight-style health check.
 * 
 * INTEGRATION GUIDE:
 * 1. Protocol holds a reference to the Policy contract (HealthPolicy).
 * 2. Protocol does NOT perform eligibility logic itself.
 * 3. Protocol accepts a proof from the user and delegates verification to the Policy.
 */
contract SampleProtocol {
    /// @notice Reference to the HealthPolicy contract.
    IHealthPolicy public immutable healthPolicy;

    /// @notice Emitted when a user health check is verified.
    event HealthChecked(address indexed user, bool healthy);

    error HealthCheckFailed();

    /**
     * @param _policy The address of the deployed HealthPolicy contract.
     */
    constructor(address _policy) {
        require(_policy != address(0), "Invalid policy address");
        healthPolicy = IHealthPolicy(_policy);
    }

    /**
     * @notice Performs a health check for the calling user.
     * @dev Called by the user (client-side) passing their generated ZK proof.
     * @param proof The ZK proof bytes (Groth16).
     * @param publicInputs The public signals required by the ZK circuit.
     * 
     * NOTE: ZK proof generation happens entirely client-side. The protocol
     * simply acts as a Verifier-Consumer, gating action based on the result.
     */
    function checkHealth(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external {
        // 1. Call Policy to verify eligibility
        // The policy contract wraps the ZK verifier and ensures the proof binds to msg.sender.
        // We pass msg.sender to enforce that the proof belongs to the caller.
        bool isEligible = healthPolicy.isHealthy(msg.sender, proof, publicInputs);

        if (!isEligible) {
            revert HealthCheckFailed();
        }

        // 2. Perform Protocol Action
        // In a real protocol, this is where you would allow:
        // - Under-collateralized borrowing
        // - Specialized access
        // - Fee discounts
        
        emit HealthChecked(msg.sender, isEligible);
    }
}
