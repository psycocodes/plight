# Research: Aggregator Engine Design with Kiro

## Overview
This document details the design of the backend aggregator engine, facilitated by Kiro.

## Architecture

### Lambda Functions
- **Design:** Serverless architecture using AWS Lambda or similar.
- **Benefit:** Scalability and cost-efficiency. Functions run only when a check is requested.

### Data Structure
- **Input:** User Address, Chain ID, Protocol ID.
- **Output:**
  - `liquidationCount`: Number of liquidations in the specified window.
  - `lastLiquidationTimestamp`: Timestamp of the last event.
  - `attestation`: Signed message containing the above metrics.

### Optimizations
- **Caching:** Cache results for a short period to prevent spamming RPC nodes/subgraphs.
- **Parallel Fetching:** Fetch data from multiple protocols/chains in parallel to reduce latency.

### Handling Multiple Chains/Protocols
- **Adapter Pattern:** Use an adapter interface for each protocol (AaveAdapter, CompoundAdapter).
- **Configuration:** Centralized configuration for contract addresses and subgraph endpoints per chain.
