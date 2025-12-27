'use client';

import { useState, useEffect } from 'react';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { BrowserProvider, Contract } from 'ethers';
import { checkEligibility, ProofArtifacts } from '@plight/sdk';
import { packProof } from '@/utils/zk';
import { PROTOCOL_ADDRESS } from '@/utils/config';

// ABI for SampleProtocol
const PROTOCOL_ABI = [
  "function checkHealth(bytes calldata proof, uint256[] calldata publicInputs) external",
  "event HealthChecked(address indexed user, bool healthy)"
];

export default function Home() {
  const { open } = useWeb3Modal();
  const { address, isConnected, chainId } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();

  const [status, setStatus] = useState<string>("Not Checked");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const handleRunCheck = async () => {
    if (!isConnected || !walletProvider) {
      addLog("Wallet not connected");
      return;
    }
    
    try {
      setLoading(true);
      setStatus("Generating Proof...");
      addLog("Starting Client-Side Eligibility Check...");

      // 1. Prepare Artifacts (Hosted locally in public/ or CDN)
      // For this demo, we assume they are at the root or referenced correctly.
      // In a real app, these fetch generic circuit files.
      // NOTE: User must put these files in apps/web/public/ if they don't exist yet.
      const artifacts: ProofArtifacts = {
        wasm: '/circuit.wasm', 
        zkey: '/circuit_final.zkey'
      };

      // 2. Run SDK (Aggregator Simulation + ZK Proof)
      // This runs entirely in the browser.
      const config = {
        userAddress: address!, // Validated by isConnected
        protocol: 'aave_v3'
      };

      addLog(`Running @plight/sdk.checkEligibility for ${config.userAddress}...`);
      const result = await checkEligibility(config, artifacts);

      if (!result.isEligible || !result.proof) {
        throw new Error(result.error || "Eligibility check failed locally.");
      }

      addLog("Proof Generated successfully!");
      addLog(`Public Signals: ${JSON.stringify(result.proof.publicSignals)}`);
      
      // 3. Submit to Blockchain
      setStatus("Submitting Transaction...");
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();
      
      const protocol = new Contract(PROTOCOL_ADDRESS, PROTOCOL_ABI, signer);
      
      // Format Proof for Solidity
      const proofBytes = packProof(result.proof.proof);
      
      addLog(`Submitting to SampleProtocol (${PROTOCOL_ADDRESS})...`);
      
      const tx = await protocol.checkHealth(proofBytes, result.proof.publicSignals);
      addLog(`Transaction Sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      addLog(`Transaction Confirmed in block ${receipt.blockNumber}`);

      // 4. Verify Result (Check Logs or assume success if no revert)
      // Ideally we parse logs, but for now successful tx means it didn't revert.
      setStatus("Healthy ✅");
      addLog("Verification Validated On-Chain!");

    } catch (err: any) {
      console.error(err);
      setStatus("Not Healthy ❌");
      addLog(`Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Plight Eligibility Verification
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <w3m-button />
        </div>
      </div>

      <div className="relative flex place-items-center flex-col gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Are you Eligible?</h1>
          <div className="text-xl mb-8 p-4 border rounded bg-gray-100 dark:bg-zinc-900">
            Status: <span className="font-bold">{status}</span>
          </div>
          
          <button 
            onClick={handleRunCheck}
            disabled={!isConnected || loading}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded-lg font-bold text-lg transition-all"
          >
            {loading ? "Verifying..." : "Check Eligibility"}
          </button>
        </div>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-1 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors border-gray-300 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800/30">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Logs
          </h2>
          <div className="h-64 overflow-y-auto text-xs font-mono bg-black text-green-400 p-4 rounded">
            {logs.length === 0 && <span className="text-gray-500">Waiting for action...</span>}
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
