/**
 * Lido Staking Yield Adapter - Schema v2.1.0
 * Protocol: lido
 * Primitive: yield
 * Chains: Ethereum (1)
 * Events: Submitted (deposit)
 * 
 * FACTUAL OUTPUT ONLY
 */
import { YieldSignal, saturateCount, deriveHad } from '../../types';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';

export async function runLidoAdapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<YieldSignal> {
  if (chainId !== 1) {
    throw new Error(`Lido only supported on Ethereum mainnet`);
  }

  const stethAddress = getProtocolAddress('lido', 'yield', chainId, 'steth');
  logAddressResolution('lido', 'steth', stethAddress);

  const normalizedSubject = subject.toLowerCase();

  const submittedTopic = '0x96a25c8ce0baabc1fdefd93e9ed25d8e092a3332f3aa9a41722b5697231d1d1a';

  const rpcParams = [{
    address: stethAddress,
    topics: [submittedTopic],
    fromBlock: `0x${startBlock.toString(16)}`,
    toBlock: `0x${endBlock.toString(16)}`,
  }];

  logRpcCall('eth_getLogs', rpcParams);

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
  logRpcResponse('eth_getLogs', result, true);
  
  if (result.error) {
    throw new Error(`RPC error: ${result.error.message}`);
  }

  const logs = result.result || [];

  let depositCount = 0;

  for (const log of logs) {
    try {
      const sender = '0x' + log.topics[1]?.slice(26);
      if (sender?.toLowerCase() === normalizedSubject) {
        depositCount++;
      }
    } catch {
      continue;
    }
  }

  logEventFetch('lido', 'Submitted', logs.length, depositCount);

  depositCount = saturateCount(depositCount);

  logCountDerivation('yield', {
    deposit_count: depositCount,
  });

  return {
    had_deposit: deriveHad(depositCount),
    deposit_count: depositCount,
  };
}
