const { buildPoseidon, buildEddsa } = require("circomlibjs");
const fs = require("fs");
const path = require("path");

async function main() {
  const poseidon = await buildPoseidon();
  const eddsa = await buildEddsa();

  // 1. Generate Notary Key
  // Use a fixed seed for reproducibility
  const prvKey = Buffer.from(
    "0001020304050607080900010203040506070809000102030405060708090001",
    "hex"
  );
  const pubKey = eddsa.prv2pub(prvKey);

  // 2. Define Inputs
  const policyId = 101;
  const expiresAt = 1900000000; // Future date
  // Use a BigInt representation of an address (20 bytes fits in field)
  const userAddressBigInt = BigInt(
    "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
  );

  const liquidationCount = 0; // Must be 0

  // 3. Compute Attestation Hash
  // [policyId, expiresAt, userAddress, liquidationCount]
  const inputs = [policyId, expiresAt, userAddressBigInt, liquidationCount];
  const attestationHash = poseidon(inputs);
  const attestationHashStr = poseidon.F.toString(attestationHash);

  // 4. Sign Attestation Hash
  const signature = eddsa.signPoseidon(prvKey, attestationHash);

  // 5. Format Output
  const input = {
    attestationHash: attestationHashStr,
    expiresAt: expiresAt.toString(),
    policyId: policyId.toString(),
    notaryKeyAx: poseidon.F.toString(pubKey[0]),
    notaryKeyAy: poseidon.F.toString(pubKey[1]),
    userAddress: userAddressBigInt.toString(),
    liquidationCount: liquidationCount.toString(),
    sigR8x: poseidon.F.toString(signature.R8[0]),
    sigR8y: poseidon.F.toString(signature.R8[1]),
    sigS: signature.S.toString(),
  };

  console.log(JSON.stringify(input, null, 2));

  // Write to input.json
  fs.writeFileSync(
    path.join(__dirname, "../input.json"),
    JSON.stringify(input, null, 2)
  );
}

main();
