import { Invariants } from './types';

export function checkInvariants(adapterSuccess: boolean): Invariants {
  return {
    complete_chain_data: adapterSuccess,
    adapter_execution_successful: adapterSuccess,
  };
}
