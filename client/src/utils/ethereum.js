import { ethers } from "ethers";

// 1. PASTE YOUR CONTRACT ADDRESS HERE
const CONTRACT_ADDRESS = "0xd91FC643019f2f397F79157B3b1DAef7B9b62D84"; 

// 2. The ABI (The Interface)
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "string", "name": "code", "type": "string" }
    ],
    "name": "CodeBurned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "userWallet", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" }
    ],
    "name": "UserRegistered",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string[]", "name": "_codes", "type": "string[]" }
    ],
    "name": "addAccessCodes",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_userAddress", "type": "address" }
    ],
    "name": "getUserProfile",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "email", "type": "string" },
          { "internalType": "string", "name": "phone", "type": "string" },
          { "internalType": "string", "name": "idNumber", "type": "string" }, // <--- THIS WAS MISSING
          { "internalType": "string", "name": "securityQuestion", "type": "string" },
          { "internalType": "string", "name": "securityAnswer", "type": "string" },
          { "internalType": "string[]", "name": "faceHashes", "type": "string[]" },
          { "internalType": "bool", "name": "isRegistered", "type": "bool" }
        ],
        "internalType": "struct IrisAccess.UserProfile",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_accessCode", "type": "string" },
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_email", "type": "string" },
      { "internalType": "string", "name": "_phone", "type": "string" },
      { "internalType": "string", "name": "_idNumber", "type": "string" },
      { "internalType": "string", "name": "_question", "type": "string" },
      { "internalType": "string", "name": "_answer", "type": "string" },
      { "internalType": "string[]", "name": "_faceHashes", "type": "string[]" }
    ],
    "name": "registerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_code", "type": "string" }
    ],
    "name": "validateAccessCode",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const AMOY_CHAIN_ID = "0x13882"; // Hex for 80002

// Helper: Force Network Switch
const switchNetwork = async () => {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AMOY_CHAIN_ID }],
    });
  } catch (error) {
    // This error code means the chain has not been added to MetaMask
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: AMOY_CHAIN_ID,
            chainName: "Polygon Amoy Testnet",
            rpcUrls: ["https://rpc-amoy.polygon.technology/"],
            nativeCurrency: {
              name: "MATIC",
              symbol: "MATIC",
              decimals: 18,
            },
            blockExplorerUrls: ["https://www.oklink.com/amoy"],
          },
        ],
      });
    }
  }
};

export const getContract = async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    return null;
  }

  // 1. Force Network Switch to Amoy
  await switchNetwork();

  // 2. Connect Wallet
  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  // 3. Return Contract
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};