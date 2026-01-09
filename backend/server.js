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
const buildQrPdf = async ({ name, email, wallet, qrPayload }) => {
  // Generate a high-resolution QR as Data URL (larger width for crisp printing)
  const qrDataUrl = await QRCode.toDataURL(qrPayload || wallet, {
    width: 1024,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill('#0b0f14');

    // Card (luxury panel)
    const cardWidth = 420;
    const cardHeight = 560;
    const cardX = (pageWidth - cardWidth) / 2;
    const cardY = (pageHeight - cardHeight) / 2;

    // subtle shadow
    doc.save();
    doc.roundedRect(cardX + 6, cardY + 8, cardWidth, cardHeight, 14).fillOpacity(0.12).fill('#000000');
    doc.restore();

    // main card
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 14).fill('#0f1720');

    // gold frame
    doc.roundedRect(cardX + 8, cardY + 8, cardWidth - 16, cardHeight - 16, 10)
       .lineWidth(3)
       .strokeColor('#D4AF37')
       .stroke();

    // Header
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold');
    doc.text('Iris Access Pass', cardX + 24, cardY + 22, { align: 'left' });

    // Subtitle / small details
    doc.fontSize(10).fillColor('#cbd5e1').font('Helvetica');
    doc.text(`${name || 'Guest'}`, cardX + 24, cardY + 50);
    doc.moveTo(cardX + 24, cardY + 74);

    // Draw white rounded box for QR (to ensure crisp scan against dark card)
    const qrBoxSize = 340;
    const qrBoxX = cardX + (cardWidth - qrBoxSize) / 2;
    const qrBoxY = cardY + 92;

    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 12).fill('#ffffff');

    // Embed QR image centered inside qrBox
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(qrBase64, 'base64');
    // leave padding inside white box
    const innerPadding = 28;
    const imgSize = qrBoxSize - innerPadding * 2;
    const imgX = qrBoxX + innerPadding;
    const imgY = qrBoxY + innerPadding;
    doc.image(qrBuffer, imgX, imgY, { width: imgSize, height: imgSize });

    // Bottom text: wallet and instructions
    doc.fillColor('#e2e8f0').fontSize(11).font('Helvetica');
    const infoY = qrBoxY + qrBoxSize + 18;
    doc.text('Present this QR at the venue entrance — single-use only.', cardX + 28, infoY, { width: cardWidth - 56, align: 'center' });

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fillColor('#ffffff').fontSize(10);
    doc.text(`Wallet: ${wallet || 'N/A'}`, cardX + 28, infoY + 36, { width: cardWidth - 56, align: 'center' });

    // Footer timestamp and small brand
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica');
    doc.text(`Generated: ${new Date().toISOString()}`, cardX + 28, cardY + cardHeight - 36, { align: 'left' });
    doc.fontSize(9).fillColor('#D4AF37').font('Helvetica-Bold');
    doc.text('Iris Access', cardX + 28, cardY + cardHeight - 36, { align: 'right', width: cardWidth - 56 });

    doc.end();
  });

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