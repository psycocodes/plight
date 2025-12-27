import { logRpcCall, logRpcResponse } from '../logger';


export async function fetchLogsWithChunking(
  rpcUrl: string,
  address: string | undefined,
  topics: any[],
  startBlock: number,
  endBlock: number,
  initialChunkSize: number = 10000
): Promise<any[]> {
  // We use a loop to break the huge range into moderate chunks (e.g. 50k)
  // to avoid probable "Silent Empty" responses from RPCs on massive ranges,
  // while keeping the request count low (4-5 requests vs 200).
  // Inside each chunk, we use recursive adaptive splitting if errors occur.
  const allLogs: any[] = [];
  for (let from = startBlock; from <= endBlock; from += initialChunkSize) {
      const to = Math.min(from + initialChunkSize - 1, endBlock);
      const chunkLogs = await fetchLogsRecursive(rpcUrl, address, topics, from, to);
      allLogs.push(...chunkLogs);
  }
  return allLogs;
}

async function fetchLogsRecursive(
    rpcUrl: string,
    address: string | undefined,
    topics: any[],
    startBlock: number,
    endBlock: number
): Promise<any[]> {
    if (startBlock > endBlock) return [];

    const rpcParams = [{
        address: address,
        topics: topics,
        fromBlock: `0x${startBlock.toString(16)}`, 
        toBlock: `0x${endBlock.toString(16)}`
    }];

    logRpcCall('eth_getLogs', rpcParams);

    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getLogs',
                params: rpcParams,
            }),
        });

        const result = await response.json();

        // Handle specific RPC Errors that demand splitting
        if (result.error) {
            const code = result.error.code;
            const msg = result.error.message || "";
            
            // Limit Exceeded (-32005) or Response too large (often -32000 or specific messages)
            const isLimitError = code === -32005 || msg.includes("limit") || msg.includes("size") || msg.includes("too many");
            
            if (isLimitError) {
                // If we are down to 1 block and still failing, it's fatal or empty (unlikely for limit error if 1 block)
                if (startBlock === endBlock) {
                    throw new Error(`RPC Limit Error on single block ${startBlock}: ${msg}`);
                }

                // Split and Recurse
                // console.log(`[Backoff] Splitting range ${startBlock}-${endBlock} due to RPC limit...`);
                const mid = Math.floor((startBlock + endBlock) / 2);
                const left = await fetchLogsRecursive(rpcUrl, address, topics, startBlock, mid);
                const right = await fetchLogsRecursive(rpcUrl, address, topics, mid + 1, endBlock);
                return [...left, ...right];
            }

            throw new Error(`RPC Error: ${msg} (Code: ${code})`);
        }

        return result.result || [];

    } catch (e: any) {
        // Network errors or non-limit errors: Retry with backoff or standard error handling?
        // For now, if it's a fetch error (network), we should probably retry.
        // But to keep it simple and robust per user request: if it fails, try splitting if it's a large range.
        
        // If the range is large (> 2000), let's assume splitting might help stability
        if (endBlock - startBlock > 2000) {
             const mid = Math.floor((startBlock + endBlock) / 2);
             const left = await fetchLogsRecursive(rpcUrl, address, topics, startBlock, mid);
             const right = await fetchLogsRecursive(rpcUrl, address, topics, mid + 1, endBlock);
             return [...left, ...right];
        }

        throw e;
    }
}

