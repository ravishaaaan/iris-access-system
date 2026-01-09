const hre = require("hardhat");
const crypto = require("crypto"); // Built-in Node.js security module

async function main() {
  // 🔴 STEP 1: PASTE YOUR REAL CONTRACT ADDRESS HERE 🔴
  const CONTRACT_ADDRESS = "0xd91FC643019f2f397F79157B3b1DAef7B9b62D84"; 

  // Validation: Check if address is valid before running
  if (!CONTRACT_ADDRESS.startsWith("0x") || CONTRACT_ADDRESS.length !== 42) {
    throw new Error("❌ Invalid Contract Address! Please paste the real address in scripts/generateCodes.js");
  }

  const IrisAccess = await hre.ethers.getContractAt("IrisAccess", CONTRACT_ADDRESS);

  // 🔴 STEP 2: Generate Cryptographically Secure Random Codes
  // These look like: "a1b2c3d4e5f67890", "f4e3d2c1b0a98765"
  const generateSecureCode = () => crypto.randomBytes(8).toString('hex');

  const newCodes = [
    generateSecureCode(),
    generateSecureCode(),
    generateSecureCode()
  ];

  console.log("------------------------------------------------");
  console.log("🔐 Generated Unpredictable Access Codes:");
  console.log(newCodes);
  console.log("------------------------------------------------");
  console.log("Uploading to Blockchain...");

  // 3. Upload to Blockchain
  const tx = await IrisAccess.addAccessCodes(newCodes);
  await tx.wait();
  
  console.log("✅ Codes are live! Send ONE code to each user.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });