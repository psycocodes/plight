import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { aggregate, setVerbose } from 'aggregation-engine';

function parseArgs(): {
  chains: number[];
  startBlock: number;
  endBlock: number;
  subject: string;
  verbose: 'none' | 'default' | 'all';
} {
  const args = process.argv.slice(2);
  let chains: number[] = [];
  let startBlock: number | undefined;
  let endBlock: number | undefined;
  let subject: string | undefined;
  let verbose: 'none' | 'default' | 'all' = 'none';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--chain' && args[i + 1]) {
      chains = [parseInt(args[i + 1])];
      i++;
    } else if (args[i] === '--chains' && args[i + 1]) {
      chains = args[i + 1].split(',').map(c => parseInt(c.trim()));
      i++;
    } else if (args[i] === '--start-block' && args[i + 1]) {
      startBlock = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--end-block' && args[i + 1]) {
      endBlock = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--subject' && args[i + 1]) {
      subject = args[i + 1];
      i++;
    } else if (args[i] === '--verbose-all') {
      verbose = 'all';
    } else if (args[i] === '--verbose') {
      verbose = 'default';
    }
  }

  if (chains.length === 0 || !startBlock || !endBlock || !subject) {
    console.error('Usage: node index.js --chains <chain_ids> --start-block <number> --end-block <number> --subject <address> [--verbose | --verbose-all]');
    console.error('Example: node index.js --chains 1,42161,10 --start-block 18900000 --end-block 19000000 --subject 0x... --verbose');
    console.error('  --verbose: Show progress and key events');
    console.error('  --verbose-all: Show everything including raw RPC calls');
    process.exit(1);
  }

  return { chains, startBlock, endBlock, subject, verbose };
}



async function main() {
  const { chains, startBlock, endBlock, subject, verbose } = parseArgs();
  
  // Set engine verbosity
  setVerbose(verbose);

  if (verbose !== 'none') {
    console.log('Starting Aggregation...');
  }

  try {
    const output = await aggregate(chains, startBlock, endBlock, subject);
    console.log('\n--- Output ---');
    console.log(output);
  } catch (error) {
    console.error('Aggregation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
