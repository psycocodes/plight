/**
 * Compound v2 Lending Adapter - Schema v2.1.0
 * Protocol: compound_v2
 * Primitive: lending
 * Chains: Ethereum (1)
 * Events: LiquidateBorrow (from cToken contracts)
 * Address Resolution: getProtocolAddress('compound_v2', 'lending', chainId, 'comptroller')
 * 
 * FACTUAL OUTPUT ONLY - Tracks liquidations only (borrow/repay require more complex logic)
 */
import { LendingSignal, saturateCount, deriveHad } from '../../types';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';

// Compound v2 cToken LiquidateBorrow event
// Note: This event is emitted by individual cToken contracts, not the Comptroller
const LIQUIDATE_BORROW_TOPIC = '0x298637f684da70674f26509b10f07ec2fbc77a335ab1e7d6215a4b2484d8bb52';

export async function runCompoundV2Adapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<LendingSignal> {
  if (chainId !== 1) {
    throw new Error(`Compound v2 only supported on Ethereum mainnet`);
  }

  const comptrollerAddress = getProtocolAddress('compound_v2', 'lending', chainId, 'comptroller');
  logAddressResolution('compound_v2', 'comptroller', comptrollerAddress);

  const normalizedSubject = subject.toLowerCase();

  // Query LiquidateBorrow events from all cToken contracts
  const rpcParams = [{
    topics: [LIQUIDATE_BORROW_TOPIC],
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

  // LiquidateBorrow event: indexed borrower is in topics[2]
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

  logEventFetch('compound_v2', 'LiquidateBorrow', logs.length, liquidationCount);

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
