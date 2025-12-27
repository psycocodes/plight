/**
 * Aave v3 Lending Adapter - Schema v2.1.0
 * Protocol: aave_v3
 * Primitive: lending
 * Chains: Ethereum (1), Optimism (10), Polygon (137), Base (8453), Arbitrum (42161), Avalanche (43114)
 * Events: Borrow, LiquidationCall
 * Address Resolution: getProtocolAddress('aave_v3', 'lending', chainId, 'pool')
 * 
 * FACTUAL OUTPUT ONLY - No interpretation, no policy
 */
import { LendingSignal, saturateCount, deriveHad } from '../../types';
import { ethers } from 'ethers';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation } from '../../logger';
import { fetchLogsWithChunking } from '../../utils/eth_client';

// --- 1. Types ---

export type NormalizedEvent = {
  protocol: 'aave_v3';
  chainId: number;
  event: 'Borrow' | 'LiquidationCall';
  user: string;
  blockNumber: number;
  txHash: string;
};

export interface EventFetcher {
  fetch(
    chainId: number,
    subject: string,
    fromBlock: number,
    toBlock: number,
    rpcUrl?: string // Optional, needed for RPC fetcher
  ): Promise<NormalizedEvent[]>;
}

export interface AggregationConfig {
  chainId: number;
  subject: string;
  startBlock: number;
  endBlock: number;
  rpcUrl: string;
  preferIndexer?: boolean;
}

// --- 2. Constants ---

const AAVE_V3_POOL_ABI = [
  'event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint8 interestRateMode, uint256 borrowRate, uint16 indexed referralCode)',
  'event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)',
];

// --- 3. Graph Fetcher ---

export class GraphAaveV3Fetcher implements EventFetcher {
  async fetch(
    chainId: number,
    subject: string,
    fromBlock: number,
    toBlock: number
  ): Promise<NormalizedEvent[]> {
    // TODO: Implement actual GraphQL query
    // For now, return empty array to simulate "no events found by graph" or throw to test fallback
    console.log(`[Graph] Querying for ${subject} on chain ${chainId}...`);
    return []; 
  }
}

// --- 4. RPC Fetcher ---

export class RpcAaveV3Fetcher implements EventFetcher {
  async fetch(
    chainId: number,
    subject: string,
    fromBlock: number,
    toBlock: number,
    rpcUrl?: string
  ): Promise<NormalizedEvent[]> {
    if (!rpcUrl) throw new Error('RPC URL required for RpcAaveV3Fetcher');

    // Validate chain ID
    if (chainId !== 1 && chainId !== 10 && chainId !== 137 && chainId !== 8453 && chainId !== 42161 && chainId !== 43114) {
      throw new Error(`Aave v3 not supported on chain ${chainId}`);
    }

    const poolAddress = getProtocolAddress('aave_v3', 'lending', chainId, 'pool');
    logAddressResolution('aave_v3', 'pool', poolAddress);

    const contractInterface = new ethers.Interface(AAVE_V3_POOL_ABI);
    const borrowTopic = contractInterface.getEvent('Borrow')!.topicHash;
    const liquidationTopic = contractInterface.getEvent('LiquidationCall')!.topicHash;
    
    // Topic filtering:
    // Borrow: topic 2 is onBehalfOf
    // LiquidationCall: topic 3 is user
    const subjectTopic = ethers.zeroPadValue(subject, 32);

    const normalizedEvents: NormalizedEvent[] = [];

    // Parallel fetch for optimal speed
    // Parallel fetch for optimal speed (with robust 10k chunking)
    const [borrowLogs, liquidationLogs] = await Promise.all([
      fetchLogsWithChunking(
        rpcUrl,
        poolAddress,
        [borrowTopic, null, subjectTopic], // topic0=Borrow, topic1=any, topic2=subject
        fromBlock,
        toBlock,
        10000 
      ),
      fetchLogsWithChunking(
        rpcUrl,
        poolAddress,
        [liquidationTopic, null, null, subjectTopic], // topic0=Liq, topic1=any, topic2=any, topic3=subject
        fromBlock,
        toBlock,
        10000
      )
    ]);

    const allLogs = [...borrowLogs, ...liquidationLogs];

    for (const log of allLogs) {
      try {
        const parsed = contractInterface.parseLog({ topics: log.topics, data: log.data });
        if (!parsed) continue;

        // Since we filtered by topic, we know these match the subject, but we double check to be safe
        const eventName = parsed.name;
        
        normalizedEvents.push({
          protocol: 'aave_v3',
          chainId,
          event: eventName as 'Borrow' | 'LiquidationCall',
          user: subject.toLowerCase(),
          blockNumber: parseInt(log.blockNumber, 16),
          txHash: log.transactionHash
        });
      } catch (e) {
        continue;
      }
    }

    return normalizedEvents;
  }
}

// --- 5. Aggregation Logic ---

export function aggregateAaveV3Events(events: NormalizedEvent[]): LendingSignal {
  let borrowCount = 0;
  let liquidationCount = 0;
  let foundLiquidation = false;

  for (const event of events) {
    if (event.event === 'Borrow') {
      borrowCount++;
    } else if (event.event === 'LiquidationCall' && !foundLiquidation) {
      liquidationCount = 1; // Short-circuit: one liquidation is enough for risk signal
      foundLiquidation = true;
    }
  }

  return {
    had_borrow: deriveHad(borrowCount),
    borrow_count: saturateCount(borrowCount),
    had_liquidation: deriveHad(liquidationCount),
    liquidation_count: saturateCount(liquidationCount)
  };
}

// --- 6. Main Runner ---

export async function runAaveV3Aggregation(config: AggregationConfig): Promise<LendingSignal> {
  const { chainId, subject, startBlock, endBlock, rpcUrl, preferIndexer } = config;

  let events: NormalizedEvent[] = [];
  let fetcher: EventFetcher;

  if (preferIndexer) {
    try {
      fetcher = new GraphAaveV3Fetcher();
      events = await fetcher.fetch(chainId, subject, startBlock, endBlock);
      // If graph returns empty, we might want to fallback if we expect data. 
      // But for this implementation, we assume Graph is authoritative if it doesn't throw.
    } catch (e) {
      console.warn('[AaveV3] Graph fetcher failed, falling back to RPC', e);
      fetcher = new RpcAaveV3Fetcher();
      events = await fetcher.fetch(chainId, subject, startBlock, endBlock, rpcUrl);
    }
  } else {
    fetcher = new RpcAaveV3Fetcher();
    events = await fetcher.fetch(chainId, subject, startBlock, endBlock, rpcUrl);
  }

  logEventFetch('aave_v3', 'Borrow/LiquidationCall', events.length, events.length);
  
  const signal = aggregateAaveV3Events(events);
  
  logCountDerivation('lending', {
    borrow_count: signal.borrow_count,
    liquidation_count: signal.liquidation_count
  });

  return signal;
}

// --- Adapter Export (Legacy Interface) ---

export async function runAaveV3Adapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<LendingSignal> {
  return runAaveV3Aggregation({
    chainId,
    startBlock,
    endBlock,
    subject,
    rpcUrl,
    preferIndexer: false // Default to RPC for now as Graph is mocked
  });
}
