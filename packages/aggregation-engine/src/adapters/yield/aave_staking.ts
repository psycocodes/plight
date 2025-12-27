/**
 * Aave Staking Yield Adapter - Schema v2.1.0
 * Protocol: aave_staking
 * Primitive: yield
 * Chains: Ethereum (1)
 * Events: Staked (deposit)
 * 
 * FACTUAL OUTPUT ONLY - No forced exit detection, no penalty interpretation
 */
import { YieldSignal, saturateCount, deriveHad } from '../../types';
import { ethers } from 'ethers';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';

const AAVE_STAKING_ABI = [
  'event Staked(address indexed from, address indexed onBehalfOf, uint256 amount)',
  'event Redeem(address indexed from, address indexed to, uint256 amount)',
];

export async function runAaveStakingAdapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<YieldSignal> {
  if (chainId !== 1) {
    throw new Error(`Aave staking only supported on Ethereum mainnet`);
  }

  const contractInterface = new ethers.Interface(AAVE_STAKING_ABI);
  const stkAaveAddress = getProtocolAddress('aave_staking', 'yield', chainId, 'stkaave');
  logAddressResolution('aave_staking', 'stkaave', stkAaveAddress);

  const normalizedSubject = subject.toLowerCase();

  const stakedTopic = contractInterface.getEvent('Staked')!.topicHash;

  const rpcParams = [{
    address: stkAaveAddress,
    topics: [stakedTopic],
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
      const parsed = contractInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (!parsed || !parsed.args) continue;

      const blockNumber = parseInt(log.blockNumber, 16);

      if (parsed.name === 'Staked') {
        const from = parsed.args.from?.toLowerCase();
        const onBehalfOf = parsed.args.onBehalfOf?.toLowerCase();
        if (from === normalizedSubject || onBehalfOf === normalizedSubject) {
          depositCount++;
        }
      }
    } catch {
      continue;
    }
  }

  logEventFetch('aave_staking', 'Staked', logs.length, depositCount);

  depositCount = saturateCount(depositCount);

  logCountDerivation('yield', {
    deposit_count: depositCount,
  });

  return {
    had_deposit: deriveHad(depositCount),
    deposit_count: depositCount,
  };
}
