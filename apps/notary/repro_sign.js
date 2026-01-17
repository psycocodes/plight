
const { eddsa, poseidon } = require('circomlibjs');

function testSign() {
    console.log("Using Synchronous circomlibjs v0.0.8");
    
    // Test with plain BigInts
    const inputs = [
        BigInt(1),
        BigInt(1700000000),
        BigInt("1238012972454248237435767387143779415173800484933"),
        BigInt(0)
    ];

    console.log("Inputs:", inputs);

    try {
        const hash = poseidon(inputs);
        // Note: poseidon in 0.0.8 might return a BigInt or scalar, let's see.
        console.log("Poseidon hash:", hash);
        
        const prvKey = Buffer.alloc(32, 1);
        console.log("Attempting signPoseidon with Hash...");
        
        const signature = eddsa.signPoseidon(prvKey, hash);
        console.log("Signature created!");
        
        const packed = eddsa.packSignature(signature);
        console.log("Packed:", packed);

    } catch (e) {
        console.error("Error:", e);
    }
}

testSign();
