import { ethers } from 'ethers';
import { eddsaSign, getPublicKeyFromPrivate } from '../crypto';

/**
 * Notary Signer Module
 * 
 * Handles cryptographic signing of attestation envelopes.
 * 
 * Invariants:
 * - Uses EdDSA (BabyJubJub) signing with Poseidon hashing (ZK Optimized).
 * - Key management is abstracted here.
 * - Does NOT modify payload; only signs the provided hash.
 */
export class NotarySigner {
    private privateKey: string;
    public readonly keyId: string;
    // publicKey is computed on demand via getter

    constructor(privateKey?: string) {
        if (privateKey) {
            this.privateKey = privateKey;
        } else {
            console.warn('WARNING: No private key provided. generating random EdDSA key.');
            // Generate random 32 bytes
            this.privateKey = '0x' + Buffer.from(ethers.randomBytes(32)).toString('hex');
        }

        // Initialize public key immediately (since we initCrypto at startup)
        // Wait, constructor cannot await. We assume initCrypto is called before constructing or we call it lazily?
        // Let's assume global initCrypto has been called OR we compute strictly on demand.
        // But we want keyId constants.
        // We will make getters compute on demand if needed, but better to enforce init.
        // Actually, let's just use getters for safety or lazy init.
        // But constructor runs at import time for globalSigner?
        // globalSigner is at bottom of file. This is risky if crypto not ready.
        // I will make globalSigner lazy or export a function to get it.
        // Or better: The constructor stores the PRIV key, but public key is computed later?
        // getPublicKey() will compute it.
        this.privateKey = this.privateKey; // Just storage

        // keyId derived from public key later
        this.keyId = 'pending_init'; // Temporary
    }

    /**
     * Signs the Poseidon hash of the canonical attestation envelope.
     * 
     * @param messageHash The hex string of the Poseidon hash
     * @returns The EdDSA signature (R8x, R8y, S) packed hex
     */
    public async sign(messageHash: string): Promise<string> {
        // Ensure crypto loaded
        // We rely on service init.
        return eddsaSign(this.privateKey, messageHash);
    }

    public getPublicKey(): string {
        // This might throw if crypto not init
        return getPublicKeyFromPrivate(this.privateKey);
    }

    public getAddress(): string {
        // For EdDSA, address is just the Public Key (or specific derivation).
        // reusing Public Key as Identifier.
        return this.getPublicKey();
    }
}

let _signerInstance: NotarySigner | null = null;

export function getGlobalSigner(): NotarySigner {
    if (!_signerInstance) {
        _signerInstance = new NotarySigner(process.env.NOTARY_PRIVATE_KEY);
    }
    return _signerInstance;
}

// Legacy export for compat, but safer to use function
export const globalSigner = {
    sign: (hash: string) => getGlobalSigner().sign(hash),
    getPublicKey: () => getGlobalSigner().getPublicKey(),
    getAddress: () => getGlobalSigner().getAddress(),
    keyId: 'use_getAddress'
};
