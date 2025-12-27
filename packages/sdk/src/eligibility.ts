
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

// ----- MOCK NETWORK HELPERS (Simulate Notary) -----
async function fetchAttestation(userAddress: string, protocol: string): Promise<AttestationInput> {
    console.log('[SDK] Simulating Notary Attestation Fetch...');
    
    // In a real app, this would be: await fetch('https://notary.plight.io/attest', ...)
    
    // To make the Real ZK Proof pass, we need a VALID signature for these inputs.
    // We will generate a one-time keypair here to act as the "Notary" for this session.
    // This allows the browser SDK to self-verify a "happy path" without a live server.
    
    const eddsa = await buildEddsa();
    const poseidon = await buildPoseidon();
    
    // 1. Generate Ephemeral Notary Key
    const prvKey = Buffer.from('0001020304050607080900010203040506070809000102030405060708090001', 'hex');
    const pubKey = eddsa.prv2pub(prvKey);
    const F = eddsa.F;

    // 2. Define "Clean" Record (Liquidation Count = 0)
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const liquidationCount = 0; // PASS
    
    // 3. Compute Hash
    // [policyId(1), expiresAt, userAddress, count]
    // Assume protocol 'aave_v3' -> 1
    const policyId = 1; 
    const inputs = [
        BigInt(policyId),
        BigInt(expiresAt),
        BigInt(userAddress),
        BigInt(liquidationCount)
    ];
    const hash = poseidon(inputs);
    
    // 4. Sign
    const signature = eddsa.signPoseidon(prvKey, hash);
    
    return {
        protocol,
        expiresAt,
        subject: userAddress,
        liquidationCount,
        notaryKeyAx: F.toString(pubKey[0]),
        notaryKeyAy: F.toString(pubKey[1]),
        sigR8x: F.toString(signature.R8[0]),
        sigR8y: F.toString(signature.R8[1]),
        sigS: signature.S.toString()
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
