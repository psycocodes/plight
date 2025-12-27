
import { ethers } from "hardhat";

async function main() {
  const healthPolicyAddress = "0xAEA25aC258D5e24A3AD1214F0D6Be984e0AA663A";
  console.log(`Deploying SampleProtocol with policy: ${healthPolicyAddress}`);

  const sampleProtocol = await ethers.deployContract("SampleProtocol", [healthPolicyAddress]);
  await sampleProtocol.waitForDeployment();

  console.log(`SampleProtocol deployed to: ${await sampleProtocol.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
