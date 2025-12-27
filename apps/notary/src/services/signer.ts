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
       this.privateKey = Buffer.from(envKey.replace(/^0x/, ''), 'hex');
    } else {
      // Dummy default for dev if not present
      this.privateKey = Buffer.alloc(32, 1); 
    }
    
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

  async signAttestationHash(hashDecimalString: string): Promise<string> {
    await this.initialized;
    
    const hashBigInt = BigInt(hashDecimalString);
    const signature = this.eddsa.signPoseidon(this.privateKey, hashBigInt);
    
    // Pack signature: R8x (32) + R8y (32) + S (32)
    // signature = { R8: [F.toObject(x), F.toObject(y)], S: bigint }
    
    const F = this.eddsa.F;
    const r8x = F.toObject(signature.R8[0]); // Uint8Array(32)
    const r8y = F.toObject(signature.R8[1]);
    const s = signature.S; // bigint

    // Convert S to 32-byte buffer (LE or BE? Circom uses LE usually, but let's check standard packing)
    // Actually, let's just use hex strings for valid output
    const toHex = (n: Uint8Array) => Buffer.from(n).toString('hex').padStart(64, '0');
    // For BigInt s, convert to buffer
    
    // We will return a specific format that the client can parse.
    // userAddress (hex) is 20 bytes.
    // Returns: 0x<R8x><R8y><S>
    
    const r8xHex = toHex(r8x);
    const r8yHex = toHex(r8y);
    // S is bigint. 
    let sHex = s.toString(16).padStart(64, '0');
    if (sHex.length % 2 !== 0) sHex = '0' + sHex;

    return `0x${r8xHex}${r8yHex}${sHex}`;
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
