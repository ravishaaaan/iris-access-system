# Iris Access System

**Iris Access System** is a Web3-powered biometric access control platform that combines blockchain technology, facial recognition, and QR code verification to provide secure event entry management. The system stores encrypted biometric data on the Polygon blockchain, enabling fast, secure, and fraud-resistant venue access control.

## Live Application

🌐 **Access the live app:** [https://iris-access-system.vercel.app/](https://iris-access-system.vercel.app/)

**⚠️ Important:** Before using the live application, please open the following link to wake up the Render backend services:
👉 [https://iris-access-system.onrender.com](https://iris-access-system.onrender.com)

**To Get the access to user registration form Use following codes**
- cd53552224ba11ae
- 501adea6fc5b2bf3
- 03e953e6b303c264
- ab97bacb3d18a25c
- 4005088280eac110
- 4855965e0282c2d6
- d7f06853b0ce7fd0
- eea73cb79f7857ff
- a9391c011ef476a3

**Important:** If a code did not work please try another one. if all the codes are not working and yet you need to try the live application, feel free to reach me out.@ravishaaaan. see the demo here : [Youtube](https://youtu.be/vvQcpr1Xocw) 

## Prerequisites

### MetaMask Requirements
- Install [MetaMask](https://metamask.io/) browser extension
- Add the **Polygon Amoy Testnet** to your MetaMask:
  - Network Name: `Polygon Amoy Testnet`
  - RPC URL: `https://rpc-amoy.polygon.technology/`
  - Chain ID: `80002`
  - Currency Symbol: `MATIC`
  - Block Explorer: `https://amoy.polygonscan.com/`
- Get free testnet MATIC from [Polygon Faucet](https://faucet.polygon.technology/)

## Generate Access Codes

To generate access codes for forum registration, run the following command:

```bash
npx hardhat run scripts/generateCodes.js --network amoy
```

This will generate cryptographically secure random access codes and upload them to the blockchain. Share one code with each user to grant them registration access.

## Environment Variables

Create a `.env` file in the root directory with the following parameters:

### For Hardhat (Code Generation)
```env
# Polygon Amoy Network RPC URL
POLYGON_URL=https://rpc-amoy.polygon.technology/

# Admin wallet private key (for deploying and managing codes)
PRIVATE_KEY=your_private_key_here
```

### For Backend Server
```env
# Smart contract address on Polygon Amoy
CONTRACT_ADDRESS=0xd91FC643019f2f397F79157B3b1DAef7B9b62D84

# Polygon Amoy RPC URL
RPC_URL=https://rpc-amoy.polygon.technology/

# Admin wallet private key (for gasless transactions)
ADMIN_PRIVATE_KEY=your_admin_private_key_here

# Server port (optional, defaults to 3001)
PORT=3001
```

## How It Works

1. **Admin generates access codes** using the Hardhat script
2. **Users receive an access code** to register on the platform
3. **Users connect MetaMask** and complete registration with biometric data
4. **System stores encrypted data** on Polygon blockchain
5. **Users receive a QR pass** for venue entry
6. **Bouncers verify identity** using QR scan, security questions, and facial recognition

## Features

- ✅ Blockchain-based identity storage on Polygon Amoy
- ✅ Gasless registration (admin pays gas fees)
- ✅ Multi-factor verification (QR + Security Question + Facial Biometrics)
- ✅ Privacy-preserving biometrics (only hashes stored, no raw images)
- ✅ Luxury QR pass generation
- ✅ Single-use access codes for secure registration
