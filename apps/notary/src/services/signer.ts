// Lazy load dependencies to prevent boot crashes on Vercel
let eddsa: any;
let poseidon: any;
let babyJub: any;
let utils: any;
let F1Field: any;
let Scalar: any;
let createBlakeHash: any;

function loadCryptoDeps() {
    if (eddsa) return; // Already loaded
    try {
        console.log('[Signer] Loading crypto dependencies...');
        const circom = require('circomlibjs');
        eddsa = circom.eddsa;
        poseidon = circom.poseidon;
        babyJub = circom.babyjub;
        
        const ff = require('ffjavascript');
        utils = ff.utils;
        F1Field = ff.F1Field;
        Scalar = ff.Scalar;
        
        createBlakeHash = require('blake-hash');
        console.log('[Signer] Dependencies loaded successfully.');
    } catch (e) {
        console.error('[Signer] Failed to load crypto dependencies:', e);
        throw e;
    }
}

import { keccak256, toUtf8Bytes } from 'ethers';
import * as dotenv from 'dotenv';
import { Attestation } from '../schemas';

dotenv.config();

// Helper to prune buffer (from circomlibjs implementation)
function pruneBuffer(_buff: any) {
    // Ensure dependencies are loaded
    // (This helper is used inside methods, so we can assume loadCryptoDeps called)
    const buff = Buffer.from(_buff);
    buff[0] = buff[0] & 0xF8;
    buff[31] = buff[31] & 0x7F;
    buff[31] = buff[31] | 0x40;
    return buff;
}

export class SignerService {
  private privateKey: Uint8Array;
  
  // Getters to access lazy deps
  get eddsa() { return eddsa; }
  get poseidon() { return poseidon; }

  constructor() {
    loadCryptoDeps(); // Load on init
    
    const envKey = process.env.NOTARY_PRIVATE_KEY;
    if (envKey) {
       const hexKey = envKey.replace(/^0x/, '');
       if (hexKey.length !== 64) {
         console.warn(`[Signer] Warning: NOTARY_PRIVATE_KEY length is ${hexKey.length} chars (expected 64). Padding/Truncating.`);
       }
       const buffer = Buffer.from(hexKey, 'hex');
       if (buffer.length < 32) {
         this.privateKey = Buffer.concat([buffer, Buffer.alloc(32 - buffer.length)]);
       } else {
         this.privateKey = buffer.subarray(0, 32);
       }
    } else {
      // Dummy default for dev if not present
      console.log('[Signer] Using dummy private key (NOTARY_PRIVATE_KEY not set)');
      this.privateKey = Buffer.alloc(32, 1); 
    }
    
    console.log(`[Signer] Private Key Length: ${this.privateKey.length}`);
    // No async init needed for older circomlibjs
  }

  // Helper for F field string conversion since we don't have async build
  // circomlibjs 0.0.8 uses internal FFjavascript but exposes less directly.
  // We can trust poseidon(inputs) returns a standard field element (BigInt-like)
  private elementToString(e: any): string {
      return e.toString();
  }

  private mapProtocolToId(protocol: string): number {
    switch(protocol.toLowerCase()) {
        case 'aave_v3': return 1;
        case 'compound_v3': return 2;
        case 'uniswap_v3': return 3;
        default: return 0;
    }
  }

  // Pre-compute the ATTESTATION HASH (Poseidon)
  public async computeAttestationHash(
      protocol: string, 
      expiresAt: number, 
      subject: string, 
      summaryValue: number // Extracted from aggregation
  ): Promise<string> {
      
      const policyId = this.mapProtocolToId(protocol);
      const userAddrBigInt = BigInt(subject);
      
      const inputs = [
          BigInt(policyId),
          BigInt(expiresAt),
          userAddrBigInt,
          BigInt(summaryValue)
      ];

      const hash = this.poseidon(inputs);
      return this.elementToString(hash); 
  }

  // Manually implement signPoseidon to bypass library bug in v0.0.8
  private signPoseidonManual(prv: Uint8Array, msg: BigInt | any) {
    // ERROR in error trace: Blake.update... TypeError: Data must be a string or a buffer.
    // Line 93: const h1 = createBlakeHash("blake512").update(prv).digest();
    // 'prv' is Uint8Array? 
    // Wait, createBlakeHash might expect Buffer explicitly if not shimmed for Uint8Array?
    // Let's force Buffer.
    const h1 = createBlakeHash("blake512").update(Buffer.from(prv)).digest();
    const sBuff = pruneBuffer(h1.slice(0,32));
    const s = utils.leBuff2int(sBuff);
    const A = babyJub.mulPointEscalar(babyJub.Base8, Scalar.shr(s, 3));

    // Convert message (hash) to buffer manually, avoiding the buggy ensureBuffer
    const msgBuff = utils.leInt2Buff(msg, 32);
    
    const rBuff = createBlakeHash("blake512").update(Buffer.concat([h1.slice(32,64), msgBuff])).digest();
    let r = utils.leBuff2int(rBuff);
    const Fr = new F1Field(babyJub.subOrder);
    r = Fr.e(r);
    const R8 = babyJub.mulPointEscalar(babyJub.Base8, r);
    // Use instance poseidon
    const hm = this.poseidon([R8[0], R8[1], A[0], A[1], msg]);
    const S = Fr.add(r , Fr.mul(hm, s));
    return {
        R8: R8,
        S: S
    };
  }


  public async signAttestation(
      protocol: string, 
      expiresAt: number, 
      subject: string, 
      summaryValue: number
  ): Promise<string> {
      
      const policyId = this.mapProtocolToId(protocol);
      const userAddrBigInt = BigInt(subject);
      
      const inputs = [
          BigInt(policyId),
          BigInt(expiresAt),
          userAddrBigInt,
          BigInt(summaryValue)
      ];

      console.log('[Signer] Signing inputs:', inputs.map(i => i.toString()));

      // Ensure private key is Uint8Array and exactly 32 bytes
      const prvKey = new Uint8Array(32);
      prvKey.set(this.privateKey);

      // 1. Hash with Poseidon
      const hash = this.poseidon(inputs);
      console.log('[Signer] Poseidon hash calculated');

      // 2. Sign the Hash (Manual Implementation)
      const hashBigInt = BigInt(hash.toString());
      const signature = this.signPoseidonManual(prvKey, hashBigInt);
      
      // 3. Serialize to Hex for the client
      const packed = this.eddsa.packSignature(signature);
      return '0x' + packed.toString('hex');
  }

  // Expose public key for the circuit
  async getPublicKey(): Promise<[string, string]> {
      const pubKey = this.eddsa.prv2pub(this.privateKey);
      
      // Case-sensitivity! require('circomlibjs').babyjub (lowercase)
      const babyJub = require('circomlibjs').babyjub;
      const F = babyJub.F;

      return [
          F.toString(pubKey[0]), 
          F.toString(pubKey[1])
      ];
  }
}
