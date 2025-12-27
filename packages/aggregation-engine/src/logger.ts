import chalk from 'chalk';

let verboseLevel: 'none' | 'default' | 'all' = 'none';

export function setVerbose(level: 'none' | 'default' | 'all'): void {
  verboseLevel = level;
}

export function isVerbose(): boolean {
  return verboseLevel !== 'none';
}

export function isVerboseAll(): boolean {
  return verboseLevel === 'all';
}

// Log Listener Support
export type LogListener = (message: string) => void;
const listeners: LogListener[] = [];

export function addLogListener(listener: LogListener): void {
  listeners.push(listener);
}

// Base logging function
function log(message: string): void {
  if (verboseLevel !== 'none') {
    // If listeners exist, send to them instead of console (or both, depending on design)
    // For TUI, we want to capture them.
    if (listeners.length > 0) {
      listeners.forEach(l => l(message));
    } else {
      console.log(message);
    }
  }
}

// Styled logging functions
export function logInfo(message: string): void {
  log(chalk.blue('ℹ') + ' ' + chalk.gray(message));
}

export function logSuccess(message: string): void {
  log(chalk.green('✓') + ' ' + message);
}

export function logWarning(message: string): void {
  log(chalk.yellow('⚠') + ' ' + chalk.yellow(message));
}

export function logError(message: string): void {
  log(chalk.red('✗') + ' ' + chalk.red(message));
}

export function logHeader(message: string): void {
  log('\n' + chalk.bold.cyan('━'.repeat(60)));
  log(chalk.bold.cyan(message));
  log(chalk.bold.cyan('━'.repeat(60)));
}

export function logSubheader(message: string): void {
  log(chalk.bold.white(message));
}

// Chain-level logging
export function logChain(chainId: number, action: string): void {
  if (action === 'start') {
    logHeader(`Chain ${chainId} - Starting`);
  } else if (action === 'complete') {
    logSuccess(chalk.bold(`Chain ${chainId} - Complete`));
  }
}

// Protocol-level logging
export function logProtocol(
  chainId: number,
  protocol: string,
  primitive: string,
  action: string,
  data?: Record<string, number>
): void {
  const prefix = `[chain=${chainId}][${chalk.magenta(protocol)}][${chalk.cyan(primitive)}]`;
  
  if (action === 'start') {
    logSubheader(`\n${prefix} Starting...`);
  } else if (action === 'complete') {
    logSuccess(`${prefix} Complete`);
  } else {
    let msg = `${prefix} ${action}`;
    if (data) {
      const dataStr = Object.entries(data)
        .map(([k, v]) => `${chalk.yellow(k)}=${chalk.white(v)}`)
        .join(' ');
      msg += ` ${dataStr}`;
    }
    logInfo(msg);
  }
}

// Event logging (counts only, no subject data)
export function logEventFetch(
  protocol: string,
  eventName: string,
  totalFetched: number,
  matchedCount: number
): void {
  const msg = `${chalk.magenta(protocol)} - ${chalk.cyan(eventName)} events: ` +
    `${chalk.white(totalFetched)} fetched, ${chalk.green(matchedCount)} matched`;
  logInfo(msg);
}

// Count derivation logging (no identity)
export function logCountDerivation(
  primitive: string,
  counts: Record<string, number>
): void {
  const msg = `${chalk.bold('Counts derived')} (${chalk.cyan(primitive)}): ` +
    JSON.stringify(counts, null, 2);
  log(chalk.gray(msg));
}

// Address resolution logging
export function logAddressResolution(
  protocol: string,
  contractName: string,
  address: string
): void {
  const msg = `${chalk.magenta(protocol)}.${chalk.cyan(contractName)} → ${chalk.white(address)}`;
  logInfo(msg);
}

// RPC call logging (only in verbose-all mode)
export function logRpcCall(
  method: string,
  params: any
): void {
  if (verboseLevel !== 'all') return;
  
  const msg = chalk.bold.yellow('RPC Call:') + '\n' +
    chalk.gray('  Method: ') + chalk.white(method) + '\n' +
    chalk.gray('  Params: ') + JSON.stringify(params, null, 2);
  log(msg);
}

// RPC response logging (only in verbose-all mode)
export function logRpcResponse(
  method: string,
  response: any,
  truncate: boolean = true
): void {
  if (verboseLevel !== 'all') return;
  
  let responseStr = JSON.stringify(response, null, 2);
  if (truncate && responseStr.length > 500) {
    responseStr = responseStr.substring(0, 500) + '\n  ... (truncated)';
  }
  
  const msg = chalk.bold.yellow('RPC Response:') + '\n' +
    chalk.gray('  Method: ') + chalk.white(method) + '\n' +
    chalk.gray('  Data: ') + responseStr;
  log(msg);
}
