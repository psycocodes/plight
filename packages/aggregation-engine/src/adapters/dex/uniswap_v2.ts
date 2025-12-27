/**
 * Uniswap v2 Style DEX Adapter - Schema v2.1.0
 * Protocols: uniswap_v2 (Ethereum), quickswap (Polygon), pangolin (Avalanche)
 * Primitive: dex
 * Chains: Ethereum (1), Polygon (137), Avalanche (43114)
 * Events: Swap, Mint
 * 
 * FACTUAL OUTPUT ONLY - No slippage detection
 */
import { DexSignal, saturateCount, deriveHad } from '../../types';
import { getProtocolAddress } from '../../protocol_matrix';
import { logAddressResolution, logEventFetch, logCountDerivation, logRpcCall, logRpcResponse } from '../../logger';

// Uniswap v2 event topics (same for all v2-style AMMs)
const SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
const MINT_TOPIC = '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f';

export async function runUniswapV2Adapter(
  chainId: number,
  startBlock: number,
  endBlock: number,
  subject: string,
  rpcUrl: string
): Promise<DexSignal> {
  // Determine protocol based on chain
  let protocol: string;
  if (chainId === 1) {
    protocol = 'uniswap_v2';
  } else if (chainId === 137) {
    protocol = 'quickswap';
  } else if (chainId === 43114) {
    protocol = 'pangolin';
  } else {
    throw new Error(`Uniswap v2 style protocols not supported on chain ${chainId}`);
  }

  const factoryAddress = getProtocolAddress(protocol, 'dex', chainId, 'factory');
  logAddressResolution(protocol, 'factory', factoryAddress);

  const normalizedSubject = subject.toLowerCase();

  const rpcParams = [{
    topics: [[SWAP_TOPIC, MINT_TOPIC]],
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

  let swapCount = 0;
  let liquidityAddCount = 0;

  for (const log of logs) {
    try {
      const eventTopic = log.topics[0];
      
      if (eventTopic === SWAP_TOPIC) {
        const sender = '0x' + log.topics[1]?.slice(26);
        const to = '0x' + log.topics[2]?.slice(26);

        if (sender?.toLowerCase() === normalizedSubject || to?.toLowerCase() === normalizedSubject) {
          swapCount++;
        }
      } else if (eventTopic === MINT_TOPIC) {
        const sender = '0x' + log.topics[1]?.slice(26);
        if (sender?.toLowerCase() === normalizedSubject) {
          liquidityAddCount++;
        }
      }
    } catch {
      continue;
    }
  }

  logEventFetch(protocol, 'Swap/Mint', logs.length, swapCount + liquidityAddCount);

  swapCount = saturateCount(swapCount);
  liquidityAddCount = saturateCount(liquidityAddCount);

  logCountDerivation('dex', { swap_count: swapCount, liquidity_add_count: liquidityAddCount });

  return {
    had_swap: deriveHad(swapCount),
    swap_count: swapCount,
    liquidity_add_count: liquidityAddCount,
  };
}
