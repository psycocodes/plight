# Project Plan: Plight SaaS2

## Project Name
Plight SaaS2

## Goal
Let users prove they’ve been responsible on-chain (no recent liquidations) and get better terms in DeFi, without KYC.

## Chains & Protocols
- **Chains:** Ethereum, Polygon
- **Protocols:** Aave, Compound

## Core Flow
1. **Wallet Connection:** User connects wallet.
2. **Data Fetching:** System fetches on-chain lending history.
3. **Behavior Computation:** System computes behavior score (e.g., liquidation count).
4. **Attestation:** System signs an attestation of the behavior.
5. **ZK Proof:** User generates a Zero-Knowledge proof based on the attestation.
6. **Verification:** Proof is verified on-chain by the protocol.

## SaaS2 Layer
- **Dashboard:** Simple interface for users to check eligibility and generate proofs.
- **REST API:** API for protocols to integrate eligibility checks programmatically.
