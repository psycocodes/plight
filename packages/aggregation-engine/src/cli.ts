import { aggregate } from './engine';
import { setVerbose } from './logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Usage: ts-node src/cli.ts <chainId> <startBlock> <endBlock> <walletAddress> [--verbose]');
    process.exit(1);
  }

  const chainId = parseInt(args[0], 10);
  const startBlock = parseInt(args[1], 10);
  const endBlock = parseInt(args[2], 10);
  const subject = args[3];
  const verbose = args.includes('--verbose');

  if (verbose) {
    setVerbose("all");
  }

  console.log(`Running aggregation for ${subject} on chain ${chainId} from block ${startBlock} to ${endBlock}...`);

  try {
    const result = await aggregate([chainId], startBlock, endBlock, subject);
    console.log('Aggregation Output:');
    console.log(result);
  } catch (error) {
    console.error('Error during aggregation:', error);
    process.exit(1);
  }
}

main();
