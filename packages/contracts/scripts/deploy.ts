import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Please check your .env file and PRIVATE_KEY variable.");
  }

  console.log("Deploying PlightVerifier with account:", deployer.address);
  
  // PlightVerifier inherits Verifier, so we just deploy PlightVerifier
  const PlightVerifier = await ethers.getContractFactory("PlightVerifier", deployer);
  const plightVerifier = await PlightVerifier.deploy();
  await plightVerifier.waitForDeployment();
  
  console.log(
    `PlightVerifier deployed to: ${await plightVerifier.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
