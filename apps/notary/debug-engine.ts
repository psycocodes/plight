import { aggregate } from 'aggregation-engine';
import { setVerbose } from 'aggregation-engine';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' }); // try to load from root

async function run() {
    console.log("Starting Debug...");
    setVerbose('all');
    try {
        const output = await aggregate(
            [1],
            18000000,
            18001000,
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        );
        console.log("Success:", output);
    } catch (e: any) {
        console.error("FAIL:", e);
        console.error("Stack:", e.stack);
    }
}

run();
