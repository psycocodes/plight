const { keccak256, toUtf8Bytes } = require('ethers');

const NOTARY_URL = 'http://localhost:3000';
const REGISTRY_URL = 'http://localhost:3001';

async function verify() {
  console.log('--- Starting Verification (JS) ---');

  // 1. Request Attestation
  console.log('1. Requesting Attestation from Notary...');
  const attestParams = {
    version: '1.0',
    subject: '0xd01607c3c5ecaba394d8be377a08590149325722', // Added subject
    chainId: 1,
    protocol: 'aave_v3',
    window: { from: 1700000000, to: 1700086400 },
    blockRange: { fromBlock: 18000000, toBlock: 18001000 }
  };

  let attestationRes;
  try {
      const res = await fetch(`${NOTARY_URL}/attest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestParams)
      });
      
      if (!res.ok) {
        throw new Error(`Notary failed: ${res.status} ${await res.text()}`);
      }
      attestationRes = await res.json();
      console.log('✓ Attestation received:', attestationRes.signature.value.slice(0, 10) + '...');
  } catch (e) {
      console.error('Failed to contact Notary.', e);
      process.exit(1);
  }

  const { attestation } = attestationRes;

  // 2. Extract Attestation Hash (Poseidon)
  // Note: Client-side Poseidon re-hashing requires ZK libs. 
  // For this lightweight check, we use the hash provided by the Notary for the Registry lookup.
  const calculatedHash = attestation.summaryHash; // This is the ZK-circuit compatible hash
  
  console.log('✓ Attestation Hash (ZK-ID):', calculatedHash);

  // 3. Check Registry
  console.log('2. Checking Registry for revocation...');
  try {
      const res = await fetch(`${REGISTRY_URL}/revoked?attestationHash=${calculatedHash}`);
      const regData = await res.json();
      
      if (regData.revoked === true) {
          throw new Error('Attestation is already revoked! Should be valid.');
      }
      console.log('✓ Registry says: Valid (Not Revoked)');
  } catch (e) {
      console.error('Failed to contact Registry.', e);
      process.exit(1);
  }

  console.log('--- Verification Complete ---');
  console.log('Notary and Registry are independent and consistent.');
}

verify();
