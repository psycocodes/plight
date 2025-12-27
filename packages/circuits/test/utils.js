const { buildPoseidon, buildEddsa } = require("circomlibjs");

let poseidon;
let eddsa;

async function init() {
    poseidon = await buildPoseidon();
    eddsa = await buildEddsa();
}

function getPoseidon() { return poseidon; }
function getEddsa() { return eddsa; }

function hash(inputs) {
    const hash = poseidon(inputs);
    return poseidon.F.toObject(hash); // return as BigInt/String
}

function sign(privKey, msgHash) {
    const pubKey = eddsa.prv2pub(privKey);
    const signature = eddsa.signPoseidon(privKey, poseidon.F.e(msgHash));
    const packed = eddsa.packSignature(signature);
    const unpacked = eddsa.unpackSignature(packed);

    console.log("Unpacked R8[0] type:", typeof unpacked.R8[0]);
    console.log("Unpacked S type:", typeof unpacked.S);
    try {
        console.log("Unpacked R8[0] value:", unpacked.R8[0]); // might print byte array
    } catch (e) { }

    // pubKey is likely [Uint8Array, Uint8Array] too?
    // Let's check or handle both.
    const toBigInt = (val) => {
        if (typeof val === 'bigint') return val;
        // Use library to convert to Element then to BigInt
        // This handles buffers, arrays, etc. correctly
        return BigInt(poseidon.F.toString(poseidon.F.e(val)));
    };

    const res = {
        R8x: toBigInt(unpacked.R8[0]),
        R8y: toBigInt(unpacked.R8[1]),
        S: toBigInt(unpacked.S),
        pubKey: {
            Ax: toBigInt(pubKey[0]),
            Ay: toBigInt(pubKey[1])
        }
    };

    // Self-test verification
    const sigObj = { R8: unpacked.R8, S: unpacked.S };
    // unpacked.R8 is [U8, U8]. S is BigInt.
    // eddsa.verifyPoseidon expects this format?
    // Let's try.
    // Also pubKey is [U8, U8].
    const valid = eddsa.verifyPoseidon(poseidon.F.e(msgHash), sigObj, pubKey);
    console.log("Utils self-verify:", valid);

    return res;
}

/**
 * Generates a dummy Merkle Proof for a given leaf.
 * Constructs a path of random siblings to derive a root.
 * This is sufficient for testing valid proofs.
 * 
 * @param {BigInt|Element} leaf - The leaf to inclusion prove
 * @param {number} depth - Tree depth (default 20)
 * @param {number} index - Leaf index (path directions)
 */
const generateMerkleProof = (leaf, depth = 20, index = 0) => {
    const poseidon = getPoseidon();
    const F = poseidon.F;
    const pathElements = [];
    const pathIndex = [];

    let current = F.e(leaf);

    for (let i = 0; i < depth; i++) {
        // Direction: (index >> i) & 1
        const dir = (index >> i) & 1;
        pathIndex.push(dir);

        // Random sibling (for testing, allow 0 or arbitrary)
        // We use a fixed value to be deterministic? Or different.
        // Let's use BigInt(i + 12345).
        const sibling = F.e(BigInt(i + 12345));
        pathElements.push(F.toObject(sibling));

        if (dir === 0) {
            // Leaf is Left, Sibling is Right
            // Hash(current, sibling)
            current = poseidon([current, sibling]);
        } else {
            // Leaf is Right, Sibling is Left
            // Hash(sibling, current)
            current = poseidon([sibling, current]);
        }
    }

    return {
        root: F.toObject(current),
        pathElements: pathElements,
        pathIndex: pathIndex
    };
};

module.exports = { init, getPoseidon, getEddsa, hash, sign, generateMerkleProof };
