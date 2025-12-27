# Aggregator App

The Aggregator App simulates the Oracle node's aggregation logic. It connects to various DeFi protocols across supported chains, fetches user activity within a specified block window, and produces a deterministic signal (activity count) and a cryptographic commitment (if enabled).

This app uses the `@plight/aggregation-engine` package to perform the heavy lifting.

## Prerequisites

- Node.js (v18+)
- RPC Provider URLs for the chains you intend to query (e.g., Ethereum Mainnet).

## Installation

```bash
npm install
```

## Configuration

Ensure you have a `.env` file in the project root with your RPC credentials. The app resolves the `.env` file from the project root automatically.

**Required Environment Variables:**

- `ETH_RPC_URL`: Ethereum Mainnet RPC URL
- `OP_RPC_URL`: Optimism RPC URL
- `POLYGON_RPC_URL`: Polygon RPC URL
- `BASE_RPC_URL`: Base RPC URL
- `ARB_RPC_URL`: Arbitrum RPC URL
- `AVAX_RPC_URL`: Avalanche RPC URL

```bash
# Example .env content
ETH_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY"
OP_RPC_URL="https://opt-mainnet.g.alchemy.com/v2/YOUR-API-KEY"
# ... and so on
```

## Usage

You can run the aggregator using `npm start`.

**Syntax:**

```bash
npm start -- --chains <chainId> --start-block <block> --end-block <block> --subject <walletAddress> [--verbose]
```

### Options

- `--chains`: Comma-separated list of chain IDs (e.g., `1` or `1,10`).
- `--start-block`: The starting block number (inclusive).
- `--end-block`: The ending block number (inclusive).
- `--subject`: The wallet address to analyze.
- `--verbose`: Enable verbose logging to see progress.
- `--verbose-all`: Enable extra verbose logging (including RPC calls).

### Examples

Here are some test cases to verify the engine against specific protocols on Ethereum (Chain ID: 1).

#### Aave V3 (Ethereum)

**Liquidated Wallet:**
```bash
npm start -- --chains 1 --start-block 23876035 --end-block 24091035 --subject 0xd01607c3c5ecaba394d8be377a08590149325722 --verbose
```

**Not Liquidated Wallet:**
```bash
npm start -- --chains 1 --start-block 23876035 --end-block 24091035 --subject 0xe56047b942f6993e55e1e0addeb60ba1ad3b218a --verbose
```

#### Aave V2 (Ethereum)

**Liquidated Wallet:**
```bash
npm start -- --chains 1 --start-block 23874399 --end-block 24089399 --subject 0x22a93539e28418b7e481d6ad3b288570e349270c --verbose
```

**Not Liquidated Wallet:**
```bash
npm start -- --chains 1 --start-block 23874399 --end-block 24089399 --subject 0x560703ab2739c9b025b8e9cf82c59aff2b653854 --verbose
```

#### Compound V3 (Ethereum)

**Liquidated Wallet:**
```bash
npm start -- --chains 1 --start-block 23876159 --end-block 24091159 --subject 0xb9e62cb9b4ce8ec13c886fae67369da417ee2714 --verbose
```

#### Uniswap V3 (DEX) (Ethereum)

**Liquidated (or Active) Wallet:**
```bash
npm start -- --chains 1 --start-block 23875761 --end-block 24090761 --subject 0xa3ea6e5c2a9e64fe26ec835bcfb62231470c3005 --verbose
```

**Not Liquidated (or Inactive) Wallet:**
```bash
npm start -- --chains 1 --start-block 23875761 --end-block 24090761 --subject 0x2d4551046e470274dd0f0bc0da16dacfed13feae --verbose
```
