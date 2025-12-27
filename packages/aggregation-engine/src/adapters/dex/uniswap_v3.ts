/**
 * Uniswap v3 DEX Adapter - Schema v2.1.0
 * Protocol: uniswap_v3
 * Primitive: dex
 * Chains: Ethereum (1), Optimism (10), Arbitrum (42161)
 * Events: Swap, Mint
 * 
 * FACTUAL OUTPUT ONLY - No slippage detection, no price interpretation
 */
import { DexSignal, saturateCount, deriveHad } from '../../types';
import { ethers } from 'ethers';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';
import { fetchLogsWithChunking } from '../../utils/eth_client';

const UNISWAP_V3_SWAP_ABI = [
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
  'event Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)',
];

export async function runUniswapV3Adapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<DexSignal> {
  if (chainId !== 1 && chainId !== 10 && chainId !== 42161) {
    throw new Error(`Uniswap v3 not supported on chain ${chainId}`);
  }

  const contractInterface = new ethers.Interface(UNISWAP_V3_SWAP_ABI);
  // Note: Factory address is used to resolve, but events happen on Pools (which are dynamic).
  // However, we can't filter by address easily for ALL pools.
  // We MUST rely on topic filtering globally (without address param) or tracked pools.
  // Given we are simulating an "Indexer" via RPC, global topic scan is the only way 
  // without a subgraph. But global topic scan is expensive on some RPCs.
  // The only constrained way is to filter by TOPIC which matches the USER.
  
  const normalizedSubject = subject.toLowerCase();
  const paddedSubject = ethers.zeroPadValue(subject, 32);

  const swapTopic = contractInterface.getEvent('Swap')!.topicHash;
  const mintTopic = contractInterface.getEvent('Mint')!.topicHash;



  // Request 1: Swap (where sender = subject) - indexed param 1 (topic 1)
  // Swap(sender, recipient, ...)
  const swapSenderPromise = fetchLogsWithChunking(
      rpcUrl,
      undefined, // No address (Global scan!) - Check if eth_client handles undefined address correctly (it does, json stringify drops undefined or we pass null?) -> need to check logic
      [swapTopic, paddedSubject], 
      startBlock,
      endBlock,
      2000
  );

  // Request 2: Swap (where recipient = subject) - indexed param 2 (topic 2)
  const swapRecipientPromise = fetchLogsWithChunking(
      rpcUrl,
      undefined,
      [swapTopic, null, paddedSubject], 
      startBlock,
      endBlock,
      2000
  );

  // Request 3: Mint (where owner = subject) - indexed param 2 (topic 2) - Wait, Mint(sender, owner, ...)
  // sender is topic 1?? No, ABI: Mint(address sender, address indexed owner, ...)
  // sender is unindexed (data). owner is indexed (topic 1).
  // So: [mintTopic, paddedSubject]
  const mintPromise = fetchLogsWithChunking(
      rpcUrl,
      undefined,
      [mintTopic, paddedSubject], 
      startBlock,
      endBlock,
      2000
  );

  const [swapSenderLogs, swapRecipientLogs, mintLogs] = await Promise.all([
      swapSenderPromise, swapRecipientPromise, mintPromise
  ]);

  const swapCount = saturateCount(swapSenderLogs.length + swapRecipientLogs.length);
  const liquidityAddCount = saturateCount(mintLogs.length);

  logEventFetch('uniswap_v3', 'Swap/Mint', swapSenderLogs.length + swapRecipientLogs.length + mintLogs.length, swapCount + liquidityAddCount);

  logCountDerivation('dex', { swap_count: swapCount, liquidity_add_count: liquidityAddCount });

  return {
    had_swap: deriveHad(swapCount),
    swap_count: swapCount,
    liquidity_add_count: liquidityAddCount,
  };
}
