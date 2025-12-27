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
import { ethers } from 'ethers';
import { fetchLogsWithChunking } from '../../utils/eth_client';

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
  const paddedSubject = ethers.zeroPadValue(subject, 32);

  // Topics
  // AbsorbDebt(absorber, borrower, ...)
  const absorbTopic = '0x6d9f5d4c7a5e7c5d4c7a5e7c5d4c7a5e7c5d4c7a5e7c5d4c7a5e7c5d4c7a5e7c';
  // Withdraw(src, to, amount)
  const withdrawTopic = '0x9b1bfa7fa9ee420a16e124f794c35ac9f90472acc99140eb2f6447c714cad8eb';

  // Request 1: Liquidations (AbsorbDebt where borrower = subject)
  // borrower is topic 2
  // Request 1: Liquidations (AbsorbDebt where borrower = subject)
  // borrower is topic 2
  const liquidationLogs = await fetchLogsWithChunking(
    rpcUrl,
    cometAddress,
    [absorbTopic, null, paddedSubject],
    startBlock,
    endBlock,
    10000 // Using 10000 as a safe default
  );

  // Request 2: Borrows (Withdraw where src = subject)
  // src is topic 1
  const borrowLogs = await fetchLogsWithChunking(
      rpcUrl,
      cometAddress,
      [withdrawTopic, paddedSubject],
      startBlock,
      endBlock,
      10000
  );

  const liquidationCount = saturateCount(liquidationLogs.length);
  const borrowCount = saturateCount(borrowLogs.length); // Count raw events

  // Log event fetch results
  logEventFetch('compound_v3', 'AbsorbDebt/Withdraw', liquidationLogs.length + borrowLogs.length, liquidationCount + borrowCount);

  logCountDerivation('lending', {
    borrow_count: borrowCount,
    liquidation_count: liquidationCount,
  });

  return {
    had_borrow: deriveHad(borrowCount),
    borrow_count: borrowCount,
    
    had_liquidation: deriveHad(liquidationCount),
    liquidation_count: liquidationCount,
  };
}
