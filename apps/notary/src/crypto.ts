import { buildPoseidon, buildEddsa } from 'circomlibjs';

let poseidon: any = null;
let eddsa: any = null;

// Initialize the library (WASM based)
export async function initCrypto() {
    if (!poseidon) {
        poseidon = await buildPoseidon();
    }
    if (!eddsa) {
        eddsa = await buildEddsa();
    }
}

export function getPoseidon() {
    if (!poseidon) throw new Error('Crypto not initialized. Call initCrypto() first.');
    return poseidon;
}

export function getEddsa() {
    if (!eddsa) throw new Error('Crypto not initialized. Call initCrypto() first.');
    return eddsa;
}

/**
 * Computes Poseidon hash of an array of inputs (BigInts or numbers or strings acting as BigInts).
 * Returns the hash as a hexadecimal string.
 */
export function poseidonHash(inputs: any[]): string {
    const p = getPoseidon();
    const hashBytes = p(inputs);
    // Convert generic hash to hex string for storage/transport
    return p.F.toString(hashBytes, 16);
}

/**
 * Signs a message hash with a private key using BabyJubJub EdDSA.
 * @param privateKey 32-byte hex string or Buffer
 * @param messageHash Hex string or BigInt
 */
export function eddsaSign(privateKey: string, messageHash: string) {
    const e = getEddsa();
    const p = getPoseidon();
    const privKeyBytes = Buffer.from(privateKey.replace('0x', ''), 'hex');
    const msgHashBigInt = p.F.e(messageHash);

    // signPoseidon expects (privKey, msg) where msg is a Field Element
    const signature = e.signPoseidon(privKeyBytes, msgHashBigInt);

    // Pack signature (R8x, R8y, S)
    const packed = e.packSignature(signature);
    return '0x' + Buffer.from(packed).toString('hex');
}

export function eddsaVerify(publicKey: string, messageHash: string, signature: string): boolean {
    const e = getEddsa();
    const p = getPoseidon();

    const pubKeyUnpacked = e.unpackPoint(Buffer.from(publicKey.replace('0x', ''), 'hex'));
    const sigUnpacked = e.unpackSignature(Buffer.from(signature.replace('0x', ''), 'hex'));
    const msgHashBigInt = p.F.e(messageHash);

    return e.verifyPoseidon(msgHashBigInt, sigUnpacked, pubKeyUnpacked);
}

export function getPublicKeyFromPrivate(privateKey: string): string {
    const e = getEddsa();
    const privKeyBytes = Buffer.from(privateKey.replace('0x', ''), 'hex');
    const pubKey = e.prv2pub(privKeyBytes);
    // Pack point to hex
    const packed = e.packPoint(pubKey);
    return '0x' + Buffer.from(packed).toString('hex');
}
