const path = require('path');
const fs = require('fs');
const wasm_tester = require("circom_tester").wasm;
const snarkjs = require("snarkjs");

async function compile() {
    console.log("Compiling main.circom using circom_tester (WASM)...");
    
    const inputPath = path.join(__dirname, "../src/main.circom");
    const ptauPath = path.join(__dirname, "../pot15_final.ptau");
    const buildDir = path.join(__dirname, "../build");
    
    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

    try {
        // 1. Compile Circuit
        const circuit = await wasm_tester(inputPath, {
            output: buildDir,
            recompile: true,
            verbose: true
        });

        console.log("Compilation successful! Circuit Dir:", circuit.dir);

        // circom_tester puts files in a temp dir. 'circuit.dir' has them.
        // Files: main.r1cs, main.wasm (inside main_js usually?)
        // Note: wasm_tester often compiles simplistically.
        // Let's find r1cs.
        const r1csSrc = path.join(circuit.dir, "main.r1cs");
        const wasmSrcDir = path.join(circuit.dir, "main_js"); 
        
        // Copy to build dir
        const r1csDest = path.join(buildDir, "circuit.r1cs");
        fs.copyFileSync(r1csSrc, r1csDest);
        
        // Copy WASM
        const wasmDestDir = path.join(buildDir, "circuit_js");
        if (!fs.existsSync(wasmDestDir)) fs.mkdirSync(wasmDestDir);
        copyRecursive(wasmSrcDir, wasmDestDir);
        
        console.log("Files copied to build/");

        // 2. Performance Trusted Setup (Groth16)
        console.log("Starting Trusted Setup...");
        if (!fs.existsSync(ptauPath)) {
            throw new Error(`PTAU file not found at ${ptauPath}`);
        }

        const zkeyOut = path.join(buildDir, "circuit_final.zkey");
        
        // Setup (R1CS + PTAU -> ZKEY)
        // snarkjs.groth16.setup(r1csFileName, ptauFileName, zkeyFileName)
        // Note: snarkjs API takes file paths or buffers.
        // Let's use the CLI-like API if possible or specific functions.
        // Actually snarkjs.groth16.setup return {zkey}. But zkeyNew is more low level.
        // The easiest way is using zkey.newZKey(r1cs, ptau, zkeyOut)
        
        await snarkjs.zKey.newZKey(r1csDest, ptauPath, zkeyOut, console);
        console.log("ZKey Generated:", zkeyOut);

        // 3. Export Verification Key
        const vKeyOut = path.join(buildDir, "verification_key.json");
        const vKey = await snarkjs.zKey.exportVerificationKey(zkeyOut);
        fs.writeFileSync(vKeyOut, JSON.stringify(vKey, null, 2));
        console.log("Verification Key Exported:", vKeyOut);
        
        console.log("DONE! Artifacts ready.");

    } catch (err) {
        console.error("Compilation Failed:", err);
        process.exit(1);
    }
}

function copyRecursive(src, dest) {
    if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(child => {
            copyRecursive(path.join(src, child), path.join(dest, child));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

compile();
