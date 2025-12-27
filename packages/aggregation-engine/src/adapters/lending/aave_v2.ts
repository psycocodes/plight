/**
 * Aave v2 Lending Adapter - Schema v2.1.0
 * Protocol: aave_v2
 * Primitive: lending
 * Chains: Ethereum (1)
 * Events: Borrow, LiquidationCall
 * Address Resolution: getProtocolAddress('aave_v2', 'lending', chainId, 'lending_pool')
 * 
 * FACTUAL OUTPUT ONLY - No interpretation, no policy
 */
import { LendingSignal, saturateCount, deriveHad } from '../../types';
import { ethers } from 'ethers';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';
import { fetchLogsWithChunking } from '../../utils/eth_client';

// Aave v2 LendingPool ABI for lending events
const AAVE_V2_LENDING_POOL_ABI = [
  'event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint256 borrowRateMode, uint256 borrowRate, uint16 indexed referral)',
  'event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount)',
  'event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)',
];

export async function runAaveV2Adapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<LendingSignal> {
  // Validate chain ID
  if (chainId !== 1) {
    throw new Error(`Aave v2 only supported on Ethereum mainnet`);
  }

  const contractInterface = new ethers.Interface(AAVE_V2_LENDING_POOL_ABI);

  // Resolve LendingPool address from protocol matrix
  const lendingPoolAddress = getProtocolAddress('aave_v2', 'lending', chainId, 'lending_pool');
  logAddressResolution('aave_v2', 'lending_pool', lendingPoolAddress);

  // Normalize subject address to lowercase for comparison
  const normalizedSubject = subject.toLowerCase();
  const paddedSubject = ethers.zeroPadValue(subject, 32);

  // Get event topics
  const borrowTopic = contractInterface.getEvent('Borrow')!.topicHash;
  const liquidationTopic = contractInterface.getEvent('LiquidationCall')!.topicHash;

  // OPTIMIZATION: Filter by topic directly to avoid fetching all protocol logs
  // 1. Borrow: topic2 is onBehalfOf (indexed)
  // 2. LiquidationCall: topic3 is user (indexed)

  const borrowPromise = fetchLogsWithChunking(
    rpcUrl,
    lendingPoolAddress,
    [borrowTopic, null, paddedSubject],
    startBlock,
    endBlock,
    2000
  );

  const liquidationPromise = fetchLogsWithChunking(
    rpcUrl,
    lendingPoolAddress,
    [liquidationTopic, null, null, paddedSubject],
    startBlock,
    endBlock,
    2000
  );

  const [borrowLogs, liquidationLogs] = await Promise.all([borrowPromise, liquidationPromise]);
  const logs = [...borrowLogs, ...liquidationLogs];

  // Parse and categorize events
  let borrowCount = 0;
  let liquidationCount = 0;

  for (const log of logs) {
    try {
      const parsed = contractInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (!parsed || !parsed.args) continue;

      const eventName = parsed.name;

      // Double check if event involves subject (paranoia check)
      if (eventName === 'Borrow') {
        const onBehalfOf = parsed.args.onBehalfOf?.toLowerCase();
        if (onBehalfOf === normalizedSubject) {
          borrowCount++;
        }
      } else if (eventName === 'LiquidationCall') {
        const user = parsed.args.user?.toLowerCase();
        if (user === normalizedSubject) {
          liquidationCount++;
        }
      }
    } catch {
      continue;
    }
  }

  // Log event fetch results
  logEventFetch('aave_v2', 'Borrow/LiquidationCall', logs.length, borrowCount + liquidationCount);

  // Saturate counts at 255
  borrowCount = saturateCount(borrowCount);
  liquidationCount = saturateCount(liquidationCount);

  // Log derived counts
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
