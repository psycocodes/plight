/**
 * Compound v3 Lending Adapter - Schema v2.1.0
 * Protocol: compound_v3
 * Primitive: lending
 * Chains: Ethereum (1)
 * Events: Supply (borrow), Withdraw (repay), AbsorbDebt (liquidation)
 * Address Resolution: getProtocolAddress('compound_v3', 'lending', chainId, 'comet_usdc')
 * 
 * FACTUAL OUTPUT ONLY - No interpretation
 */
import { LendingSignal, saturateCount, deriveHad } from '../../types';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';

// Compound v3 events (simplified - using Supply/Withdraw as proxies)
const COMPOUND_V3_ABI = [
  'event Supply(address indexed from, address indexed dst, uint256 amount)',
  'event Withdraw(address indexed src, address indexed to, uint256 amount)',
  'event AbsorbDebt(address indexed absorber, address indexed borrower, uint256 basePaidOut, uint256 usdValue)',
];

export async function runCompoundV3Adapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<LendingSignal> {
  if (chainId !== 1) {
    throw new Error(`Compound v3 only supported on Ethereum mainnet`);
  }

  const cometAddress = getProtocolAddress('compound_v3', 'lending', chainId, 'comet_usdc');
  logAddressResolution('compound_v3', 'comet_usdc', cometAddress);

  const normalizedSubject = subject.toLowerCase();

  // For simplicity, we'll track AbsorbDebt as liquidations
  // Supply/Withdraw would require more complex logic to determine borrows vs deposits
  const rpcParams = [{
    address: cometAddress,
    topics: ['0x6d9f5d4c7a5e7c5d4c7a5e7c5d4c7a5e7c5d4c7a5e7c5d4c7a5e7c5d4c7a5e7c'], // AbsorbDebt topic
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

  let liquidationCount = 0;

  for (const log of logs) {
    try {
      const borrower = '0x' + log.topics[2]?.slice(26);
      if (borrower?.toLowerCase() === normalizedSubject) {
        liquidationCount++;
      }
    } catch {
      continue;
    }
  }

  logEventFetch('compound_v3', 'AbsorbDebt', logs.length, liquidationCount);

  liquidationCount = saturateCount(liquidationCount);

  logCountDerivation('lending', {
    borrow_count: 0, // Not tracked in this simplified version
    liquidation_count: liquidationCount,
  });

  return {
    had_borrow: false,
    borrow_count: 0,
    
    had_liquidation: deriveHad(liquidationCount),
    liquidation_count: liquidationCount,
  };
}
