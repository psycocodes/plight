
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Please check your .env file and PRIVATE_KEY variable.");
  }

  const healthPolicyAddress = "0x134519d6f0F249D1c6c938fbbFCa2141daA76140";
  console.log(`Deploying SampleProtocol with policy: ${healthPolicyAddress}`);
  console.log("Deploying with account:", deployer.address);

  const SampleProtocol = await ethers.getContractFactory("SampleProtocol", deployer);
  const sampleProtocol = await SampleProtocol.deploy(healthPolicyAddress);
  await sampleProtocol.waitForDeployment();

  console.log(`SampleProtocol deployed to: ${await sampleProtocol.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
