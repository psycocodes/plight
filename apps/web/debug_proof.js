const snarkjs = require('snarkjs');
const { buildPoseidon } = require('circomlibjs');
const fs = require('fs');
const path = require('path');

async function debug() {
    try {
        console.log("Loading Poseidon...");
        const poseidon = await buildPoseidon();
        
        // Simulating inputs from proof.ts
        const input = {
            protocol: 'aave_v3',
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            subject: "0x0A8d770b27BeA25Cf8ad52a3F294847280193c8e",
            liquidationCount: 0,
            // dummy signature values (format not critical for "Too many values" check)
            notaryKeyAx: "123",
            notaryKeyAy: "456",
            sigR8x: "789",
            sigR8y: "101112",
            sigS: "131415"
        };
        
        const policyId = 1;
        const userAddrBigInt = BigInt(input.subject);
        
        const hashInputs = [
            BigInt(policyId),
            BigInt(input.expiresAt),
            userAddrBigInt,
            BigInt(input.liquidationCount)
        ];
        
        console.log("Calculating Hash...");
        const hash = poseidon(hashInputs);
        const attestationHash = poseidon.F.toString(hash);
        console.log("Attestation Hash:", attestationHash);

        const circuitInputs = {
            attestationHash: attestationHash,
            expiresAt: input.expiresAt,
            policyId: policyId,
            notaryKeyAx: input.notaryKeyAx,
            notaryKeyAy: input.notaryKeyAy,
            userAddress: input.subject,
            liquidationCount: input.liquidationCount,
            sigR8x: input.sigR8x,
            sigR8y: input.sigR8y,
            sigS: input.sigS
        };

        console.log("Circuit Inputs:", JSON.stringify(circuitInputs, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

        const wasmPath = path.join(__dirname, 'public', 'circuit.wasm');
        const zkeyPath = path.join(__dirname, 'public', 'circuit_final.zkey');
        
        console.log(`Using WASM: ${wasmPath}`);
        console.log(`Using ZKey: ${zkeyPath}`);

        console.log("Running fullProve...");
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            circuitInputs,
            wasmPath,
            zkeyPath
        );
        
        console.log("SUCCESS! Proof generated.");
        console.log("Public Signals:", publicSignals);

    } catch (err) {
        console.error("FAILURE:");
        console.error(err);
    }
}

debug();
