
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Please check your .env file and PRIVATE_KEY variable.");
  }

  const verifierAddress = "0xEE61c1485f1617C69662a145da6A3d7dAD624c59";
  console.log(`Deploying HealthPolicy with verifier: ${verifierAddress}`);
  console.log("Deploying with account:", deployer.address);

  const HealthPolicy = await ethers.getContractFactory("HealthPolicy", deployer);
  const healthPolicy = await HealthPolicy.deploy(verifierAddress);
  await healthPolicy.waitForDeployment();

  console.log(`HealthPolicy deployed to: ${await healthPolicy.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
