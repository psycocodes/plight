import Link from 'next/link';

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-white selection:text-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight hover:text-white transition-colors">Plight</Link>
          <div className="flex gap-6 text-sm font-medium text-gray-400">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/demo" className="text-white hover:text-gray-300 transition-colors">Launch App</Link>
          </div>
        </div>
      </nav>

      <article className="pt-32 pb-32 px-6 max-w-3xl mx-auto prose prose-invert prose-lg">
        <h1 className="text-5xl font-bold mb-8 tracking-tight">Plight Whitepaper</h1>
        <p className="text-xl text-gray-400 mb-16 leading-relaxed">
          A protocol for privacy-preserving, time-bound eligibility verification on public blockchains.
        </p>

        <h2>1. Abstract</h2>
        <p>
          Plight enables users to prove they meet specific behavioral criteria (e.g., "no recent liquidations") without revealing their transaction history, wallet address, or identity to the verifying protocol. By combining off-chain aggregation with Zero-Knowledge Proofs (ZKPs), Plight creates a "behavioral passport" that is both verifiable and private.
        </p>

        <h2>2. The Problem</h2>
        <p>
          DeFi protocols currently face a dilemma: they must treat every user as a potential adversary. Without the ability to distinguish between a long-term responsible user and a fresh bot wallet, protocols are forced to impose conservative parameters (high collateralization ratios, strict liquidation penalties) on everyone.
        </p>
        <p>
          Existing solutions rely on either:
        </p>
        <ul>
          <li><strong>Public History:</strong> Analyzing a user's past on-chain, which requires the user to dox their main wallet to the protocol.</li>
          <li><strong>Identity Verification (KYC):</strong> Relying on centralized off-chain identity, which introduces privacy risks and permissioned access.</li>
        </ul>

        <h2>3. The Plight Solution</h2>
        <p>
          Plight introduces a third path: <strong>Proven Eligibility</strong>. Instead of sharing raw data, users share a cryptographic proof that they satisfy a specific predicate.
        </p>

        <h3>3.1 Architecture</h3>
        <p>The system consists of three phases:</p>
        <ol>
          <li>
            <strong>Aggregation (Client-Side):</strong> The user's local client scans their own public transaction history across multiple chains. It computes a summary of relevant metrics (e.g., total liquidations, average health factor).
          </li>
          <li>
            <strong>Notarization (Blind Signing):</strong> The client sends a blinded commitment of this summary to a Notary service. The Notary verifies the aggregation logic (by re-running it against public data) and signs a time-bound attestation. Crucially, the Notary sees the data but cannot link it to the final proof used on-chain.
          </li>
          <li>
            <strong>Proof Generation (Zero-Knowledge):</strong> The user takes the signed attestation and generates a ZK-SNARK (Groth16) locally. This proof asserts: "I hold a valid attestation from the Notary that says I am eligible."
          </li>
        </ol>

        <h2>4. Privacy Model</h2>
        <p>
          The verifying protocol receives only:
        </p>
        <ul>
          <li>A boolean flag: <code>isEligible</code></li>
          <li>An expiry timestamp</li>
          <li>A Zero-Knowledge Proof</li>
        </ul>
        <p>
          The protocol <strong>does not</strong> receive:
        </p>
        <ul>
          <li>The user's wallet address (the proof is submitted via a relayer or fresh address)</li>
          <li>The specific metrics (e.g., exact number of loans)</li>
          <li>The history of the user</li>
        </ul>

        <h2>5. Security & Trust</h2>
        <p>
          Plight minimizes trust assumptions. The Notary is trusted only for liveness and correctness of the aggregation. It cannot forge proofs for users who do not meet the criteria. The ZK circuit ensures that a user cannot generate a valid proof without a valid Notary signature.
        </p>
        <p>
          Attestations are short-lived (e.g., 24 hours). If a user's behavior changes (e.g., they get liquidated), they must request a new attestation. The Notary will refuse to sign if the new state violates the eligibility criteria.
        </p>

        <h2>6. Conclusion</h2>
        <p>
          Plight provides the missing layer of "reputation without identity" for DeFi. It allows protocols to offer better terms to good actors while maintaining the permissionless, privacy-first ethos of crypto.
        </p>

        <div className="mt-16 pt-8 border-t border-white/10">
          <Link href="/demo" className="text-white font-bold hover:underline">
            &larr; Back to App
          </Link>
        </div>
      </article>
    </main>
  );
}
