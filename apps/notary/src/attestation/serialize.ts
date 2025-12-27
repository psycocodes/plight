import stringify from 'fast-json-stable-stringify';
import { ethers } from 'ethers';
import { AttestationEnvelope } from './types';

/**
 * Serializes the AttestationEnvelope into a canonical byte array.
 * 
 * Rules:
 * - Uses fast-json-stable-stringify for deterministic key ordering.
 * - Result is a UTF-8 encoded buffer of the JSON string.
 * - This guarantees byte-for-byte reproducibility for identical inputs.
 * 
 * @param envelope The envelope to serialize
 * @returns Uint8Array of the serialized bytes
 */
export function serializeAttestation(envelope: AttestationEnvelope): Uint8Array {
    // 1. Validate version (sanity check)
    if (envelope.version !== '1.0.0') {
        throw new Error(`Unsupported version: ${envelope.version}`);
    }

    // 2. Canonical JSON stringify
    // fast-json-stable-stringify guarantees deterministic sorting of keys
    const jsonString = stringify(envelope);

    // 3. Convert to UTF-8 bytes
    return ethers.toUtf8Bytes(jsonString);
}

import { poseidonHash } from '../crypto';
import { flattenEnvelope, flattenPayload } from './circuit_mapper';
import { AttestationSignals } from './types';

/**
 * Hashes the AttestationEnvelope for ZK-compatible signing.
 * 
 * Rule:
 * - flattenEnvelope(envelope) -> BigInt[]
 * - Poseidon(BigInt[]) -> Hex String
 */
export function hashAttestation(envelope: AttestationEnvelope): string {
    const flattened = flattenEnvelope(envelope);
    return poseidonHash(flattened);
}

/**
 * Hashes the Aggregation Payload (Signals + Private Metadata).
 * 
 * Rule:
 * - flattenPayload(signals, aggBlock) -> BigInt[]
 * - Poseidon(BigInt[]) -> Hex String
 */
export function hashPayload(signals: AttestationSignals, aggregationBlock: number): string {
    const flattened = flattenPayload(signals, aggregationBlock);
    return poseidonHash(flattened);
}
