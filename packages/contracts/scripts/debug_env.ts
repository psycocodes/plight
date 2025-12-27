
import * as dotenv from "dotenv";
import * as path from "path";

// Resolving from 'packages/contracts/scripts' -> 'plight/.env' (3 levels up)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

console.log("Debug Env Script");
console.log("Current Dir:", __dirname);
console.log("Target Env Path:", path.resolve(__dirname, "../../../.env"));
console.log("SEPOLIA_RPC_URL:", process.env.SEPOLIA_RPC_URL ? process.env.SEPOLIA_RPC_URL.slice(0, 10) + "..." : "UNDEFINED");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "EXISTS (Len: " + process.env.PRIVATE_KEY.length + ")" : "MISSING");
