
# @plight/sdk

Minimal, browser-compatible SDK for Plight eligibility checks using Client-Side ZK Proving.

## Features

- **Browser Native**: ESM module, no Node.js polyfills required.
- **Real ZK Proving**: Uses `snarkjs` and `circomlibjs` to generate valid Groth16 proofs in the client.
- **Stateless**: Does not rely on a centralized backend for proof generation.

## Installation

```bash
npm install @plight/sdk
```

## Usage

You must provide the ZK circuit artifacts (`.wasm` and `.zkey`) to the SDK. These should be hosted on your CDN or static server.

```javascript
import { checkEligibility } from '@plight/sdk';

const config = {
  userAddress: "0x1234...", // User's Wallet
  protocol: "aave_v3"
};

const artifacts = {
  wasm: "/assets/circuit.wasm", // URL or ArrayBuffer
  zkey: "/assets/circuit_final.zkey"
};

async function run() {
  const result = await checkEligibility(config, artifacts);

  if (result.isEligible) {
    console.log("Proof Generated!", result.proof);
    // Send result.proof to Verifier Contract
  } else {
    console.error("Not Eligible:", result.error);
  }
}
```

## Architecture

1.  **Mock Network**: Currently invokes a simulated Notary internally (generating ephemeral keys) to produce valid inputs for the circuit.
2.  **Real Crypto**: Uses `Poseidon` hashing and `Groth16` proving to generate a cryptographic proof that the user satisfies the policy (`liquidationCount == 0`).
