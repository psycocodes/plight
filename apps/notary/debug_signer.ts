
import { SignerService } from './src/services/signer';

async function main() {
    try {
        const signer = new SignerService();
        // Wait for init? The service does it internally in methods usually, but let's check.
        // The methods await this.initialized.
        
        console.log("Signer created. Attempting to sign...");
        
        const protocol = 'aave_v3';
        const expiresAt = 1735689600;
        const subject = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        const summaryValue = 5;

        const signature = await signer.signAttestation(protocol, expiresAt, subject, summaryValue);
        console.log("Signature:", signature);
        
    } catch (error) {
        console.error("Error signing:", error);
        if (error instanceof Error) {
            console.error(error.stack);
        }
    }
}

main();
