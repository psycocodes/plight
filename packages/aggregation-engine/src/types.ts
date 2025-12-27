// Internal TypeScript type definitions matching schema v2.1.0
// All signals are FACTUAL and POLICY-NEUTRAL

export interface BlockWindow {
  start_block: number;
  end_block: number;
}

// Lending signals: Borrow and Liquidation events only
export interface LendingSignal {
  had_borrow: boolean;
  borrow_count: number; // saturated at 255
  
  had_liquidation: boolean;
  liquidation_count: number; // saturated at 255
}

// DEX signals: Swap and Liquidity Add events
export interface DexSignal {
  had_swap: boolean;
  swap_count: number; // saturated at 255
  liquidity_add_count: number; // saturated at 255
}

// Yield signals: Deposit events only
export interface YieldSignal {
  had_deposit: boolean;
  deposit_count: number; // saturated at 255
}

// Governance signals: Vote events
export interface GovernanceSignal {
  had_vote: boolean;
  vote_count: number; // saturated at 255
}

export interface Signals {
  lending: LendingSignal;
  dex: DexSignal;
  yield: YieldSignal;
  governance: GovernanceSignal;
}

export interface Invariants {
  complete_chain_data: boolean;
  adapter_execution_successful: boolean;
}

export interface AggregationOutput {
  schema_version: string;
  metadata: {
    chain_id: number;
    observation_window: BlockWindow;
    aggregation_block: number;
  };
  signals: Signals;
  invariants: Invariants;
  commitment: {
    nullifier: string;
    issued_at_block: number;
  };
}

// Helper: Saturate count at 255
export function saturateCount(count: number): number {
  return Math.min(count, 255);
}

// Helper: Derive had_* from count
export function deriveHad(count: number): boolean {
  return count > 0;
}
