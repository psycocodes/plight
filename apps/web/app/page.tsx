import Link from 'next/link';
import DarkVeil from '../components/DarkVeil';

export default function LandingPage() {
  return (
    <main className="min-h-screen text-[#ededed] font-sans selection:bg-white selection:text-black relative overflow-hidden">
      <DarkVeil />
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight">Plight</div>
          <div className="flex gap-6 text-sm font-medium text-gray-400">
            <Link href="/whitepaper" className="hover:text-white transition-colors">Whitepaper</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/demo" className="text-white hover:text-gray-300 transition-colors">Launch App</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-48 pb-32 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-white">
            Eligibility, <br />
            <span className="text-gray-500">Proven Privately.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Prove you have behaved responsibly on-chain without revealing your address, history, or identity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/demo" className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all">
              Check Eligibility
            </Link>
            <Link href="/whitepaper" className="px-8 py-4 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/5 transition-all">
              Read Whitepaper
            </Link>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">The Problem</h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              DeFi protocols treat long-term responsible users and extraction bots exactly the same. 
              To protect against the worst actors, protocols force everyone to over-collateralize and pay high premiums.
            </p>
            <p className="text-gray-400 text-lg leading-relaxed">
              Current solutions require you to dox yourself (KYC) or rely on centralized credit scores. 
              Neither is acceptable for a permissionless financial system.
            </p>
          </div>
          <div className="p-8 border border-white/10 rounded-2xl bg-white/5">
            <div className="space-y-4 font-mono text-sm">
              <div className="flex justify-between text-red-400">
                <span>Current State</span>
                <span>Inefficient</span>
              </div>
              <div className="h-px bg-white/10"></div>
              <div className="flex justify-between">
                <span className="text-gray-500">Collateral Ratio</span>
                <span>150% (Everyone)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Privacy</span>
                <span>Public / Doxxed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 3-Step Flow */}
      <section className="py-24 px-6 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-16 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Aggregate",
                desc: "We scan your on-chain history locally to calculate behavioral metrics. No raw data leaves your control."
              },
              {
                step: "02",
                title: "Notarize",
                desc: "A notary signs a blinded summary of your behavior. This attestation is time-bound and specific to you."
              },
              {
                step: "03",
                title: "Prove",
                desc: "You generate a Zero-Knowledge proof in your browser. The protocol sees the proof, not your address."
              }
            ].map((item, i) => (
              <div key={i} className="p-8 border border-white/10 rounded-xl bg-black hover:border-white/30 transition-colors">
                <div className="text-4xl font-bold text-gray-700 mb-6">{item.step}</div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Protocols See */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">What Protocols See</h2>
          <div className="inline-block text-left p-8 border border-green-900/50 bg-green-900/10 rounded-xl font-mono">
            <div className="space-y-2">
              <div className="flex gap-8">
                <span className="text-gray-500">isEligible:</span>
                <span className="text-green-400">true</span>
              </div>
              <div className="flex gap-8">
                <span className="text-gray-500">expiresAt:</span>
                <span className="text-blue-400">1735467890</span>
              </div>
              <div className="flex gap-8">
                <span className="text-gray-500">address:</span>
                <span className="text-gray-600">HIDDEN</span>
              </div>
            </div>
          </div>
          <p className="mt-8 text-gray-400">
            One boolean. One timestamp. Zero leakage.
          </p>
        </div>
      </section>

      {/* Why This Is Safe */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold mb-4">No Permanent Trust</h3>
            <p className="text-gray-400">
              Attestations expire automatically. If your behavior changes, you must re-prove your eligibility.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-4">Automatic Invalidation</h3>
            <p className="text-gray-400">
              The system is designed to fail safe. Bad behavior invalidates your ability to generate new proofs immediately.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-4">No Identity Leakage</h3>
            <p className="text-gray-400">
              Your wallet address is never linked to the proof on-chain. Observers cannot trace the proof back to you.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-4">Protocol Compatible</h3>
            <p className="text-gray-400">
              Protocols integrate a single verifier contract. No complex changes to their existing risk engines.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Block */}
      <section className="py-32 px-6 border-t border-white/10 text-center">
        <h2 className="text-4xl font-bold mb-8">Prove eligibility. Reveal nothing.</h2>
        <Link href="/demo" className="inline-block px-12 py-5 bg-white text-black font-bold text-lg rounded-lg hover:bg-gray-200 transition-all">
          Launch App
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-gray-600 text-sm">
        <p>&copy; 2025 Plight. All rights reserved.</p>
      </footer>
    </main>
  );
}
