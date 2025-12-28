// @ts-ignore
import { buildEddsa, buildPoseidon } from 'circomlibjs';
// import { keccak256, toUtf8Bytes } from 'ethers'; // Removed, using Poseidon
import * as dotenv from 'dotenv';
import { Attestation } from '../schemas';

dotenv.config();

export class SignerService {
  private privateKey: Uint8Array;
  private eddsa: any;
  private poseidon: any;
  private initialized: Promise<void>;

  constructor() {
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
    this.initialized = this.init();
  }

  private async init() {
    this.eddsa = await buildEddsa();
    this.poseidon = await buildPoseidon();
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
  // Input: [policyId, expiresAt, userAddress, liquidationCount]
  // Note: we need specific signals. The generic "Attestation" object uses "summaryHash" to hold 
  // aggregation result. For ZK, we need to know that "summaryHash" acts as "liquidationCount" 
  // or contains it.
  // Ideally, `computeAttestationHash` should accept the RAW inputs.
  // But to adhere to the interface, we'll parse.
  public async computeAttestationHash(
      protocol: string, 
      expiresAt: number, 
      subject: string, 
      summaryValue: number // Extracted from aggregation
  ): Promise<string> {
      await this.initialized;
      
      const policyId = this.mapProtocolToId(protocol);
      const userAddrBigInt = BigInt(subject);
      
      // Hash Inputs: [policyId, expiresAt, userAddress, liquidationCount]
      const inputs = [
          BigInt(policyId),
          BigInt(expiresAt),
          userAddrBigInt,
          BigInt(summaryValue)
      ];

      const hash = this.poseidon(inputs);
      return this.poseidon.F.toString(hash); // Returns decimal string representation of field element
  }

  public async signAttestation(
      protocol: string, 
      expiresAt: number, 
      subject: string, 
      summaryValue: number
  ): Promise<string> {
      await this.initialized;
      
      const policyId = this.mapProtocolToId(protocol);
      const userAddrBigInt = BigInt(subject);
      
      const inputs = [
          BigInt(policyId),
          BigInt(expiresAt),
          userAddrBigInt,
          BigInt(summaryValue)
      ];

      console.log('[Signer] Signing inputs:', inputs.map(i => i.toString()));
      console.log('[Signer] Eddsa keys:', Object.keys(this.eddsa));

      // Ensure private key is Uint8Array and exactly 32 bytes
      const prvKey = new Uint8Array(32);
      prvKey.set(this.privateKey);

      // Debug Poseidon
      try {
        const testHash = this.poseidon(inputs);
        console.log('[Signer] Poseidon hash success:', this.poseidon.F.toString(testHash));
      } catch (e) {
        console.error('[Signer] Poseidon hash failed:', e);
      }

      // Fallback to signPoseidon if sign is missing, or try to find sign
      let signature;
      if (typeof this.eddsa.sign === 'function') {
          const hash = this.poseidon(inputs);
          signature = this.eddsa.sign(prvKey, hash);
      } else {
          console.log('[Signer] this.eddsa.sign not found, using signPoseidon');
          signature = this.eddsa.signPoseidon(prvKey, inputs);
      }
      
      const F = this.eddsa.F;
      const r8x = F.toObject(signature.R8[0]); // Uint8Array(32)
      const r8y = F.toObject(signature.R8[1]);
      const s = signature.S; // bigint

      const toHex = (n: Uint8Array) => Buffer.from(n).toString('hex').padStart(64, '0');
      
      const r8xHex = toHex(r8x);
      const r8yHex = toHex(r8y);
      let sHex = s.toString(16).padStart(64, '0');
      if (sHex.length % 2 !== 0) sHex = '0' + sHex;

      return `0x${r8xHex}${r8yHex}${sHex}`;
  }

  async signAttestationHash(hashDecimalString: string): Promise<string> {
    // Deprecated or fallback
    return this.signAttestation('aave_v3', 0, '0', 0); // Dummy
  }
  
  // Expose public key for the circuit
  async getPublicKey(): Promise<[string, string]> {
      await this.initialized;
      const pubKey = this.eddsa.prv2pub(this.privateKey);
      const F = this.eddsa.F;
      return [
          F.toString(pubKey[0]), 
          F.toString(pubKey[1])
      ];
  }
}
