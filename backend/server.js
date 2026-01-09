const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); 

// --- CONTRACT SETUP ---
// Ensure this matches your latest deployed address
let CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xd91FC643019f2f397F79157B3b1DAef7B9b62D84";
let CONTRACT_ABI;
try {
  const artifact = require('../artifacts/contracts/IrisAccess.sol/IrisAccess.json');
  CONTRACT_ABI = artifact.abi;
} catch (e) {
  console.warn("⚠️ Using Inline ABI");
  CONTRACT_ABI = [
    {
      "inputs": [{ "internalType": "address", "name": "_userWallet", "type": "address" }, { "internalType": "string", "name": "_accessCode", "type": "string" }, { "internalType": "string", "name": "_name", "type": "string" }, { "internalType": "string", "name": "_email", "type": "string" }, { "internalType": "string", "name": "_phone", "type": "string" }, { "internalType": "string", "name": "_idNumber", "type": "string" }, { "internalType": "string", "name": "_question", "type": "string" }, { "internalType": "string", "name": "_answer", "type": "string" }, { "internalType": "string[]", "name": "_faceHashes", "type": "string[]" }],
      "name": "registerUser",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "string", "name": "_code", "type": "string" }],
      "name": "validateAccessCode",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "_userAddress", "type": "address" }],
      "name": "getUserProfile",
      "outputs": [{ "components": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "string", "name": "email", "type": "string" }, { "internalType": "string", "name": "phone", "type": "string" }, { "internalType": "string", "name": "idNumber", "type": "string" }, { "internalType": "string", "name": "securityQuestion", "type": "string" }, { "internalType": "string", "name": "securityAnswer", "type": "string" }, { "internalType": "string[]", "name": "faceHashes", "type": "string[]" }, { "internalType": "bool", "name": "isRegistered", "type": "bool" }], "internalType": "struct IrisAccess.UserProfile", "name": "", "type": "tuple" }],
      "stateMutability": "view",
      "type": "function"
    }
  ];
}

// Use Ankr RPC for stability
const RPC_URL = process.env.RPC_URL || "https://rpc.ankr.com/polygon_amoy"; 
const provider = new ethers.JsonRpcProvider(RPC_URL);
const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, adminWallet);
const usedWallets = new Set();

// --- PDF GENERATOR ---
const buildQrPdf = async ({ name, email, wallet, qrPayload }) => {
  const qrDataUrl = await QRCode.toDataURL(qrPayload || wallet);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).text('Iris Access Pass', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Name: ${name || 'Guest'}`);
    doc.text(`Email: ${email || 'N/A'}`);
    doc.text(`Wallet: ${wallet || 'N/A'}`);
    doc.moveDown();
    doc.image(Buffer.from(qrDataUrl.split(',')[1], 'base64'), { fit: [250, 250], align: 'center' });
    doc.end();
  });
};

console.log("✅ Backend Started");
console.log("📍 Contract:", CONTRACT_ADDRESS);

// --- ENDPOINTS ---

// 1. NEW ENDPOINT: Download PDF Directly
app.post('/api/download-qr', async (req, res) => {
    try {
        const { name, email, wallet } = req.body;
        console.log(`📥 Generating PDF download for: ${name}`);
        const pdfBuffer = await buildQrPdf({ name, email, wallet, qrPayload: wallet });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=iris-pass-${wallet.slice(0,6)}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF Error:", error);
        res.status(500).send("Error generating PDF");
    }
});

app.post('/api/validate-code', async (req, res) => {
  try {
    const isValid = await contract.validateAccessCode(req.body.code);
    res.json({ valid: isValid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { accessCode, name, email, phone, idNumber, question, answer, faceHashes, userWallet } = req.body;
    console.log(`📝 Registering: ${name} (${userWallet})`);

    // Check if already registered (Pre-flight)
    try {
        const existing = await contract.getUserProfile(userWallet);
        const isReg = (existing.isRegistered ?? existing.exists) ?? existing[7];
        if (isReg) return res.status(400).json({ success: false, error: 'Wallet already registered' });
    } catch (e) { /* continue */ }

    const reducedHashes = faceHashes.filter((_, i) => i % 5 === 0);
    console.log(`   Hashes: ${reducedHashes.length}`);

    const tx = await contract.registerUser(
      userWallet, accessCode, name, email, phone, idNumber, question, answer, reducedHashes,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ TX Sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Mined in Block: ${receipt.blockNumber}`);

    // Skip email logic since we have the download button now
    // This avoids the timeout error appearing in logs

    res.json({ success: true, txHash: tx.hash });
  } catch (error) {
    if (error.message.includes("Wallet already registered")) {
        return res.status(400).json({ success: false, error: 'Wallet already registered' });
    }
    console.error("❌ Registration Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get-profile', async (req, res) => {
  try {
    const { address } = req.body;
    console.log(`📋 Fetching profile: ${address}`);

    if (usedWallets.has(address.toLowerCase())) {
        console.log(`🚫 Already redeemed`);
        return res.status(400).json({ error: 'Access already redeemed', exists: false });
    }

    const profile = await contract.getUserProfile(address);
    const exists = (profile.isRegistered ?? profile.exists) ?? profile[7];
    
    if (!exists) {
        console.log("⚠️ User not found on blockchain");
        return res.json({ exists: false });
    }

    // CRITICAL: Ensure we actually return data!
    console.log("✅ User found:", profile.name ?? profile[0]);
    
    res.json({
      name: profile.name ?? profile[0],
      email: profile.email ?? profile[1],
      phone: profile.phone ?? profile[2],
      idNumber: profile.idNumber ?? profile[3],
      question: (profile.securityQuestion ?? profile.question) ?? profile[4],
      answer: (profile.securityAnswer ?? profile.answer) ?? profile[5],
      faceHashes: profile.faceHashes ?? profile[6],
      exists: true
    });
  } catch (error) {
    console.error("❌ Profile Error:", error.message);
    res.status(500).json({ error: error.message, exists: false });
  }
});

app.post('/api/mark-validated', async (req, res) => {
  usedWallets.add(req.body.address.toLowerCase());
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));