# Requirements: Plight SaaS2

## User Stories

### User Flow
- **WHEN** a user connects their wallet, **THEN** the system fetches their lending history and computes their behavior score.
- **WHEN** a user has **not** been liquidated recently, **THEN** let them generate a ZK proof and show them as "Eligible".
- **WHEN** a user **has** been liquidated recently, **THEN** show them as "Not Eligible" and default to standard terms.

### Protocol Flow
- **WHEN** a protocol wants to use eligibility, **THEN** let them define thresholds (e.g., "no liquidations in 6 months").
- **WHEN** a user submits a proof, **THEN** verify the proof on-chain and adjust terms accordingly.

## Non-Functional Requirements
- **Chain Support:** Must support Ethereum and Polygon.
- **Privacy:** No private user data (like specific transaction history) should be stored or revealed; only the proof.
- **Performance:** ZK proof generation should take less than 10 seconds.
- **Integration:** Must be easy for protocols to integrate via smart contract calls or API.
