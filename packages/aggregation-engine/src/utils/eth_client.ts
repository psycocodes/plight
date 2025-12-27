import { logRpcCall, logRpcResponse } from '../logger';

export async function fetchLogsWithChunking(
  rpcUrl: string,
  address: string,
  topics: any[],
  startBlock: number,
  endBlock: number,
  chunkSize: number = 2000
): Promise<any[]> {
  let allLogs: any[] = [];
  
  for (let from = startBlock; from <= endBlock; from += chunkSize) {
    const to = Math.min(from + chunkSize - 1, endBlock);
    
    const rpcParams = [{
      address: address,
      topics: topics,
      fromBlock: `0x${from.toString(16)}`,
      toBlock: `0x${to.toString(16)}`,
    }];

    // logRpcCall('eth_getLogs', rpcParams); // Optional: reduce log spam

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
    
    if (result.error) {
       throw new Error(`RPC error in chunk ${from}-${to}: ${result.error.message}`);
    }
    
    if (result.result) {
        allLogs = allLogs.concat(result.result);
    }
  }
  
  return allLogs;
}
