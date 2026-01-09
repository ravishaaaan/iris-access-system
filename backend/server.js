const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow large payloads

// Contract Configuration
let CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xeC46Cf1ea6DC71B062942d2dE16796526d65Dd6c";
let CONTRACT_ABI;
try {
  // Adjust relative path from backend/ to artifacts/
  const artifact = require('../artifacts/contracts/IrisAccess.sol/IrisAccess.json');
  CONTRACT_ABI = artifact.abi;
} catch (e) {
  console.warn("⚠️ Could not load ABI from artifacts. Falling back to inline ABI.");
  CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_userWallet", "type": "address" },
      { "internalType": "string", "name": "_accessCode", "type": "string" },
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_email", "type": "string" },
      { "internalType": "string", "name": "_phone", "type": "string" },
      { "internalType": "string", "name": "_idNumber", "type": "string" }, // ✅ Added
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
    "inputs": [{ "internalType": "string", "name": "_code", "type": "string" }],
    "name": "validateAccessCode",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_userAddress", "type": "address" }],
    "name": "getUserProfile",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "email", "type": "string" },
          { "internalType": "string", "name": "phone", "type": "string" },
          { "internalType": "string", "name": "idNumber", "type": "string" }, // ✅ Added (Critical Fix)
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
   }
 ];
}

// Setup Provider & Wallet (ADMIN pays gas)
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://rpc-amoy.polygon.technology/");
const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, adminWallet);
// In-memory set to prevent multiple entries with the same QR after bouncer validation
const usedWallets = new Set();

// --- Email Transport (Nodemailer) ---
let mailTransporter;
const ensureTransporter = () => {
  if (mailTransporter) return mailTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP configuration missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM');
  }

  mailTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return mailTransporter;
};

// Helper: Build QR PDF buffer
const buildQrPdf = async ({ name, email, wallet, qrPayload }) => {
  // Generate QR as Data URL
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
    doc.fontSize(12).text('Scan this QR at the venue entrance. This code is single-use.');
    doc.moveDown();

    // Embed QR image
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(qrBase64, 'base64');
    doc.image(qrBuffer, { fit: [250, 250], align: 'center', valign: 'center' });

    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });

    doc.end();
  });
};

console.log("✅ Backend Relayer Started");
console.log("📍 Admin Wallet:", adminWallet.address);
console.log("📄 Contract:", CONTRACT_ADDRESS);

// --- ENDPOINT 1: Validate Access Code (Read-only, no gas) ---
app.post('/api/validate-code', async (req, res) => {
  try {
    const { code } = req.body;
    const isValid = await contract.validateAccessCode(code);
    res.json({ valid: isValid });
  } catch (error) {
    console.error("Validation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINT 2: Register User (Admin pays gas) ---
app.post('/api/register', async (req, res) => {
  try {
    const { accessCode, name, email, phone, idNumber, question, answer, faceHashes, userWallet } = req.body;

    console.log(`📝 Registration Request from: ${userWallet}`);
    console.log(`   Name: ${name}, Code: ${accessCode}`);
    console.log(`   Face Hashes: ${faceHashes.length} samples`);

    // Preflight checks to avoid on-chain reverts
    try {
      const codeOk = await contract.validateAccessCode(accessCode);
      if (!codeOk) {
        return res.status(400).json({ success: false, error: 'Access code invalid or already used' });
      }
    } catch (e) {
      console.warn('validateAccessCode check failed:', e.message);
    }

    // getUserProfile reverts if not found; success implies already registered
    let alreadyRegistered = false;
    try {
      await contract.getUserProfile(userWallet);
      alreadyRegistered = true;
    } catch (_) {
      alreadyRegistered = false;
    }
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, error: 'Wallet already registered' });
    }

    // Reduce hash data to prevent gas overflow
    // Keep only 10 samples (2 per step) instead of 50
    const reducedHashes = [];
    for (let i = 0; i < faceHashes.length; i += 5) {
      reducedHashes.push(faceHashes[i]);
    }
    console.log(`   Reduced to: ${reducedHashes.length} hashes`);

    // Submit transaction (ADMIN PAYS GAS)
    const tx = await contract.registerUser(
      userWallet,      // USER'S wallet address
      accessCode,
      name,
      email,
      phone,
      idNumber,
      question,
      answer,
      reducedHashes,
      { gasLimit: 3000000 } // Explicit gas limit
    );

    console.log(`⏳ Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    
    if (receipt.status === 0) {
      throw new Error("Transaction reverted - check contract requirements");
    }
    
    console.log(`✅ Mined in block: ${receipt.blockNumber}`);

    // Send QR PDF email to user
    if (email) {
      try {
        const pdfBuffer = await buildQrPdf({ name, email, wallet: userWallet, qrPayload: userWallet });
        const transporter = ensureTransporter();

        await transporter.sendMail({
          from: `"Secure Access" <${process.env.SMTP_FROM}>`,
          to: email,
          subject: 'Your VIP Access QR Pass',
          text: `Hi ${name},\n\nCongratulations! Your biometric profile has been registered on-chain.\n\nAttached is your single-use QR pass for event entry.\n\nWallet: ${userWallet}\n\nKeep this code private and secure.\n\nBest regards,\nIris Access Team`,
          html: `<h2>Welcome to Iris Access, ${name}!</h2><p>Your registration is complete. Present the attached QR code at the event entrance.</p><p><strong>Wallet:</strong> ${userWallet}</p><p>Keep this code secure.</p>`,
          attachments: [
            { filename: 'iris-access-pass.pdf', content: pdfBuffer }
          ],
        });

        console.log(`📧 QR email sent to: ${email}`);
      } catch (emailError) {
        console.error(`⚠️ Email sending failed (registration still successful):`, emailError.message);
        // Don't fail registration if email fails - user is already on-chain
      }
    }

    res.json({ 
      success: true, 
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    });

  } catch (error) {
    console.error("❌ Registration Error:", error);
    res.status(500).json({ 
      error: error.message,
      code: error.code 
    });
  }
});

// --- ENDPOINT 3: Get User Profile (Read-only) ---
app.post('/api/get-profile', async (req, res) => {
  try {
    const { address } = req.body;
    console.log(`📋 Fetching profile for: ${address}`);

    if (usedWallets.has(address.toLowerCase())) {
      console.log(`🚫 Already redeemed: ${address}`);
      return res.status(400).json({ error: 'Already redeemed', exists: false });
    }
    
    const profile = await contract.getUserProfile(address);
    // Ethers v6 lazy-decodes; access fields safely with names when available
    const name = profile.name ?? profile[0];
    const email = profile.email ?? profile[1];
    const phone = profile.phone ?? profile[2];
    const idNumber = profile.idNumber ?? profile[3];
    const question = (profile.securityQuestion ?? profile.question) ?? profile[4];
    const answer = (profile.securityAnswer ?? profile.answer) ?? profile[5];
    const faceHashes = profile.faceHashes ?? profile[6];
    const exists = (profile.isRegistered ?? profile.exists) ?? profile[7];

    console.log(`   User exists: ${exists}`);

    // DON'T mark as redeemed yet - only after full validation completes

    res.json({
      name,
      email,
      phone,
      idNumber,
      question,
      answer,
      faceHashes,
      exists
    });
  } catch (error) {
    console.error("❌ Profile Error:", error.message);
    res.status(500).json({ 
      error: error.message,
      exists: false 
    });
  }
});

// --- ENDPOINT 4: Mark Validation Complete (After bouncer verifies) ---
app.post('/api/mark-validated', async (req, res) => {
  try {
    const { address } = req.body;
    console.log(`✅ Marking as validated: ${address}`);
    
    usedWallets.add(address.toLowerCase());
    
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Mark Validated Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- ENDPOINT 5: Email QR as PDF ---
app.post('/api/send-qr', async (req, res) => {
  try {
    const { email, name, wallet, qrPayload } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const pdfBuffer = await buildQrPdf({ name, email, wallet, qrPayload });
    const transporter = ensureTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Your Iris Access QR Pass',
      text: `Hi ${name || 'guest'},\n\nAttached is your single-use QR pass.\nWallet: ${wallet || 'N/A'}\nKeep this code private.`,
      attachments: [
        { filename: 'iris-pass.pdf', content: pdfBuffer }
      ],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Email Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
