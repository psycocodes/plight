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
  const factoryAddress = getProtocolAddress('uniswap_v3', 'dex', chainId, 'factory');
  logAddressResolution('uniswap_v3', 'factory', factoryAddress);

  const normalizedSubject = subject.toLowerCase();
  const swapTopic = contractInterface.getEvent('Swap')!.topicHash;
  const mintTopic = contractInterface.getEvent('Mint')!.topicHash;

  const rpcParams = [{
    topics: [[swapTopic, mintTopic]],
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
      const parsed = contractInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (!parsed || !parsed.args) continue;

      const eventName = parsed.name;

      if (eventName === 'Swap') {
        const sender = parsed.args.sender?.toLowerCase();
        const recipient = parsed.args.recipient?.toLowerCase();

        if (sender === normalizedSubject || recipient === normalizedSubject) {
          swapCount++;
        }
      } else if (eventName === 'Mint') {
        const owner = parsed.args.owner?.toLowerCase();
        if (owner === normalizedSubject) {
          liquidityAddCount++;
        }
      }
    } catch {
      continue;
    }
  }

  logEventFetch('uniswap_v3', 'Swap/Mint', logs.length, swapCount + liquidityAddCount);

  swapCount = saturateCount(swapCount);
  liquidityAddCount = saturateCount(liquidityAddCount);

  logCountDerivation('dex', { swap_count: swapCount, liquidity_add_count: liquidityAddCount });

  return {
    had_swap: deriveHad(swapCount),
    swap_count: swapCount,
    liquidity_add_count: liquidityAddCount,
  };
}
