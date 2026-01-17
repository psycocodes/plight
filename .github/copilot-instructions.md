# Copilot Instructions for Plight

This repository is a turborepo-based monorepo for "Plight", a privacy-preserving DeFi eligibility architecture using Zero-Knowledge Proofs (Commit-and-Prove).

## Project Architecture & Data Flow

Understanding the flow is critical for cross-component changes:

1.  **Aggregator** (`apps/aggregator`):
    *   Fetches user history from on-chain sources (GraphQL/RPC).
    *   Computes metrics (e.g., liquidation count) off-chain.
2.  **Notary** (`apps/notary`):
    *   Acts as a trusted oracle.
    *   Receives data from Aggregator.
    *   Signs a "blinded" commitment (EdDSA on Poseidon hash) attesting to the user's data without storing PII.
3.  **Client/Web** (`apps/web`):
    *   User connects wallet (Wagmi/Ethers).
    *   Fetches attestation from Notary via `@plight/sdk`.
    *   **Generates ZK Proof client-side** (browser) using `snarkjs`.
    *   Inputs: Private signals (secrets), Public signals (Notary signature, claims).
4.  **Verification** (`packages/contracts`):
    *   DeFi protocols verify the ZK proof on-chain to grant access.

## Workspace Structure

- `apps/web`: Next.js 14 Web App (App Router). Uses Tailwind, Wagmi.
- `apps/notary`: Node.js/Fastify service. Handles EdDSA signing.
- `apps/aggregator`: Data extraction service.
- `packages/circuits`: Circom circuits (`.circom`). Contains ZK logic.
- `packages/contracts`: Solidity smart contracts (Hardhat).
- `packages/sdk`: Shared TypeScript logic (proof generation, API clients). Used by `web` and services.
- `packages/aggregation-engine`: Core calculation logic.

## Development Workflow

- **Package Manager**: `npm` (v11+).
- **Build System**: `turbo`.
- **Start All Services**: `npm run dev` (starts web, notary, aggregator in parallel).
- **Context Awareness**: When editing `apps/web`, ensure you check `@plight/sdk` for shared types/logic.

### Specific Commands
- **Rebuild Circuits**: `npm run build --workspace=packages/circuits`. Use `npm run compile:main` in that directory for specific circuit targets.
- **Run Notary**: `npm run dev --workspace=apps/notary`.
- **Run Web**: `npm run dev --workspace=apps/web` (Port 3002).

## Technical & Coding Conventions

### TypeScript & Next.js
- **Strict Mode**: Types are strict. Avoid `any`.
- **App Router**: Use `apps/web/app/` directory structure.
- **Client Components**: Mark components as `'use client'` if they use hooks or browser APIs (especially for ZK proof generation which requires `window` or workers).
- **Webpack Config**: `next.config.js` has specific fallbacks (`fs: false`, `crypto: false`) to allow node-centric libraries (like snarkjs/ethers) to run in the browser.

### Zero-Knowledge (Circom)
- **Artifacts**: ZK proofs require `.wasm` and `.zkey` files. These are typically generated in `packages/circuits/build` and must be accessible to the frontend (often copied to `apps/web/public` or served via CDN).
- **Hashing**: Use `poseidon` for ZK-friendly hashing.

### Testing
- **Circuits**: `mocha` based tests in `packages/circuits/test`.
- **Integration**: `verify-trust.ts` in root is a standalone script to test the Notary flow.

## Common Pitfalls
- **WASM Loading**: Next.js can struggle with async WASM. Dependencies are transpiled via `transpilePackages: ["@plight/sdk"]`.
- **BigInt Serialization**: JSON.stringify fails on BigInt (common in ZK inputs). Use custom serializers or libraries that handle BigInts when passing data between `web` and `workers`.
