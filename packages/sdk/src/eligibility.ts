
import { generateProof, ProofArtifacts, ZKProofResult, AttestationInput } from './proof.js';
// @ts-ignore
import { buildEddsa, buildPoseidon } from 'circomlibjs';

export interface EligibilityConfig {
    userAddress: string;
    protocol: string;
}

export interface EligibilityResult {
    isEligible: boolean;
    proof?: ZKProofResult;
    error?: string;
}

// ----- REAL NETWORK HELPERS (Connect to Notary) -----
export async function fetchAttestation(userAddress: string, protocol: string): Promise<AttestationInput> {
    console.log('[SDK] Fetching Attestation from Notary...');
    
    // Call the local Notary Service
    // Note: In a real app, this URL would be configurable via env vars
    // Using 127.0.0.1 to avoid IPv6 resolution issues with localhost
    const response = await fetch('http://127.0.0.1:3000/attest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            version: '1.0',
            subject: userAddress,
            protocol: protocol,
            chainId: 1, // Sepolia
            window: { from: 0, to: 0 }, // Dummy window
            blockRange: { fromBlock: 1, toBlock: 100 } // Valid dummy range
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Notary Service Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const { attestation, signature } = data;

    if (!signature.publicKey) {
        throw new Error("Notary response missing public key");
    }

    // Parse Signature (0x<R8x><R8y><S>)
    const sigHex = signature.value.replace(/^0x/, '');
    if (sigHex.length !== 192) { // 32*3 bytes * 2 chars/byte = 192 chars
        throw new Error(`Invalid signature length: ${sigHex.length}`);
    }

    const r8xHex = sigHex.substring(0, 64);
    const r8yHex = sigHex.substring(64, 128);
    const sHex = sigHex.substring(128, 192);

    // Convert Hex to BigInt -> String (Decimal)
    const r8x = BigInt('0x' + r8xHex).toString();
    const r8y = BigInt('0x' + r8yHex).toString();
    const s = BigInt('0x' + sHex).toString();

    return {
        protocol,
        expiresAt: attestation.expiresAt,
        subject: userAddress,
        liquidationCount: 0, // The Notary (mockAggregator) returns 0 for now
        notaryKeyAx: signature.publicKey[0],
        notaryKeyAy: signature.publicKey[1],
        sigR8x: r8x,
        sigR8y: r8y,
        sigS: s
    };
}
// --------------------------------------------------

export async function checkEligibility(
    config: EligibilityConfig,
    artifacts: ProofArtifacts
): Promise<EligibilityResult> {
    try {
        // 1. Fetch Data (Mocked Network, Real Crypto)
        const input = await fetchAttestation(config.userAddress, config.protocol);

        // 2. Check Eligibility Logic (Client-Side Pre-Check)
        if (input.liquidationCount > 0) {
            return { isEligible: false, error: 'User has recent liquidations.' };
        }

        // 3. Generate ZK Proof
        console.log('[SDK] Generating Proof...');
        const proofResult = await generateProof(input, artifacts);
        
        return {
            isEligible: true,
            proof: proofResult
        };

    } catch (error: any) {
        console.error('[SDK] Eligibility Check Failed:', error);
        return { isEligible: false, error: error.message || 'Unknown error' };
    }
}
