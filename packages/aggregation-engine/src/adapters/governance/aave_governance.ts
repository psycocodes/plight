/**
 * Aave Governance Adapter - Schema v2.1.0
 * Protocol: aave_governance
 * Primitive: governance
 * Chains: Ethereum (1)
 * Events: VoteEmitted
 * 
 * FACTUAL OUTPUT ONLY - No participation interpretation
 */
import { GovernanceSignal, saturateCount, deriveHad } from '../../types';
import { ethers } from 'ethers';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';

const AAVE_GOVERNANCE_ABI = [
  'event VoteEmitted(uint256 indexed proposalId, address indexed voter, bool support, uint256 votingPower)',
];

export async function runAaveGovernanceAdapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<GovernanceSignal> {
  if (chainId !== 1) {
    throw new Error(`Aave governance only supported on Ethereum mainnet`);
  }

  const contractInterface = new ethers.Interface(AAVE_GOVERNANCE_ABI);
  const governanceAddress = getProtocolAddress('aave_governance', 'governance', chainId, 'governance_v2');
  logAddressResolution('aave_governance', 'governance_v2', governanceAddress);

  const normalizedSubject = subject.toLowerCase();

  const eventTopic = contractInterface.getEvent('VoteEmitted')!.topicHash;

  const rpcParams = [{
    address: governanceAddress,
    topics: [eventTopic],
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
      const parsed = contractInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (!parsed || !parsed.args) continue;

      const voter = parsed.args.voter?.toLowerCase();
      if (voter === normalizedSubject) {
        voteCount++;
      }
    } catch {
      continue;
    }
  }

  logEventFetch('aave_governance', 'VoteEmitted', logs.length, voteCount);

  voteCount = saturateCount(voteCount);

  logCountDerivation('governance', { vote_count: voteCount });

  return {
    had_vote: deriveHad(voteCount),
    vote_count: voteCount,
  };
}
