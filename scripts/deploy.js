const hre = require("hardhat");

async function main() {
  console.log("Deploying contract...");

  // 1. Get the contract factory
  const IrisAccess = await hre.ethers.getContractFactory("IrisAccess");

  // 2. Deploy it
  const irisAccess = await IrisAccess.deploy();

  // 3. Wait for deployment to finish
  await irisAccess.waitForDeployment();

  // 4. Print the address
  const address = await irisAccess.getAddress();
  console.log("Contract deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});