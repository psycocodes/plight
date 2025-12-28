import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-white selection:text-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight hover:text-white transition-colors">Plight</Link>
          <div className="flex gap-6 text-sm font-medium text-gray-400">
            <Link href="/whitepaper" className="hover:text-white transition-colors">Whitepaper</Link>
            <Link href="/demo" className="text-white hover:text-gray-300 transition-colors">Launch App</Link>
          </div>
        </div>
      </nav>

      <article className="pt-32 pb-32 px-6 max-w-3xl mx-auto prose prose-invert prose-lg">
        <h1 className="text-4xl font-bold mb-12 tracking-tight">About Plight</h1>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4 text-white">What Plight Is</h2>
          <p className="text-gray-400">
            Plight is a privacy-preserving eligibility layer for DeFi. It allows users to prove behavioral correctness (e.g., "no recent liquidations") to protocols without revealing their identity or transaction history.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4 text-white">Who Uses It</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Protocols</h3>
              <p className="text-gray-400 text-sm">
                Lending markets, perp DEXs, and under-collateralized credit protocols use Plight to filter out high-risk wallets and offer better capital efficiency to proven good actors.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Power Users</h3>
              <p className="text-gray-400 text-sm">
                Sophisticated DeFi users who want access to premium tiers (lower fees, higher LTV) but refuse to dox their main wallets via KYC or public linking.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4 text-white">Integration Model</h2>
          <p className="text-gray-400">
            Integration is lightweight. Protocols add a single modifier to their smart contracts:
          </p>
          <pre className="bg-zinc-900 p-4 rounded-lg text-sm overflow-x-auto border border-white/10">
            <code>
              {`function borrow(...) external onlyEligible(proof) {
  // ... existing logic
}`}
            </code>
          </pre>
          <p className="text-gray-400 mt-4">
            The <code>PlightVerifier</code> contract handles all cryptographic checks. No changes to the protocol's risk engine are required.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4 text-white">Revenue Model</h2>
          <ul className="list-disc pl-4 space-y-2 text-gray-400">
            <li><strong>Verification Fees:</strong> Small fee per proof verification (paid by user or subsidized by protocol).</li>
            <li><strong>SaaS Licensing:</strong> Enterprise licenses for custom eligibility predicates (e.g., "held token X for Y days").</li>
          </ul>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4 text-white">Defensibility</h2>
          <p className="text-gray-400">
            Plight's moat is built on:
          </p>
          <ul className="list-disc pl-4 space-y-2 text-gray-400">
            <li><strong>Privacy-First Architecture:</strong> Hard to retroactively add to existing reputation systems.</li>
            <li><strong>Trust Minimization:</strong> Users own their data; the platform cannot be evil.</li>
            <li><strong>Network Effects:</strong> As more protocols accept Plight proofs, the value of holding a Plight attestation increases.</li>
          </ul>
        </section>

        <div className="mt-16 pt-8 border-t border-white/10">
          <Link href="/demo" className="text-white font-bold hover:underline">
            &larr; Launch App
          </Link>
        </div>
      </article>
    </main>
  );
}
