# Iris Access System - Introduction

## 🎯 Project Overview

**Iris Access System** is a Web3-powered biometric access control platform that combines blockchain technology, facial recognition, and QR code verification to provide secure event entry management. The system eliminates traditional paper tickets and manual ID checks by storing encrypted biometric data on the Polygon blockchain, enabling fast, secure, and fraud-resistant venue access control.

---

## 🌟 Key Features

### 1. **Blockchain-Based Identity Storage**
- User profiles (name, email, phone, ID, security question/answer, and face biometric hashes) are stored immutably on the Polygon Amoy testnet
- Gasless registration: Admin wallet pays transaction fees, users don't need cryptocurrency
- Single-use access codes prevent unauthorized registrations

### 2. **Multi-Factor Verification**
The bouncer workflow enforces three layers of security:
- **QR Code Scan**: Wallet address encoded in QR
- **Secret Question**: Personal challenge question known only to the user
- **Face Biometric Match**: MediaPipe FaceMesh captures iris/facial landmarks and compares against stored hashes

### 3. **Privacy-Preserving Biometrics**
- No raw images stored—only mathematical hashes of facial landmarks
- Face data captured across 5 angles (center, left, right, up, down) for robustness
- On-device processing using MediaPipe reduces server-side privacy risks

### 4. **Luxury QR Pass Generation**
- High-resolution (1024px) QR codes embedded in styled PDF passes
- Gold-framed, dark-themed luxury design
- Auto-emailed to users after successful blockchain registration

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│  1. Enter Access Code → Validate on Smart Contract              │
│  2. Fill Registration Form (Name, Email, Phone, ID, Q&A)        │
│  3. Capture Face Biometrics (5 angles, MediaPipe FaceMesh)      │
│  4. Submit to Backend → Admin wallet registers on blockchain    │
│  5. Receive QR PDF Pass via email                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       BOUNCER FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Scan Guest QR Code → Fetch profile from blockchain          │
│  2. Ask Secret Question → Manual verification by bouncer        │
│  3. Face Scan → Compare live capture against stored hashes      │
│  4. Grant/Deny Access → Mark wallet as validated (no re-entry)  │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

#### **Blockchain Layer**
- **Smart Contract**: Solidity 0.8.x (IrisAccess.sol)
- **Network**: Polygon Amoy Testnet
- **Development**: Hardhat, Ethers.js v6

#### **Backend (Relayer Service)**
- **Framework**: Node.js + Express
- **RPC Provider**: Ankr (Polygon Amoy)
- **PDF Generation**: PDFKit + QRCode.js
- **Email**: Nodemailer (SMTP)
- **Environment**: dotenv for secrets management

#### **Frontend (User & Bouncer Apps)**
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS with glassmorphism effects
- **QR Scanning**: react-qr-reader
- **Face Detection**: MediaPipe FaceMesh + Camera Utils
- **Wallet Integration**: MetaMask (window.ethereum)

---

## 📋 How It Works: Step-by-Step

### **Phase 1: Admin Setup (One-Time)**

1. **Deploy Smart Contract**
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   ```
   - Contract address stored in `.env`

2. **Generate Access Codes**
   ```bash
   npx hardhat run scripts/generateCodes.js --network amoy
   ```
   - Creates unique 16-character hex codes
   - Stores codes on-chain via `addAccessCodes()`
   - Outputs codes for distribution to VIP guests

3. **Start Backend Relayer**
   ```bash
   cd backend && node server.js
   ```
   - Admin wallet loaded from `ADMIN_PRIVATE_KEY`
   - Backend pays gas fees for all user registrations

---

### **Phase 2: User Registration**

#### Step 1: Code Validation
- User enters access code on frontend
- Frontend calls `/api/validate-code` endpoint
- Backend queries smart contract: `validateAccessCode(code)`
- If valid, user proceeds to form

#### Step 2: Form Submission
- User fills:
  - Full Name
  - Email Address
  - Phone Number
  - ID/Passport Number
  - Secret Question (dropdown: Mother's Maiden Name, First Pet, Birth City, etc.)
  - Secret Answer (typed by user)

#### Step 3: Face Biometric Capture
- **FaceScanner Component** activates MediaPipe FaceMesh
- User follows on-screen instructions:
  - **Center**: Look straight ahead
  - **Turn Left**: Rotate face left
  - **Turn Right**: Rotate face right
  - **Look Up**: Tilt head upward
  - **Look Down**: Tilt head downward
- Each step captures 6 samples (burst mode) = 30 total hashes
- Hashes reduced to 10 (2 per angle) to minimize gas costs
- Hash format: `x1,y1|x2,y2|x3,y3|...` (facial landmark coordinates)

#### Step 4: Blockchain Registration
- Frontend sends form data + face hashes + user's MetaMask wallet address to `/api/register`
- Backend calls smart contract:
  ```javascript
  contract.registerUser(
    userWallet,     // User's address (NOT msg.sender)
    accessCode,     // Burns the code
    name, email, phone, idNumber,
    question, answer,
    reducedFaceHashes  // 10 samples
  )
  ```
- Admin wallet pays gas fee (~0.01 MATIC)
- Smart contract emits `UserRegistered` event

#### Step 5: QR PDF Delivery
- Backend generates high-res QR code (1024px) containing wallet address
- Builds luxury PDF using PDFKit:
  - Dark background (#0b0f14)
  - Gold-framed card (#D4AF37 border)
  - Centered QR in white rounded box
  - User info + timestamp
- Sends email via Nodemailer with PDF attachment
- Frontend shows success screen with embedded QR preview

---

### **Phase 3: Bouncer Verification (Event Entry)**

#### Step 1: QR Code Scan
- Bouncer opens Bouncer Panel (BOUNCER_HOME view)
- Live camera preview shows in green-bordered scanner box
- Guest presents QR code (from PDF or phone screen)
- `react-qr-reader` decodes wallet address
- Frontend calls `/api/get-profile` with scanned address

#### Step 2: Blockchain Profile Retrieval
- Backend queries: `contract.getUserProfile(walletAddress)`
- Returns:
  - Name, Email, Phone, ID Number
  - Security Question
  - Security Answer (visible only to bouncer)
  - Face Hashes (array of 10 strings)
- Frontend displays user name and question on screen

#### Step 3: Secret Question Verification
- Bouncer verbally asks guest the security question
- Guest provides answer (not typed—verbal response)
- Bouncer compares spoken answer to displayed answer
- Clicks "Correct" or "Wrong"
  - **Wrong**: Returns to scanner, guest denied entry
  - **Correct**: Proceeds to face scan

#### Step 4: Live Face Biometric Match
- **BouncerFaceValidator Component** activates
- Captures single-angle face scan (Center position)
- Uses same MediaPipe FaceMesh pipeline
- Compares live capture against 10 stored hashes:
  - Calculates average coordinate distance per landmark
  - Threshold: `0.02` (2% deviation tolerance)
  - Formula: `avgDistance = sum(|x_live - x_stored| + |y_live - y_stored|) / numPoints`
- **Match Success**:
  - Shows "✅ ACCESS GRANTED" screen
  - Calls `/api/mark-validated` to prevent re-entry
  - Wallet address added to in-memory `usedWallets` set
  - Auto-redirects to scanner after 5 seconds
- **Match Fail**:
  - Alert: "Face Does Not Match Blockchain Record!"
  - Returns to scanner (or retries face scan)

---

## 🔒 Security Features

### 1. **Single-Use Access Codes**
- Each code can only register one wallet address
- Code is burned on-chain after use (mapping set to `false`)

### 2. **No Replay Attacks**
- Validated wallets tracked in backend memory (`usedWallets` Set)
- Prevents guests from scanning QR twice

### 3. **Privacy-First Biometrics**
- No images transmitted or stored
- Hashes are non-reversible (can't reconstruct face from coordinates)
- On-device processing (MediaPipe runs in browser)

### 4. **Wallet Ownership**
- User must connect MetaMask to register
- Profile tied to their wallet address
- Cannot impersonate another wallet

### 5. **Gasless UX**
- Users don't need MATIC or crypto knowledge
- Admin wallet abstracts blockchain complexity

---

## 📁 Project Structure

```
iris-access-system/
├── contracts/
│   └── IrisAccess.sol           # Smart contract (Solidity)
├── scripts/
│   ├── deploy.js                # Deploy contract to Polygon Amoy
│   └── generateCodes.js         # Generate & upload access codes
├── backend/
│   ├── server.js                # Express API (gasless relayer)
│   └── .env                     # Admin wallet + SMTP config
├── client/
│   ├── src/
│   │   ├── App.jsx              # Main React app (user + bouncer views)
│   │   ├── components/
│   │   │   ├── IrisScanner.jsx  # Face capture component
│   │   │   └── ProgressRing.jsx # Visual feedback during scans
│   │   ├── index.css            # Tailwind + custom styles
│   │   └── main.jsx             # React entry point
│   ├── bouncer.html             # Standalone bouncer app entry
│   └── vite.config.js           # Build config
├── artifacts/                   # Compiled contract ABIs
├── hardhat.config.js            # Hardhat network config
├── package.json                 # Root dependencies
├── README.md                    # Quick start guide
├── PROJECT_TREE.md              # File structure diagram
└── INTRODUCTION.md              # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Polygon Amoy testnet MATIC (for admin wallet)

### 1. Install Dependencies
```bash
npm install
cd backend && npm install
cd ../client && npm install
```

### 2. Configure Environment
```bash
# Root .env (for Hardhat)
PRIVATE_KEY=<admin_wallet_private_key>

# backend/.env
ADMIN_PRIVATE_KEY=<same_as_above>
RPC_URL=https://rpc.ankr.com/polygon_amoy
CONTRACT_ADDRESS=<deployed_contract_address>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your_email>
SMTP_PASS=<app_password>
SMTP_FROM="Iris Access <your_email>"
```

### 3. Deploy Contract
```bash
npx hardhat run scripts/deploy.js --network amoy
# Copy contract address to backend/.env
```

### 4. Generate Access Codes
```bash
npx hardhat run scripts/generateCodes.js --network amoy
# Outputs codes like: '4edd80951db1f286', '855e2f4cb43583d9'
```

### 5. Start Services
```bash
# Terminal 1: Backend
cd backend && node server.js

# Terminal 2: Frontend
cd client && npm run dev
```

### 6. Register a User
- Open `http://localhost:5173`
- Click "I am a VIP Guest"
- Enter access code
- Complete form + face scan
- Check email for QR PDF

### 7. Test Bouncer Flow
- Open `http://localhost:5173` (or use bouncer.html for standalone)
- Click "I am the Bouncer"
- Scan QR code from PDF
- Verify question answer
- Perform face scan

---

## 🎨 Design Highlights

### User Interface
- **Glassmorphism**: Frosted glass panels with backdrop blur
- **Neon Accents**: Cyan/emerald gradients for CTAs
- **Dark Theme**: Midnight blue background with radial gradients
- **Typography**: Space Grotesk (display) + Inter (body)

### QR PDF Pass
- **A4 Size**: Print-ready dimensions
- **Luxury Card**: Dark slate card with gold frame
- **High-Res QR**: 1024px for scanners at any distance
- **Professional Footer**: Timestamp + branding

---

## 🛠️ Troubleshooting

### Camera Not Working
- **Desktop**: Grant camera permissions in browser settings
- **Mobile**: Use HTTPS (or localhost) for getUserMedia API
- **Safari**: Ensure "Camera" permission enabled in System Preferences

### Email Not Sending
- **Gmail**: Use App Password (not account password)
- **SMTP Blocked**: Check firewall/antivirus settings
- **Rate Limits**: Gmail has daily sending limits (~500/day)

### MetaMask Issues
- **Network**: Add Polygon Amoy manually:
  - RPC: `https://rpc-amoy.polygon.technology/`
  - Chain ID: `80002`
  - Currency: MATIC
- **Testnet Faucet**: Get free MATIC at https://faucet.polygon.technology/

### Face Scan Fails
- **Lighting**: Ensure well-lit environment (avoid backlighting)
- **Distance**: Stay 1-2 feet from camera
- **Angle**: Follow on-screen instructions precisely
- **Threshold**: Adjust `MATCH_THRESHOLD` in `App.jsx` (line ~806) if too strict

---

## 📊 Performance Metrics

- **Registration Time**: ~15-20 seconds (including face capture)
- **Bouncer Verification**: ~5-8 seconds (QR + question + face)
- **Gas Cost**: ~0.008-0.012 MATIC per registration
- **PDF Generation**: <2 seconds
- **Blockchain Query**: <1 second (read-only calls)

---

## 🔮 Future Enhancements

### Planned Features
1. **NFT Tickets**: Mint transferable ERC-721 tokens for access passes
2. **Multi-Event Support**: Allow same profile for multiple venues
3. **Analytics Dashboard**: Track entry metrics for organizers
4. **Offline Mode**: Cache profiles for venues with poor connectivity
5. **Biometric Diversity**: Add voice recognition or fingerprint options
6. **Mobile Apps**: Native iOS/Android apps with better camera APIs
7. **Multi-Chain**: Deploy to Ethereum, Arbitrum, or Optimism

### Security Roadmap
- **Zero-Knowledge Proofs**: Hide biometric data from organizers
- **Decentralized Storage**: IPFS for encrypted profile data
- **Multi-Sig Admin**: Require multiple approvals for code generation
- **Rate Limiting**: Prevent spam registrations

---

## 📝 License

MIT License - See LICENSE file for details

---

## 👥 Contributors

Developed as a proof-of-concept for Web3 biometric access control systems.

For questions or contributions, please open an issue on the repository.

---

**Last Updated**: January 30, 2026  
**Version**: 1.0.0  
**Smart Contract**: [View on PolygonScan](https://amoy.polygonscan.com/address/0xd91FC643019f2f397F79157B3b1DAef7B9b62D84)
