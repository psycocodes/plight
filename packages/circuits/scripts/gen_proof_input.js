const utils = require('../test/utils');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Initializing Utils...");
    await utils.init();

    // Generate random notary key
    // Using fixed key for reproducibility in this script
    const privKey = Buffer.from("0001020304050607080900010203040506070809000102030405060708090001", "hex");

    const params = {
        lending: [1, 0, 5, 0],
        dex: [0, 0, 0],
        yield: [1, 10],
        governance: [0, 0],
        aggBlock: 950,
        chainId: 1,
        windowStart: 900,
        windowEnd: 1000,
        revocationCutoff: 800,
        issuedAt: 1050,
        nullifier: 123456789n,
        completeChainData: 1,
        adapterExecutionSuccessful: 1,
    };

    // Flatten Payload for Hash
    // aggBlock REMOVED from payload hash in Phase 3 fix
    const payloadFields = [
        ...params.lending,
        ...params.dex,
        ...params.yield,
        ...params.governance
    ];
    const payloadHash = utils.hash(payloadFields);

    // Flatten Envelope for Hash
    const envelopeFields = [
        params.chainId, params.windowStart, params.windowEnd, payloadHash,
        params.issuedAt, params.nullifier,
        params.completeChainData, params.adapterExecutionSuccessful
    ];

    const envelopeHash = utils.hash(envelopeFields);
    let sig = utils.sign(privKey, envelopeHash);

    // Generate Merkle Proof for Notary Key
    const poseidon = utils.getPoseidon();
    const notaryPubKeyAxBig = poseidon.F.toObject(poseidon.F.e(sig.pubKey.Ax));
    const notaryPubKeyAyBig = poseidon.F.toObject(poseidon.F.e(sig.pubKey.Ay));

    const keyLeaf = poseidon([notaryPubKeyAxBig, notaryPubKeyAyBig]);

    // Generate simple proof (size 20)
    // In our test utils, we use a loop with fixed randomness for siblings
    const merkleProof = utils.generateMerkleProof(keyLeaf, 20, 0);

    const input = {
        chainId: params.chainId,
        windowStart: params.windowStart,
        windowEnd: params.windowEnd,
        revocationCutoff: params.revocationCutoff,
        nullifier: params.nullifier.toString(),
        completeChainData: params.completeChainData,
        adapterExecutionSuccessful: params.adapterExecutionSuccessful,

        notaryKeyRoot: merkleProof.root.toString(),
        notaryPubKeyAx: notaryPubKeyAxBig.toString(),
        notaryPubKeyAy: notaryPubKeyAyBig.toString(),
        keyPathIndex: merkleProof.pathIndex,
        keyPathElements: merkleProof.pathElements.map(e => e.toString()),

        lending: params.lending,
        dex: params.dex,
        yield: params.yield,
        governance: params.governance,

        issuedAt: params.issuedAt,

        sigR8x: sig.R8x.toString(),
        sigR8y: sig.R8y.toString(),
        sigS: sig.S.toString()
    };

    const outputString = JSON.stringify(input, null, 2);
    fs.writeFileSync(path.join(__dirname, '../input.json'), outputString);
    console.log("Generated input.json");
    console.log("Root:", input.notaryKeyRoot);
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
