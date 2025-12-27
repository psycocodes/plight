import { BlockWindow } from './types';

export function resolveWindow(startBlock: number, endBlock: number): BlockWindow {
  if (startBlock >= endBlock) {
    throw new Error(`Invalid block window: start_block (${startBlock}) must be less than end_block (${endBlock})`);
  }
  if (startBlock < 0 || endBlock < 0) {
    throw new Error('Block numbers must be non-negative');
  }

  return {
    start_block: startBlock,
    end_block: endBlock,
  };
}
