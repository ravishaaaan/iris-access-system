# Iris Access System - UI Modernization & Bouncer Split Complete ✅

## What's New

### 1. **Tailwind CSS Integration**
- ✅ Installed Tailwind v3.4.14, PostCSS, and Autoprefixer
- ✅ Configured [tailwind.config.js](tailwind.config.js#L1-L26): custom colors (midnight, neon, slate), fonts (Space Grotesk, Inter), glass-morphism shadows
- ✅ Added [postcss.config.js](postcss.config.js)
- ✅ Global styles in [src/index.css](src/index.css#L1-L28): radial gradients, glass-card & pill-btn components

### 2. **Responsive UI Design**
All views now use Tailwind's responsive utilities (mobile-first):
- **Mobile (default)**: Single column, touch-friendly button spacing
- **Tablet (md:)**: 2-column grids where appropriate
- **Desktop (lg:)**: Full multi-column layouts, side panels

#### Redesigned Views:
- **HOME**: Hero section + info card, dual role buttons (Guest/Bouncer), contract info
- **CODE_GATE**: Step badge, input field, unlock button, back link
- **FORM**: 2-col layout (registration form + face biometrics), modal for scanner
- **SUCCESS**: QR code in white card, copy-friendly instructions
- **BOUNCER_HOME**: QR reader grid + workflow description, clean typography
- **BOUNCER_VERIFY (QUESTION)**: Large centered question, private answer box, approve/deny buttons
- **BOUNCER_VERIFY (GRANTED)**: Green success screen with guest name

### 3. **Dedicated Bouncer App (Port 5174)**
- ✅ New [bouncer.html](bouncer.html) entry point
- ✅ [src/main-bouncer.jsx](src/main-bouncer.jsx): Boots App in `mode="bouncer"` + `initialView="BOUNCER_HOME"`
- ✅ [vite.config.js](vite.config.js#L14-L21): Multi-entry build (main + bouncer)
- ✅ New npm script: `npm run dev:bouncer` (opens on port 5174)

**Usage:**
```bash
# Terminal 1: Guest registration on port 5173
npm run dev

# Terminal 2: Bouncer panel on port 5174 (separate process)
npm run dev:bouncer
```

### 4. **Wallet Connect on Both Apps**
- **Guest App (port 5173)**: Connect → Select code → Register face → Get QR
- **Bouncer App (port 5174)**: Connect → Scan guest QR → Verify secret Q → Face match → Grant access
- Both have **Account Switcher** menu (top-right) to test multi-account scenarios
- Refresh button to re-fetch accounts from MetaMask

### 5. **Enhanced Security**
- ✅ [backend/server.js](../backend/server.js#L67-L68,#L169-L189): One-time QR redemption (in-memory `usedWallets` set)
- ✅ [src/App.jsx](src/App.jsx#L742-L784): Face match with distance threshold (MATCH_THRESHOLD = 0.02)
  - Prevents friend's face from passing as owner
  - Compares live vs. stored landmark hashes
  - Must exceed similarity threshold

---

## File Structure

```
client/
├── tailwind.config.js          # Color, font, shadow theme
├── postcss.config.js           # Tailwind processor config
├── bouncer.html                # Bouncer app HTML entry
├── vite.config.js              # Multi-entry build config (main + bouncer)
├── index.html                  # Guest app HTML entry
├── package.json                # Scripts: dev, dev:bouncer, build
├── src/
│   ├── index.css               # @tailwind directives + glass-card component
│   ├── main.jsx                # Guest app entry (App in guest mode)
│   ├── main-bouncer.jsx        # Bouncer app entry (App in bouncer mode)
│   ├── App.jsx                 # Main app (initialView + mode props)
│   ├── components/
│   │   ├── IrisScanner.jsx     # Face scanner (unchanged)
│   │   └── ProgressRing.jsx
│   └── utils/
│       └── ethereum.js         # MetaMask helpers
```

---

## Key Tailwind Classes Used

```javascript
const ui = {
  screen: "min-h-screen flex flex-col items-center justify-center px-4 py-10 text-white",
  card: "glass-card w-full max-w-5xl mx-auto p-6 md:p-10 space-y-6",
  input: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-neon ... placeholder-gray-400",
  primary: "pill-btn bg-gradient-to-r from-cyan-400 to-emerald-300 text-slate-900 shadow-lg hover:shadow-xl",
  badge: "px-3 py-1 rounded-full text-xs bg-white/10 border border-white/10 text-neon",
  ghost: "text-sm text-gray-400 hover:text-white mt-4",
};
```

---

## Start Commands

```bash
# Guest Registration App (Port 5173)
cd client && npm run dev

# Bouncer Check App (Port 5174)
cd client && npm run dev:bouncer

# Backend Relayer (Port 3001)
cd backend && npm start
```

Open:
- **Guest**: http://localhost:5173
- **Bouncer**: http://localhost:5174
- **Backend API**: http://localhost:3001

---

## What Each App Does

### Guest App (5173)
1. Connect MetaMask → Select account
2. Enter VIP code
3. Fill registration form
4. Register face (5 angles)
5. Submit to blockchain (admin pays gas)
6. Get QR code (save/share)

### Bouncer App (5174)
1. Connect MetaMask → Select account
2. Scan guest's QR
3. Verify secret question (shown only to bouncer)
4. Request guest to face scan
5. Compare face landmarks vs. on-chain record
6. Grant/deny access

---

## Testing Scenario

**Setup:**
- Generate 3 codes: `npx hardhat run scripts/generateCodes.js --network amoy`
- Start backend: `cd backend && npm start`
- Start guest app: `npm run dev` (port 5173)
- Start bouncer app: `npm run dev:bouncer` (port 5174)

**Flow:**
1. Guest 1 registers with code + face → Gets QR
2. Guest 2 registers with different code + face → Gets different QR
3. Bouncer scans Guest 1's QR (one-time only)
   - Guest 1 face passes ✅
   - Guest 2 face fails ✗ (different landmarks)
4. Bouncer tries scanning same QR again → "Already redeemed" error

---

## Notes

- **In-memory redemption**: Resets on backend restart. For production, store in DB/contract.
- **Responsive design**: Test on mobile (375px), tablet (768px), desktop (1024px+)
- **Wallet sync**: Both apps share MetaMask state via window.ethereum events
- **Face scanner**: 5-step guided capture with real-time pose detection
- **Modern aesthetics**: Glass-morphism cards, neon accent, gradient buttons, smooth transitions

---

## Next Steps (Optional)

- Persist used wallets to a database or contract state
- Add rate limiting on `/api/get-profile` to prevent brute-force
- Deploy to Vercel (guest) and Netlify (bouncer) on separate domains
- Add analytics to bouncer app for access logs
- Integrate push notifications for access events
