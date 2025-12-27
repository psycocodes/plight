
import { ethers } from "hardhat";

async function main() {
  const verifierAddress = "0xbFf9Db6E903686B78C9B4fe311a5797573Bd9DBb";
  console.log(`Deploying HealthPolicy with verifier: ${verifierAddress}`);

  const healthPolicy = await ethers.deployContract("HealthPolicy", [verifierAddress]);
  await healthPolicy.waitForDeployment();

  console.log(`HealthPolicy deployed to: ${await healthPolicy.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
