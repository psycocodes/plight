import { resolveWindow } from './window';
import { runAaveV3Adapter } from './adapters/lending/aave_v3';
import { runAaveV2Adapter } from './adapters/lending/aave_v2';
import { runCompoundV3Adapter } from './adapters/lending/compound_v3';
import { runCompoundV2Adapter } from './adapters/lending/compound_v2';
import { runUniswapV3Adapter } from './adapters/dex/uniswap_v3';
import { runUniswapV2Adapter } from './adapters/dex/uniswap_v2';
import { runAaveStakingAdapter } from './adapters/yield/aave_staking';
import { runYearnV2Adapter } from './adapters/yield/yearn_v2';
import { runLidoAdapter } from './adapters/yield/lido';
import { runAaveGovernanceAdapter } from './adapters/governance/aave_governance';
import { runCompoundGovernorAdapter } from './adapters/governance/compound_governor';
import { checkInvariants } from './invariants';
import { validateAndSerializeOutput } from './output';
import { AggregationOutput, Signals, LendingSignal, DexSignal, YieldSignal, GovernanceSignal, saturateCount, deriveHad } from './types';
import { getRpcUrl } from './chains';
import { getApplicableProtocols } from './protocol_matrix';
import { logChain, logProtocol } from './logger';

export async function aggregate(
  chains: number[],
  startBlock: number,
  endBlock: number,
  subject: string
): Promise<string> {
  // Sort chains in ascending order for determinism
  const sortedChains = [...chains].sort((a, b) => a - b);

  // Resolve window
  const window = resolveWindow(startBlock, endBlock);

  // Initialize counters for cross-chain aggregation
  let totalBorrowCount = 0;
  let totalLiquidationCount = 0;

  let totalSwapCount = 0;
  let totalLiquidityAddCount = 0;

  let totalDepositCount = 0;

  let totalVoteCount = 0;

  let allAdaptersSucceeded = true;

  // Process each chain
  for (const chainId of sortedChains) {
    logChain(chainId, 'start');

    try {
      const rpcUrl = getRpcUrl(chainId);

      // Process lending primitive
      const lendingProtocols = getApplicableProtocols('lending', chainId);
      for (const protocol of lendingProtocols) {
        logProtocol(chainId, protocol, 'lending', 'start');
        try {
          let lendingSignal: LendingSignal;
          
          if (protocol === 'aave_v3') {
            lendingSignal = await runAaveV3Adapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else if (protocol === 'aave_v2') {
            lendingSignal = await runAaveV2Adapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else if (protocol === 'compound_v3') {
            lendingSignal = await runCompoundV3Adapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else if (protocol === 'compound_v2') {
            lendingSignal = await runCompoundV2Adapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else {
            throw new Error(`Unknown lending protocol: ${protocol}`);
          }

          // Aggregate counts (with saturation)
          totalBorrowCount += lendingSignal.borrow_count;
          totalLiquidationCount += lendingSignal.liquidation_count;

          logProtocol(chainId, protocol, 'lending', 'complete');
        } catch (error) {
          allAdaptersSucceeded = false;
          throw error;
        }
      }

      // Process DEX primitive
      const dexProtocols = getApplicableProtocols('dex', chainId);
      for (const protocol of dexProtocols) {
        logProtocol(chainId, protocol, 'dex', 'start');
        try {
          let dexSignal: DexSignal;
          
          if (protocol === 'uniswap_v3') {
            dexSignal = await runUniswapV3Adapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else if (protocol === 'uniswap_v2' || protocol === 'quickswap' || protocol === 'pangolin') {
            dexSignal = await runUniswapV2Adapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else {
            throw new Error(`Unknown DEX protocol: ${protocol}`);
          }

          totalSwapCount += dexSignal.swap_count;
          totalLiquidityAddCount += dexSignal.liquidity_add_count;

          logProtocol(chainId, protocol, 'dex', 'complete');
        } catch (error) {
          allAdaptersSucceeded = false;
          throw error;
        }
      }

      // Process yield primitive
      const yieldProtocols = getApplicableProtocols('yield', chainId);
      for (const protocol of yieldProtocols) {
        logProtocol(chainId, protocol, 'yield', 'start');
        try {
          let yieldSignal: YieldSignal;
          
          if (protocol === 'aave_staking') {
            yieldSignal = await runAaveStakingAdapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else if (protocol === 'yearn_v2') {
            yieldSignal = await runYearnV2Adapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else if (protocol === 'lido') {
            yieldSignal = await runLidoAdapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else {
            throw new Error(`Unknown yield protocol: ${protocol}`);
          }

          totalDepositCount += yieldSignal.deposit_count;

          logProtocol(chainId, protocol, 'yield', 'complete');
        } catch (error) {
          allAdaptersSucceeded = false;
          throw error;
        }
      }

      // Process governance primitive
      const governanceProtocols = getApplicableProtocols('governance', chainId);
      for (const protocol of governanceProtocols) {
        logProtocol(chainId, protocol, 'governance', 'start');
        try {
          let governanceSignal: GovernanceSignal;
          
          if (protocol === 'aave_governance') {
            governanceSignal = await runAaveGovernanceAdapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else if (protocol === 'compound_governor') {
            governanceSignal = await runCompoundGovernorAdapter(chainId, window.start_block, window.end_block, subject, rpcUrl);
          } else {
            throw new Error(`Unknown governance protocol: ${protocol}`);
          }

          totalVoteCount += governanceSignal.vote_count;

          logProtocol(chainId, protocol, 'governance', 'complete');
        } catch (error) {
          allAdaptersSucceeded = false;
          throw error;
        }
      }

      logChain(chainId, 'complete');
    } catch (error) {
      allAdaptersSucceeded = false;
      throw error;
    }
  }

  // Saturate all counts at 255
  totalBorrowCount = saturateCount(totalBorrowCount);
  totalLiquidationCount = saturateCount(totalLiquidationCount);
  totalSwapCount = saturateCount(totalSwapCount);
  totalLiquidityAddCount = saturateCount(totalLiquidityAddCount);
  totalDepositCount = saturateCount(totalDepositCount);
  totalVoteCount = saturateCount(totalVoteCount);

  // Build final signals
  const signals: Signals = {
    lending: {
      had_borrow: deriveHad(totalBorrowCount),
      borrow_count: totalBorrowCount,
      
      had_liquidation: deriveHad(totalLiquidationCount),
      liquidation_count: totalLiquidationCount,
    },
    dex: {
      had_swap: deriveHad(totalSwapCount),
      swap_count: totalSwapCount,
      liquidity_add_count: totalLiquidityAddCount,
    },
    yield: {
      had_deposit: deriveHad(totalDepositCount),
      deposit_count: totalDepositCount,
    },
    governance: {
      had_vote: deriveHad(totalVoteCount),
      vote_count: totalVoteCount,
    },
  };

  const invariants = checkInvariants(allAdaptersSucceeded);

  const output: AggregationOutput = {
    schema_version: '2.1.0',
    metadata: {
      chain_id: sortedChains[0],
      observation_window: window,
      aggregation_block: endBlock + 1,
    },
    signals,
    invariants,
    commitment: {
      nullifier: '0xNULLIFIER',
      issued_at_block: endBlock + 1,
    },
  };

  return validateAndSerializeOutput(output);
}
