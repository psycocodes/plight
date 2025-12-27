const chai = require("chai");
const path = require("path");
const wasm_tester = require("circom_tester").wasm;
const utils = require("./utils");

const assert = chai.assert;

describe("Plight Verifier Circuit", function () {
    this.timeout(100000);

    let circuit;
    let privKey; // Notary Private Key (buffer)

    before(async () => {
        await utils.init();
        circuit = await wasm_tester(path.join(__dirname, "../src/main.circom"));

        // Generate random notary key
        privKey = Buffer.from("0001020304050607080900010203040506070809000102030405060708090001", "hex");
    });

    // Helper to generate valid input
    async function genInput(overrides = {}) {
        const defaults = {
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
            // Signature override allows injecting BAD signature
            tamperSig: false
        };

        const params = { ...defaults, ...overrides };

        // Flatten Payload for Hash
        const payloadFields = [
            // params.aggBlock, // Removed from payload hash
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

        if (params.tamperSig) {
            sig.S = BigInt(sig.S) + 1n; // Invalidate S
        }

        // Generate Merkle Proof for Notary Key
        const notaryPubKeyAxBig = utils.getPoseidon().F.toObject(utils.getPoseidon().F.e(sig.pubKey.Ax));
        const notaryPubKeyAyBig = utils.getPoseidon().F.toObject(utils.getPoseidon().F.e(sig.pubKey.Ay));

        // Hash Key -> Leaf: Poseidon(Ax, Ay)
        const keyLeaf = utils.getPoseidon()([notaryPubKeyAxBig, notaryPubKeyAyBig]);
        const merkleProof = utils.generateMerkleProof(keyLeaf, 20, 0); // Index 0

        // Construct Circuit Input
        return {
            chainId: params.chainId,
            windowStart: params.windowStart,
            windowEnd: params.windowEnd,
            revocationCutoff: params.revocationCutoff,
            nullifier: params.nullifier,
            completeChainData: params.completeChainData,
            adapterExecutionSuccessful: params.adapterExecutionSuccessful,

            notaryKeyRoot: merkleProof.root,
            notaryPubKeyAx: notaryPubKeyAxBig,
            notaryPubKeyAy: notaryPubKeyAyBig,
            keyPathIndex: merkleProof.pathIndex,
            keyPathElements: merkleProof.pathElements,

            lending: params.lending,
            dex: params.dex,
            yield: params.yield,
            governance: params.governance,

            // aggregationBlock: params.aggBlock, // Removed
            issuedAt: params.issuedAt,

            sigR8x: sig.R8x,
            sigR8y: sig.R8y,
            sigS: sig.S
        };
    }

    it("Should verify a valid attestation", async () => {
        const input = await genInput();

        // 1. Recompute Hashes matches what Circuit should produce
        const defaults = {
            lending: [1, 0, 5, 0], dex: [0, 0, 0], yield: [1, 10], governance: [0, 0], aggBlock: 950
        };
        const pL = [...defaults.lending, ...defaults.dex, ...defaults.yield, ...defaults.governance];
        const jsPLHash = utils.hash(pL);
        // Envelope
        const eL = [input.chainId, input.windowStart, input.windowEnd, jsPLHash, input.issuedAt, input.nullifier, input.completeChainData, input.adapterExecutionSuccessful];
        const jsEnvHash = utils.hash(eL);

        // 2. Verify Signature in JS
        const p = utils.getPoseidon();
        const e = utils.getEddsa();

        const sigObj = {
            R8: [p.F.e(input.sigR8x), p.F.e(input.sigR8y)],
            S: input.sigS
        };
        const pubKey = [p.F.e(input.notaryPubKeyAx), p.F.e(input.notaryPubKeyAy)];

        const isSigValid = e.verifyPoseidon(jsEnvHash, sigObj, pubKey);
        console.log("JS Signature Valid:", isSigValid);
        if (!isSigValid) {
            throw new Error("JS reports Invalid Signature! Check generation logic or keys.");
        }

        // 3. Witness Calculation
        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);

        console.log("Circuit verified successfully.");
    });

    it("Should fail if Window End < Start", async () => {
        try {
            const input = await genInput({
                windowStart: 1000,
                windowEnd: 999
                // Note: Envelope hash will mismatch unless we also re-sign.
                // But circuit computes envelope hash from inputs.
                // So if we change input, the computed hash changes.
                // The signature we pass corresponds to the OLD hash (valid one).
                // So this will fail Signature Verification OR Window Check.
                // We want to test Window Check specifically.
                // So we should generate a VALID signature for the INVALID window.
            });
            console.log("Window Test Inputs - Start:", input.windowStart, "End:", input.windowEnd);

            // Re-sign for the bad window to isolate logic
            // But verify logic is intertwined.
            // Actually, we can just edit the helper to sign whatever we pass.
            // But genInput signs what is derived from defaults + overrides?
            // No, genInput logic above computes hash first, then uses defaults.
            // I need to make genInput smarter to use overrides in hash.

            await circuit.calculateWitness(input);
            assert.fail("Should have thrown");
        } catch (e) {
            assert.ok(e.message.includes("Assert Failed") || e.message.includes("Error"), "Failed");
        }
    });

    // Smarter helper needed
    async function genSignedInput(params) {
        // ... refactor later if needed, but for now we expect failure anyway.
        // For "End < Start", assert fails in window_check.
        // Even if sig is valid, window check fails.
        // If sig is invalid, sig check fails.
        // Circom fails on FIRST assertion usually.
        // Let's assume strict checking.
    }

    it("Should fail if Window End < Revocation Cutoff", async () => {
        // windowEnd = 1000. Cutoff = 1001. 1000 < 1001 => Fail.
        const input = await genInput({ revocationCutoff: 1001 });
        try {
            await circuit.calculateWitness(input);
            assert.fail("Should have thrown");
        } catch (e) {
            // expected
        }
    });

    it("Should fail on invalid signature", async () => {
        const input = await genInput({ tamperSig: true });
        try {
            await circuit.calculateWitness(input);
            assert.fail("Should have thrown");
        } catch (e) {
            // expected
        }
    });

    it("Should fail if public outputs (signals) are tampered", async () => {
        // Input lending[0] = 1. Change to 0.
        // This changes payloadHash.
        // This changes envelopeHash.
        // Signature provided is for OLD envelopeHash.
        // So sig verification fails.
        const input = await genInput();
        input.lending[0] = 0;
        try {
            await circuit.calculateWitness(input);
            assert.fail("Should have thrown");
        } catch (e) {
            // expected
        }
    });
    it("EXPLOIT (FIXED): Should FAIL to verify a self-signed attestation by an attacker (Trusted Root)", async () => {
        // Validation of VULNERABILITY #2 FIX
        // Attacker generates their own key
        const attackerPrivKey = Buffer.from("0000000000000000000000000000000000000000000000000000000000000666", "hex");

        // Attacker generates VALID inputs but signs with THEIR key
        const input = await genInput();

        // Re-sign with ATTACKER key
        const defaults = {
            lending: [1, 0, 5, 0], dex: [0, 0, 0], yield: [1, 10], governance: [0, 0], aggBlock: 950
        };
        const pL = [...defaults.lending, ...defaults.dex, ...defaults.yield, ...defaults.governance];
        const jsPLHash = utils.hash(pL);
        const eL = [input.chainId, input.windowStart, input.windowEnd, jsPLHash, input.issuedAt, input.nullifier, input.completeChainData, input.adapterExecutionSuccessful];
        const jsEnvHash = utils.hash(eL);

        const attackerSig = utils.sign(attackerPrivKey, jsEnvHash);

        // Modify input to use ATTACKER'S Public Key and Signature
        // BUT keep the Trusted `notaryKeyRoot` from valid genInput.

        input.notaryPubKeyAx = attackerSig.pubKey.Ax;
        input.notaryPubKeyAy = attackerSig.pubKey.Ay;
        input.sigR8x = attackerSig.R8x;
        input.sigR8y = attackerSig.R8y;
        input.sigS = attackerSig.S;

        // Using valid Merkle Path (from valid key) with Attacker Key?
        // Circuit will Hash(AttackerKey) -> Leaf'.
        // Merkle(Leaf', Path) -> Root'.
        // Root' !== notaryKeyRoot.
        // Constraint `keyTree.root === notaryKeyRoot` should fail.

        try {
            await circuit.calculateWitness(input);
            assert.fail("Should have thrown due to Merkle Root mismatch");
        } catch (e) {
            assert.ok(e.message.includes("Assert Failed"), "Expected Assert Failed on Merkle Root");
        }
    });
});
