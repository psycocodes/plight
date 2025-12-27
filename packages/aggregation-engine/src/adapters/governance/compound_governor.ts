/**
 * Compound Governor Governance Adapter - Schema v2.1.0
 * Protocol: compound_governor
 * Primitive: governance
 * Chains: Ethereum (1)
 * Events: VoteCast
 * 
 * FACTUAL OUTPUT ONLY - No participation interpretation
 */
import { GovernanceSignal, saturateCount, deriveHad } from '../../types';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';

export async function runCompoundGovernorAdapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<GovernanceSignal> {
  if (chainId !== 1) {
    throw new Error(`Compound Governor only supported on Ethereum mainnet`);
  }

  const governorAddress = getProtocolAddress('compound_governor', 'governance', chainId, 'governor_bravo');
  logAddressResolution('compound_governor', 'governor_bravo', governorAddress);

  const normalizedSubject = subject.toLowerCase();

  const voteCastTopic = '0xb8e138887d0aa13bab447e82de9d5c1777041ecd21ca36ba824ff1e6c07ddda4';

  const rpcParams = [{
    address: governorAddress,
    topics: [voteCastTopic],
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

  let voteCount = 0;

  for (const log of logs) {
    try {
      const voter = '0x' + log.topics[1]?.slice(26);
      if (voter?.toLowerCase() === normalizedSubject) {
        voteCount++;
      }
    } catch {
      continue;
    }
  }

  logEventFetch('compound_governor', 'VoteCast', logs.length, voteCount);

  voteCount = saturateCount(voteCount);

  logCountDerivation('governance', { vote_count: voteCount });

  return {
    had_vote: deriveHad(voteCount),
    vote_count: voteCount,
  };
}
