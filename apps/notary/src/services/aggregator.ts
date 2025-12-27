import { AttestationRequest } from '../schemas';
import { keccak256, toUtf8Bytes } from 'ethers';
import { aggregate, setVerbose } from 'aggregation-engine';

// Interface for aggregation
// This MUST be replaceable easily.
export interface AggregationService {
  aggregate(params: AttestationRequest): Promise<{ summaryHash: string; liquidationCount: number }>;
}


// REAL Implementation
export const mockAggregator: AggregationService = {
  aggregate: async (params: AttestationRequest) => {
    console.log('[Notary] Running real aggregation...', params);
    
    // Ensure verbosity is low for performance
    setVerbose('none');

    // Use subject from valid schema
    // Note: Implicit ZK requirement satisfied by schema update.
    const subject = params.subject;

    // Call engine (real)
    const outputString = await aggregate(
        [params.chainId],
        params.blockRange.fromBlock,
        params.blockRange.toBlock,
        subject
    );
    
    // Parse output to extract signals for ZK Proof
    const output = JSON.parse(outputString);
    
    // We assume 'lending' signals exist or default to 0 if missing (though engine ensures structure)
    const liquidationCount = output.signals?.lending?.liquidation_count || 0;
    
    // Deterministic Hash (Keccak of the serialized output is the "Summary Commitment")
    // Note: The "Attestation Hash" signed by ZK is different (Poseidon).
    // This summaryHash serves as the data payload identifier.
    const summaryHash = keccak256(toUtf8Bytes(outputString));
    
    return { summaryHash, liquidationCount };
  },
};
