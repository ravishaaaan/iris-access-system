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

// --- EMAIL CONFIGURATION ---
const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT) || 465;
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    debug: true, // Enable debug logging
    logger: true // Enable logger
  };

  console.log(`📧 Email Config: ${config.host}:${config.port} (user: ${config.auth.user})`);
  return nodemailer.createTransport(config);
};

// Verify email configuration on startup
const transporter = createTransporter();
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error.message);
    console.log('⚠️  Email sending will be disabled. Check your SMTP settings.');
  } else {
    console.log('✅ Email server is ready');
  }
});

// --- CONTRACT SETUP ---
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
  const qrDataUrl = await QRCode.toDataURL(qrPayload || wallet, {
    width: 1024,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
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

    // Card design
    const cardWidth = 420;
    const cardHeight = 560;
    const cardX = (pageWidth - cardWidth) / 2;
    const cardY = (pageHeight - cardHeight) / 2;

    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 14).fill('#0f1720');
    doc.roundedRect(cardX + 8, cardY + 8, cardWidth - 16, cardHeight - 16, 10).lineWidth(3).strokeColor('#D4AF37').stroke();

    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold');
    doc.text('Iris Access Pass', cardX + 24, cardY + 22, { align: 'left' });

    doc.fontSize(10).fillColor('#cbd5e1').font('Helvetica');
    doc.text(`${name || 'Guest'}`, cardX + 24, cardY + 50);

    const qrBoxSize = 340;
    const qrBoxX = cardX + (cardWidth - qrBoxSize) / 2;
    const qrBoxY = cardY + 92;
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 12).fill('#ffffff');

    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(qrBase64, 'base64');
    doc.image(qrBuffer, qrBoxX + 28, qrBoxY + 28, { width: qrBoxSize - 56, height: qrBoxSize - 56 });

    const infoY = qrBoxY + qrBoxSize + 18;
    doc.fillColor('#e2e8f0').fontSize(11).font('Helvetica');
    doc.text('Present this QR at the venue entrance — single-use only.', cardX + 28, infoY, { width: cardWidth - 56, align: 'center' });
    
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fillColor('#ffffff').fontSize(10);
    doc.text(`Wallet: ${wallet || 'N/A'}`, cardX + 28, infoY + 36, { width: cardWidth - 56, align: 'center' });

    doc.end();
  });
};

// --- EMAIL SENDER ---
const sendAccessPassEmail = async ({ name, email, wallet }) => {
  try {
    console.log(`📧 Sending email to: ${email}`);
    
    const pdfBuffer = await buildQrPdf({ name, email, wallet, qrPayload: wallet });
    
    const mailOptions = {
      from: process.env.SMTP_FROM || `"Iris Access" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🎫 Your Iris Access Pass',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎫 Iris Access Pass</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Hi <strong>${name}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Your registration is complete! 🎉 Your access pass is attached to this email as a PDF.
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                <strong>Wallet Address:</strong>
              </p>
              <p style="margin: 0; color: #1f2937; font-family: 'Courier New', monospace; font-size: 13px; word-break: break-all;">
                ${wallet}
              </p>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⚠️ <strong>Important:</strong> This QR code is single-use only. Present it at the venue entrance.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Powered by Iris Access System</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `iris-pass-${wallet.slice(0, 8)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error(`❌ Email Error:`, error.message);
    // Return error but don't throw - registration should still succeed
    return { success: false, error: error.message };
  }
};

console.log("✅ Backend Started");
console.log("📍 Contract:", CONTRACT_ADDRESS);

// --- ENDPOINTS ---

// 1. Download PDF
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

// 2. REGISTER USER (WITH EMAIL RESTORED)
app.post('/api/register', async (req, res) => {
  try {
    const { accessCode, name, email, phone, idNumber, question, answer, faceHashes, userWallet } = req.body;
    console.log(`📝 Registering: ${name} (${userWallet})`);

    // Pre-flight check
    try {
        const existing = await contract.getUserProfile(userWallet);
        const isReg = (existing.isRegistered ?? existing.exists) ?? existing[7];
        if (isReg) return res.status(400).json({ success: false, error: 'Wallet already registered' });
    } catch (e) { /* continue */ }

    const reducedHashes = faceHashes.filter((_, i) => i % 5 === 0);

    const tx = await contract.registerUser(
      userWallet, accessCode, name, email, phone, idNumber, question, answer, reducedHashes,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ TX Sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Mined in Block: ${receipt.blockNumber}`);

    // Send email with PDF (non-blocking - registration succeeds even if email fails)
    const emailResult = await sendAccessPassEmail({ name, email, wallet: userWallet });
    
    if (!emailResult.success) {
      console.warn(`⚠️  Registration successful but email failed: ${emailResult.error}`);
    }
    
    res.json({ 
      success: true, 
      txHash: tx.hash,
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : emailResult.error
    });
    
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
        return res.json({ exists: false });
    }

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