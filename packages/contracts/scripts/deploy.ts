import { ethers } from "hardhat";

async function main() {
  console.log("Deploying PlightVerifier...");
  // PlightVerifier inherits Verifier, so we just deploy PlightVerifier
  const plightVerifier = await ethers.deployContract("PlightVerifier");
  await plightVerifier.waitForDeployment();
  console.log(
    `PlightVerifier deployed to: ${await plightVerifier.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
