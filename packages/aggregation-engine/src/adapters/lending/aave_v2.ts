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

  // Get event topics
  const borrowTopic = contractInterface.getEvent('Borrow')!.topicHash;
  const liquidationTopic = contractInterface.getEvent('LiquidationCall')!.topicHash;

  // Use chunking to avoid RPC limits
  const logs = await fetchLogsWithChunking(
    rpcUrl,
    lendingPoolAddress,
    [[borrowTopic, liquidationTopic]],
    startBlock,
    endBlock,
    1000 // Safe chunk size for public RPCs
  );

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

      const blockNumber = parseInt(log.blockNumber, 16);
      const eventName = parsed.name;

      // Check if event involves subject
      let matchesSubject = false;

      if (eventName === 'Borrow') {
        const user = parsed.args.user?.toLowerCase();
        const onBehalfOf = parsed.args.onBehalfOf?.toLowerCase();
        matchesSubject = user === normalizedSubject || onBehalfOf === normalizedSubject;
        
        if (matchesSubject) {
          borrowCount++;
        }
      } else if (eventName === 'LiquidationCall') {
        const user = parsed.args.user?.toLowerCase();
        matchesSubject = user === normalizedSubject;
        
        if (matchesSubject) {
          liquidationCount++;
        }
      }
    } catch {
      // Skip unparseable logs
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
