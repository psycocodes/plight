/**
 * Yearn v2 Vault Yield Adapter - Schema v2.1.0
 * Protocol: yearn_v2
 * Primitive: yield
 * Chains: Ethereum (1)
 * Events: Deposit
 * 
 * FACTUAL OUTPUT ONLY - No forced exit detection
 */
import { YieldSignal, saturateCount, deriveHad } from '../../types';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';

export async function runYearnV2Adapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<YieldSignal> {
  if (chainId !== 1) {
    throw new Error(`Yearn v2 only supported on Ethereum mainnet`);
  }

  const registryAddress = getProtocolAddress('yearn_v2', 'yield', chainId, 'registry');
  logAddressResolution('yearn_v2', 'registry', registryAddress);

  const normalizedSubject = subject.toLowerCase();

  const depositTopic = '0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15';

  const rpcParams = [{
    topics: [depositTopic],
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
      const topic = log.topics[0];
      const recipient = '0x' + log.topics[1]?.slice(26);

      if (recipient?.toLowerCase() === normalizedSubject) {
        if (log.topics[0] === depositTopic) {
          depositCount++;
        }
      }
    } catch {
      continue;
    }
  }

  logEventFetch('yearn_v2', 'Deposit', logs.length, depositCount);

  depositCount = saturateCount(depositCount);

  logCountDerivation('yield', {
    deposit_count: depositCount,
  });

  return {
    had_deposit: deriveHad(depositCount),
    deposit_count: depositCount,
  };
}
