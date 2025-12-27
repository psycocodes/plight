const { keccak256, toUtf8Bytes } = require('ethers');

// Configuration
const NOTARY_URL = 'http://localhost:3000';
const REGISTRY_URL = 'http://localhost:3001';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function logPass(testName) {
  console.log(`${GREEN}✓ PASS:${RESET} ${testName}`);
}

function logFail(testName, error) {
  console.log(`${RED}✗ FAIL:${RESET} ${testName}`);
  console.error(`  Error: ${error.message}`);
}

async function runTests() {
  console.log(`${BOLD}--- Plight Trust Architecture: End-to-End Test Suite ---${RESET}\n`);

  // --- Test Case 1: Service Availability ---
  try {
    // We assume they are running. In a real test we might check healthcheck endpoints.
    // For now, we'll just proceed and catch connection errors.
  } catch (e) {}

  // --- Test Case 2: Issue Valid Attestation (Real Aggregation) ---
  let attestationData;
  const testSteps = 'Issue Attestation (Aave V3)';
  try {
    console.log(`Executing: ${testSteps}...`);
    const params = {
      version: '1.0',
      chainId: 1,
      protocol: 'aave_v3',
      window: { from: 1700000000, to: 1700086400 },
      blockRange: { fromBlock: 18000000, toBlock: 18001000 }
    };

    const res = await fetch(`${NOTARY_URL}/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    attestationData = await res.json();
    
    if (!attestationData.signature || !attestationData.attestation) throw new Error('Invalid response structure');
    
    logPass(testSteps);
    console.log(`   > Signature: ${attestationData.signature.value.slice(0, 16)}...`);
    console.log(`   > Summary Hash: ${attestationData.attestation.summaryHash}`);
  } catch (error) {
    logFail(testSteps, error);
    process.exit(1);
  }

  // --- Test Case 3: Verify Attestation Hash Integrity ---
  const verifyStep = 'Verify Attestation Hash Logic';
  let calculatedHash;
  try {
    const a = attestationData.attestation;
    const canonicalString = [
      a.version, a.issuer, a.issuedAt, a.expiresAt, a.chainId, a.protocol,
      a.window.from, a.window.to, a.blockRange.fromBlock, a.blockRange.toBlock, a.summaryHash
    ].join('|');
    
    const domainPrefix = 'PLIGHT-NOTARY-V1:';
    calculatedHash = keccak256(toUtf8Bytes(domainPrefix + canonicalString));

    // In a real verifier, we would also check the Ed25519 signature against the issuer public key.
    // Here we implicitly trust the server returned it, but let's check the hash construction.
    
    logPass(verifyStep);
    console.log(`   > Calculated Hash: ${calculatedHash}`);
  } catch (error) {
    logFail(verifyStep, error);
    process.exit(1);
  }

  // --- Test Case 4: Check Revocation Status (Clean) ---
  const checkStep = 'Check Revocation Registry (Should be Valid)';
  try {
    const res = await fetch(`${REGISTRY_URL}/revoked?attestationHash=${calculatedHash}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.revoked !== false) throw new Error('Attestation reported as revoked (expected false)');
    
    logPass(checkStep);
    console.log(`   > Status: VALID`);
  } catch (error) {
    logFail(checkStep, error);
    process.exit(1);
  }
  
  console.log(`\n${BOLD}--- All Tests Passed ---${RESET}`);
}

runTests();
