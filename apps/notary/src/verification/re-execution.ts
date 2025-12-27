import { aggregate } from 'aggregation-engine';

/**
 * Re-Executes the aggregation engine with the given parameters.
 * 
 * Invariant:
 * - This function must invoke the SHARED aggregation engine.
 * - It must NOT use any cached data from the user.
 * - It must be deterministic.
 * 
 * @param chainIds List of chains to aggregate over
 * @param startBlock Block number to start aggregation
 * @param endBlock Block number to end aggregation
 * @param subject Subject address to aggregate for
 * @returns The canonical, serialized aggregation output (JSON string)
 */
export async function reExecuteAggregation(
    chainIds: number[],
    startBlock: number,
    endBlock: number,
    subject: string
): Promise<string> {
    // Directly invoke the shared engine
    // The engine handles sorting chains, resolving windows, and ensuring determinism.
    return await aggregate(chainIds, startBlock, endBlock, subject);
}
