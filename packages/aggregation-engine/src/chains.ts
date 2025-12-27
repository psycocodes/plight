export interface ChainConfig {
  chainId: number;
  name: string;
  rpcEnvVar: string;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  { chainId: 1, name: 'ethereum', rpcEnvVar: 'ETH_RPC_URL' },
  { chainId: 10, name: 'optimism', rpcEnvVar: 'OP_RPC_URL' },
  { chainId: 137, name: 'polygon', rpcEnvVar: 'POLYGON_RPC_URL' },
  { chainId: 8453, name: 'base', rpcEnvVar: 'BASE_RPC_URL' },
  { chainId: 42161, name: 'arbitrum', rpcEnvVar: 'ARB_RPC_URL' },
  { chainId: 43114, name: 'avalanche', rpcEnvVar: 'AVAX_RPC_URL' },
];

export function getChainConfig(chainId: number): ChainConfig {
  const config = SUPPORTED_CHAINS.find(c => c.chainId === chainId);
  if (!config) {
    throw new Error(`Unsupported chain_id: ${chainId}`);
  }
  return config;
}

export function getRpcUrl(chainId: number): string {
  const config = getChainConfig(chainId);
  const rpcUrl = process.env[config.rpcEnvVar];
  if (!rpcUrl) {
    throw new Error(`${config.rpcEnvVar} environment variable is required for chain ${chainId}`);
  }
  return rpcUrl;
}
