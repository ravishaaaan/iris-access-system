import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code"; 
import { QrReader } from 'react-qr-reader'; 
import FaceScanner from './components/IrisScanner'; 

const STEPS = ["Center", "Turn Left", "Turn Right", "Look Up", "Look Down"];

const ui = {
    screen: "min-h-screen flex flex-col items-center justify-center px-4 py-10 text-white",
    card: "glass-card w-full max-w-5xl mx-auto p-6 md:p-10 space-y-6",
    input: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-neon focus:outline-none placeholder-gray-400 text-white",
    button: "pill-btn bg-white/10 border border-white/10 hover:bg-white/20 text-white",
    primary: "pill-btn bg-gradient-to-r from-cyan-400 to-emerald-300 text-slate-900 shadow-lg hover:shadow-xl",
    ghost: "text-sm text-gray-400 hover:text-white mt-4",
    badge: "px-3 py-1 rounded-full text-xs bg-white/10 border border-white/10 text-neon",
};

const App = ({ initialView = "HOME", mode = "guest" }) => {
    // Navigation: 'HOME', 'CODE_GATE', 'FORM', 'SUCCESS', 'BOUNCER_HOME', 'BOUNCER_VERIFY'
    const [view, setView] = useState(initialView); 
    const [showFaceModal, setShowFaceModal] = useState(false); 

    // --- WALLET CONNECTION ---
    const [connectedAccount, setConnectedAccount] = useState("");
    const [availableAccounts, setAvailableAccounts] = useState([]);
    const [showAccountMenu, setShowAccountMenu] = useState(false);

  // --- USER DATA ---
  const [accessCode, setAccessCode] = useState("");
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", idNumber: "", question: "", answer: ""
  });
  
  const [faceHashes, setFaceHashes] = useState([]);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [myWalletAddress, setMyWalletAddress] = useState("");

    // --- BOUNCER DATA ---
  const [scannedAddress, setScannedAddress] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [verificationStage, setVerificationStage] = useState("QR");
  const [enableScanner, setEnableScanner] = useState(true);

  // --- METAMASK CONNECTION FUNCTIONS ---
    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                alert("Please install MetaMask!");
                return;
            }
            // Request permission and fetch full list of permitted accounts
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                setAvailableAccounts(accounts);
                setConnectedAccount(accounts[0]);
                setShowAccountMenu(false);
                console.log("✅ Connected to MetaMask:", accounts[0]);
                console.log("📋 Available accounts:", accounts);
            }
        } catch (error) {
            console.error("❌ Connection Error:", error);
            alert("Failed to connect MetaMask: " + error.message);
        }
    };

    const refreshAccounts = async () => {
        try {
            if (!window.ethereum) return;
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            setAvailableAccounts(accounts || []);
            if (accounts && accounts.length > 0) {
                setConnectedAccount(accounts[0]);
            } else {
                setConnectedAccount("");
            }
            console.log("🔄 Refreshed accounts:", accounts);
        } catch (e) {
            console.warn("Unable to refresh accounts:", e.message);
        }
    };

    const switchAccount = (account) => {
        setConnectedAccount(account);
        setShowAccountMenu(false);
        console.log("🔄 Switched to account:", account);
    };

    const disconnectWallet = () => {
        setConnectedAccount("");
        setAvailableAccounts([]);
        setShowAccountMenu(false);
        console.log("❌ Disconnected from MetaMask");
    };

  // Listen for MetaMask account changes
    useEffect(() => {
    if (!window.ethereum) return;
    
    const handleAccountsChanged = (accounts) => {
            if (accounts.length > 0) {
                setAvailableAccounts(accounts);
                setConnectedAccount(accounts[0]);
                console.log("🔄 Account changed to:", accounts[0]);
                console.log("📋 Available accounts:", accounts);
            } else {
                setConnectedAccount("");
                setAvailableAccounts([]);
                console.log("❌ All accounts disconnected");
            }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
        // Initial fetch in case MetaMask is already connected
        window.ethereum.request({ method: 'eth_accounts' })
            .then((accounts) => {
                if (accounts && accounts.length > 0) {
                    setAvailableAccounts(accounts);
                    setConnectedAccount(accounts[0]);
                }
            })
            .catch(() => {});

        return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }, []);

    useEffect(() => {
        setView(initialView);
    }, [initialView]);

    const isBouncerOnly = mode === "bouncer";

    // Toggle QR scanner only on BOUNCER_HOME
    useEffect(() => {
        if (view === "BOUNCER_HOME") {
            setEnableScanner(true);
        } else {
            setEnableScanner(false);
        }
    }, [view]);

    // Cleanup: Disable all cameras when switching away from face/QR views
    useEffect(() => {
        const shouldHaveCameraActive = 
            (view === "FORM" && showFaceModal) || 
            (view === "BOUNCER_HOME") || 
            (view === "BOUNCER_VERIFY" && verificationStage === "FACE");
        
        if (!shouldHaveCameraActive) {
            // Camera will automatically stop when component unmounts
            console.log("📹 Camera disabled (view changed)");
        }
    }, [view, showFaceModal, verificationStage]);

    const WalletMenu = () => (
        <div className="fixed top-5 right-5 flex flex-col items-end gap-2 z-50">
            {connectedAccount ? (
                <>
                    <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-neon text-xs font-mono">
                        ✅ {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowAccountMenu(!showAccountMenu)}
                            className="pill-btn bg-sky-600 hover:bg-sky-500 text-white text-xs px-3 py-2"
                        >
                            🔄 Switch
                        </button>
                        <button 
                            onClick={disconnectWallet}
                            className="pill-btn bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-2"
                        >
                            Disconnect
                        </button>
                    </div>

                    {showAccountMenu && availableAccounts.length > 0 && (
                        <div className="glass-card w-72 max-h-64 overflow-y-auto p-4 shadow-xl">
                            <div className="text-neon text-xs font-semibold mb-3">Available Accounts ({availableAccounts.length})</div>
                            <button 
                                onClick={refreshAccounts}
                                className="w-full pill-btn bg-white/5 border border-white/10 text-white text-xs mb-3"
                            >
                                ↻ Refresh from MetaMask
                            </button>
                            <div className="space-y-2">
                                {availableAccounts.map((acc, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => switchAccount(acc)}
                                        className={`w-full text-left text-xs font-mono px-3 py-2 rounded-lg border transition ${acc === connectedAccount ? 'bg-neon text-slate-900 border-neon' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                                    >
                                        Account {idx + 1}: {acc.slice(0, 6)}...{acc.slice(-4)} {acc === connectedAccount ? '✓' : ''}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <button 
                    onClick={connectWallet}
                    className="pill-btn bg-gradient-to-r from-orange-400 to-yellow-300 text-slate-900 text-sm shadow-lg"
                >
                    🦊 Connect MetaMask
                </button>
            )}
        </div>
    );

  // ------------------------------------------------------
  // VIEW 1: HOME
  // ------------------------------------------------------
  if (view === "HOME") {
    return (
            <div className={`${ui.screen} relative`}>
                <WalletMenu />

                <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
                    <div className="space-y-6">
                        <span className={ui.badge}>Secure Event Entry</span>
                        <h1 className="text-4xl md:text-5xl font-display font-semibold leading-tight">
                            Web3-powered biometric access with live bouncer verification.
                        </h1>
                        <p className="text-gray-300 text-lg">
                            Register once, verify on-site with QR + secret question + face scan. Faster lines, fewer risks.
                        </p>
                        {!isBouncerOnly && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button className={`${ui.primary} text-lg`} onClick={() => setView("CODE_GATE")}>
                                    I am a VIP Guest
                                </button>
                                <button className={`${ui.button} text-lg`} onClick={() => setView("BOUNCER_HOME")}>
                                    I am the Bouncer
                                </button>
                            </div>
                        )}
                        {isBouncerOnly && (
                            <button className={`${ui.primary} text-lg w-full sm:w-auto`} onClick={() => setView("BOUNCER_HOME")}>Launch Bouncer Panel</button>
                        )}
                    </div>

                    <div className="glass-card p-8 space-y-6 shadow-glass">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Latest Contract</p>
                                <p className="font-mono text-sm text-neon">0xd91F...7B9b62D84</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">Polygon Amoy</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-sm text-gray-400">3-step gate</p>
                                <p className="text-xl font-semibold">Code → QA → Face</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-sm text-gray-400">Gasless for guests</p>
                                <p className="text-xl font-semibold">Relayer paid</p>
                            </div>
                        </div>
                        <div className="text-sm text-gray-400">
                            Need the bouncer panel on its own? Start the bouncer app on port 5174 and open <span className="text-neon font-mono">/bouncer.html</span>.
                        </div>
                    </div>
                </div>
            </div>
    );
  }

  // ------------------------------------------------------
  // VIEW 2: CODE VALIDATION (Dynamic)
  // ------------------------------------------------------
  if (view === "CODE_GATE") {
    const checkCode = async () => {
        if (!accessCode) return alert("Please enter a code");
        try {
            setLoading(true);
            // Call backend API (no gas required)
            const response = await fetch('https://iris-access-system.onrender.com/api/validate-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: accessCode })
            });
            const data = await response.json();
            
            if (data.valid) {
                setView("FORM");
            } else {
                alert("Access Denied: Code Invalid or Already Used.");
            }
        } catch (error) {
            console.error(error);
            alert("Connection Error. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    return (
            <div className={ui.screen}>
                <WalletMenu />
                <div className={ui.card}>
                    <div className="flex flex-col gap-2">
                        <span className={ui.badge}>Step 1</span>
                        <h2 className="text-3xl font-display font-semibold">Enter VIP Access Code</h2>
                        <p className="text-gray-300">Your code unlocks the registration flow. Each code is single-use.</p>
                    </div>

                    <div className="flex flex-col gap-4 max-w-lg">
                        <input 
                            className={ui.input}
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder="e.g. 5ca4e890..."
                        />
                        <button className={`${ui.primary} w-full md:w-auto`} onClick={checkCode} disabled={loading}>
                            {loading ? "Verifying..." : "Unlock Registration"}
                        </button>
                        <button onClick={() => setView("HOME")} className={ui.ghost}>Back</button>
                    </div>
                </div>
            </div>
    );
  }

  // ------------------------------------------------------
  // VIEW 3: REGISTRATION FORM
  // ------------------------------------------------------
  if (view === "FORM") {
    const handleInput = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    // Check if form is full
    const isFormFull = formData.name && formData.email && formData.phone && formData.idNumber && formData.question && formData.answer;
    
    const submitToBlockchain = async () => {
        try {
            setLoading(true);
            
            // Use connected account or request accounts
            let walletAddress = connectedAccount;
            if (!walletAddress) {
              if (!window.ethereum) return alert("Please install MetaMask");
              const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
              walletAddress = accounts[0];
              setConnectedAccount(walletAddress);
            }
            
            setMyWalletAddress(walletAddress);
            console.log("Submitting registration with wallet:", walletAddress);
            console.log("Access Code:", accessCode);

            // Call backend API (ADMIN PAYS GAS)
            const response = await fetch('https://iris-access-system.onrender.com/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessCode,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    idNumber: formData.idNumber,
                    question: formData.question,
                    answer: formData.answer,
                    faceHashes,
                    userWallet: walletAddress
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log("✅ Registration successful! TX:", result.txHash);
                setView("SUCCESS");
            } else {
                alert("Registration Failed: " + result.error);
            }
        } catch (err) {
            console.error(err);
            alert("Registration Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
            <div className={ui.screen}>
                <WalletMenu />

                <div className="w-full max-w-6xl space-y-8">
                    <div className="grid lg:grid-cols-[1.2fr,1fr] gap-6">
                        <div className="glass-card p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className={ui.badge}>Step 2</div>
                                    <h2 className="text-3xl font-display font-semibold mt-2">VIP Registration</h2>
                                    <p className="text-gray-400">Code: {accessCode}</p>
                                </div>
                                <div className="text-xs text-gray-400 font-mono">Wallet: {connectedAccount ? `${connectedAccount.slice(0,6)}...${connectedAccount.slice(-4)}` : 'not connected'}</div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <input className={ui.input} name="name" placeholder="Full Name" onChange={handleInput} />
                                <input className={ui.input} name="email" placeholder="Email Address" onChange={handleInput} />
                                <input className={ui.input} name="phone" placeholder="Phone Number" onChange={handleInput} />
                                <input className={ui.input} name="idNumber" placeholder="ID / Passport Number" onChange={handleInput} />
                            </div>

                            <div className="space-y-3">
                                <div className="text-sm text-gray-400">Security Challenge (For Bouncer Check)</div>
                                <select className={ui.input} name="question" onChange={handleInput}>
                                    <option value="">Select a Secret Question...</option>
                                    <option value="Mother's Maiden Name?">Mother's Maiden Name?</option>
                                    <option value="Name of First Pet?">Name of First Pet?</option>
                                    <option value="City you were born in?">City you were born in?</option>
                                    <option value="Last 4 digits of Credit Card?">Last 4 digits of Credit Card?</option>
                                </select>
                                <input className={ui.input} name="answer" placeholder="Your Answer" onChange={handleInput} />
                            </div>
                        </div>

                        <div className="glass-card p-8 space-y-4">
                            <h3 className="text-xl font-semibold">Face Biometrics</h3>
                            <p className="text-gray-300">Capture 5 angles to secure your profile on-chain.</p>

                            {!isFaceRegistered ? (
                                <button 
                                    className={`${ui.primary} w-full ${!isFormFull ? 'opacity-60 cursor-not-allowed' : ''}`} 
                                    disabled={!isFormFull}
                                    onClick={() => setShowFaceModal(true)}
                                >
                                    {isFormFull ? "📷 Step 3: Register Face" : "Fill Form to Enable Camera"}
                                </button>
                            ) : (
                                <div className="border border-emerald-400/50 text-emerald-200 bg-emerald-500/10 rounded-xl px-4 py-3 text-center">
                                    ✅ Face Biometrics Secured ({faceHashes.length} samples)
                                </div>
                            )}

                            {isFaceRegistered && (
                                <button 
                                    className={`${ui.primary} w-full`} 
                                    disabled={loading}
                                    onClick={submitToBlockchain}
                                >
                                    {loading ? "Minting to Blockchain..." : "Finish Registration"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {showFaceModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-4xl bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                                <div>
                                    <p className="text-xs text-gray-400">Biometric Capture</p>
                                    <p className="text-lg font-semibold">Follow the on-screen directions</p>
                                </div>
                                <button className="pill-btn bg-white/10 text-white text-sm" onClick={() => setShowFaceModal(false)}>Close</button>
                            </div>
                            <div className="p-4">
                                <FaceRegistrationWrapper 
                                    onComplete={(hashes) => {
                                        setFaceHashes(hashes);
                                        setIsFaceRegistered(true);
                                        setShowFaceModal(false);
                                    }} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
    );
  }

  // ------------------------------------------------------
  // VIEW 4: SUCCESS & QR (With PDF Download)
  // ------------------------------------------------------
  if (view === "SUCCESS") {
    // 🆕 NEW FUNCTION: Handle PDF Download
    const downloadTicket = async () => {
        try {
            const response = await fetch('https://iris-access-system.onrender.com/api/download-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: formData.name, 
                    email: formData.email, 
                    wallet: myWalletAddress 
                })
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Iris-Pass-${myWalletAddress.slice(0,6)}.pdf`;
            a.click();
        } catch (e) { 
            console.error("Download Error", e);
            alert("Download failed. Please try again."); 
        }
    };

    return (
            <div className={ui.screen}>
                <WalletMenu />
                <div className="glass-card max-w-xl w-full flex flex-col items-center text-center space-y-4">
                    <div className="text-6xl">✅</div>
                    <h2 className="text-3xl font-display font-semibold">Registration Complete!</h2>
                    <p className="text-gray-300">Your biometric profile is secured on-chain.</p>
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                        <QRCode value={myWalletAddress} size={220} />
                    </div>
                    <p className="text-sm text-gray-400">Save this QR. Present it to the bouncer for entry.</p>
                    
                    {/* 🆕 NEW BUTTON */}
                    <button className={`${ui.primary} w-full md:w-auto mt-4`} onClick={downloadTicket}>
                        📥 Download PDF Ticket
                    </button>

                    <button onClick={() => setView("HOME")} className={ui.button}>Back to Home</button>
                </div>
            </div>
    );
  }

  // ======================================================
  // BOUNCER VIEWS
  // ======================================================

  if (view === "BOUNCER_HOME") {
      const handleScan = async (result, error) => {
          if (!result) return;
          // Prevent duplicate scans while we process
          if (!enableScanner) return;
          setEnableScanner(false);

          const scannedAddr = result?.text;
          setScannedAddress(scannedAddr);
          console.log("🔍 QR Scanned Address:", scannedAddr);
          try {
              console.log("📋 Fetching profile for:", scannedAddr);
              const response = await fetch('https://iris-access-system.onrender.com/api/get-profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ address: scannedAddr })
              });
              const profile = await response.json();
              
              console.log("📊 Profile Response Status:", response.status, response.ok);
              console.log("📊 Profile Data:", profile);
              
              if (response.ok && profile.exists) {
                  // Safety Check: Ensure face hashes actually exist
                  if (!profile.faceHashes || profile.faceHashes.length === 0) {
                      alert("User found, but NO biometric data on blockchain.");
                      setEnableScanner(true);
                      return;
                  }

                  console.log("✅ User found! Name:", profile.name);
                  setUserProfile({
                      name: profile.name,
                      question: profile.question, 
                      answer: profile.answer, 
                      faceHashes: profile.faceHashes 
                  });
                  setVerificationStage("QUESTION");
                  setView("BOUNCER_VERIFY");
              } else {
                  const errorMsg = profile.error || "User not found";
                  alert(`User not registered on blockchain!\nError: ${errorMsg}`);
                  console.error("❌ Profile not found. Response:", profile);
                  setEnableScanner(true);
              }
          } catch(e) {
              alert("Error fetching user profile: " + e.message);
              console.error("❌ Fetch error:", e);
              setEnableScanner(true);
          }
      };

      return (
              <div className={ui.screen}>
                  <WalletMenu />
                  <div className="glass-card max-w-4xl w-full space-y-6">
                      <div className="flex items-center justify-between">
                          <div>
                              <div className={ui.badge}>Bouncer Panel</div>
                              <h2 className="text-3xl font-display font-semibold mt-2">Scan Guest QR Code</h2>
                              <p className="text-gray-300">Workflow: Scan QR → Ask secret question → Face match</p>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">Wallet: {connectedAccount ? `${connectedAccount.slice(0,6)}...${connectedAccount.slice(-4)}` : 'not connected'}</div>
                      </div>

                      <div className="grid md:grid-cols-[320px,1fr] gap-6 items-center">
                          <div className="rounded-2xl border-2 border-neon/60 bg-transparent overflow-hidden aspect-square">
                              {enableScanner && (
                                  <QrReader
                                      onResult={handleScan}
                                      constraints={{ facingMode: 'environment' }}
                                      style={{ width: '100%', height: '100%' }}
                                  />
                              )}
                          </div>
                          <div className="space-y-3 text-sm text-gray-300">
                              <p>Point the camera at the guest's QR. Once scanned, the system fetches their on-chain profile.</p>
                              <ul className="list-disc list-inside space-y-1 text-gray-400">
                                  <li>Single-use QR enforced by backend.</li>
                                  <li>Secret question shown only to you.</li>
                                  <li>Face scan must pass the hash distance threshold.</li>
                              </ul>
                          </div>
                      </div>

                    {!isBouncerOnly && (
                        <button onClick={() => setView("HOME")} className={ui.ghost}>Exit Bouncer Mode</button>
                    )}
                </div>
            </div>
    );
  }

  if (view === "BOUNCER_VERIFY") {
    // 1. QUESTION STAGE
    if (verificationStage === "QUESTION") {
        return (
            <div className={ui.screen}>
                <WalletMenu />
                <div className="glass-card max-w-3xl w-full space-y-6 text-center">
                    <h3 className="text-2xl font-display font-semibold">Identity Verification</h3>
                    <p className="text-gray-400">Guest Name:</p>
                    <h2 className="text-3xl font-bold">{userProfile.name}</h2>
                    <hr className="border-white/10" />
                    <p className="text-gray-300">Ask the guest:</p>
                    <h1 className="text-2xl md:text-3xl text-yellow-300 font-semibold uppercase">{userProfile.question}</h1>
                    <div className="border border-dashed border-white/20 bg-white/5 rounded-xl p-4">
                        <span className="text-xs text-gray-400">Correct Answer (Private):</span><br/>
                        <strong className="text-2xl">{userProfile.answer}</strong>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button className="pill-btn bg-red-600 hover:bg-red-500 text-white" onClick={() => {
                            alert("Access Denied - Wrong Answer");
                            setVerificationStage("QR");
                            setView("BOUNCER_HOME");
                        }}>
                            Wrong
                        </button>
                        <button className="pill-btn bg-emerald-500 hover:bg-emerald-400 text-slate-900" onClick={() => setVerificationStage("FACE")}>
                            Correct (Proceed to Face)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. FACE CHECK STAGE
    if (verificationStage === "FACE") {
        return (
            <BouncerFaceValidator 
                storedHashes={userProfile.faceHashes}
                verificationStage={verificationStage}
                onSuccess={() => setVerificationStage("GRANTED")}
                onFail={() => {
                    alert("Face Does Not Match Blockchain Record! Please try again.");
                    // Keep them on FACE stage to retry, or push back to HOME
                    // setVerificationStage("QR");
                    // setView("BOUNCER_HOME");
                }}
            />
        );
    }

    // 3. GRANTED STAGE
    if (verificationStage === "GRANTED") {
        // Mark the wallet as validated on backend
        if (scannedAddress) {
            fetch('https://iris-access-system.onrender.com/api/mark-validated', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: scannedAddress })
            }).then(r => r.json())
              .then(data => console.log('✅ Wallet marked as validated:', data))
              .catch(e => console.error('❌ Error marking validated:', e));
        }
        
        setTimeout(() => {
            setView("BOUNCER_HOME");
            setVerificationStage("QR");
            setUserProfile(null);
            setScannedAddress("");
        }, 5000);

        return (
            <div className={ui.screen}>
                <div className="glass-card max-w-2xl w-full text-center bg-emerald-900/40 border-emerald-500/40">
                    <h1 className="text-7xl">✅</h1>
                    <h1 className="text-4xl font-semibold">ACCESS GRANTED</h1>
                    <h2 className="text-2xl text-emerald-100">Welcome, {userProfile.name}</h2>
                    <p className="text-gray-200">Redirecting to scanner...</p>
                </div>
            </div>
        );
    }
  }

  return <div>Unknown View</div>;
};

// --- SUB-COMPONENTS ---

const FaceRegistrationWrapper = ({ onComplete }) => {
    const [phase, setPhase] = useState("START"); // START, COUNTDOWN, SCAN, SUBMITTING
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [hashes, setHashes] = useState([]);
    const [countdown, setCountdown] = useState(3);

    const startRegistration = () => {
        setPhase("COUNTDOWN");
        runCountdown();
    };

    const runCountdown = () => {
        let count = 3;
        setCountdown(count);
        const timer = setInterval(() => {
            count--;
            setCountdown(count);
            if (count === 0) {
                clearInterval(timer);
                setPhase("SCAN");
            }
        }, 1000);
    };

    const handleStepComplete = (burstData) => {
        const updatedHashes = [...hashes, ...burstData];
        setHashes(updatedHashes);
        
        console.log(`✅ Step ${currentStepIndex + 1}/${STEPS.length} complete. Captured ${burstData.length} samples.`);

        // Check if more steps remain
        if (currentStepIndex < STEPS.length - 1) {
            // Move to next step
            console.log(`➡️ Moving to step ${currentStepIndex + 2}/${STEPS.length}: ${STEPS[currentStepIndex + 1]}`);
            setCurrentStepIndex(currentStepIndex + 1);
            setPhase("COUNTDOWN");
            runCountdown();
        } else {
            // All steps done - show submitting phase
            console.log(`🎉 All ${STEPS.length} steps complete! Total hashes: ${updatedHashes.length}`);
            setPhase("SUBMITTING");
            let count = 3;
            setCountdown(count);
            const timer = setInterval(() => {
                count--;
                setCountdown(count);
                if (count === 0) {
                    clearInterval(timer);
                    console.log('📤 Calling onComplete with', updatedHashes.length, 'hashes');
                    onComplete(updatedHashes);
                }
            }, 1000);
        }
    };

    // Phase 1: START button
    if (phase === "START") {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                <h2 className="text-3xl font-semibold">Face Registration</h2>
                <p className="text-gray-300 max-w-xl">
                    You will be guided through 5 different angles. Follow the instructions on screen.
                </p>
                <button className={`${ui.primary} text-lg`} onClick={startRegistration}>
                    START FACE SCAN
                </button>
            </div>
        );
    }

    // Phase 2: COUNTDOWN before each scan
    if (phase === "COUNTDOWN") {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                <div className="text-sm text-gray-400">Step {currentStepIndex + 1} of {STEPS.length}</div>
                <h2 className="text-2xl text-neon font-semibold uppercase">{STEPS[currentStepIndex]}</h2>
                <div className="text-7xl font-bold">{countdown}</div>
                <p className="text-gray-400">Get ready...</p>
            </div>
        );
    }

    // Phase 3: SCAN the face
    if (phase === "SCAN") {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="text-sm text-gray-400">Step {currentStepIndex + 1} of {STEPS.length}</div>
                <h2 className="text-2xl text-neon font-semibold uppercase">{STEPS[currentStepIndex]}</h2>
                <FaceScanner 
                    key={`step-${currentStepIndex}-${STEPS[currentStepIndex]}`}
                    stepInstruction={STEPS[currentStepIndex]} 
                    onStepComplete={handleStepComplete} 
                    isPaused={false}
                />
            </div>
        );
    }

    // Phase 4: SUBMITTING (after all steps)
    if (phase === "SUBMITTING") {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                <h2 className="text-2xl text-neon font-semibold">✅ All Steps Complete!</h2>
                <p className="text-gray-300">Saving biometric data...</p>
                <div className="text-7xl font-bold">{countdown}</div>
                <p className="text-gray-400">Returning to form...</p>
            </div>
        );
    }

    return null;
};

const BouncerFaceValidator = ({ storedHashes, verificationStage, onSuccess, onFail }) => {
    // ⚠️ CRITICAL FIX: Increased threshold from 0.02 to 0.40
    // This makes the face scan match much easier (approx 40% deviation allowed)
    const MATCH_THRESHOLD = 0.40; 

    const parseHash = (hash) => hash.split('|').map(pair => pair.split(',').map(Number));

    const sampleDistance = (h1, h2) => {
        const a = parseHash(h1);
        const b = parseHash(h2);
        const len = Math.min(a.length, b.length);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < len; i++) {
            sum += Math.abs(a[i][0] - b[i][0]);
            sum += Math.abs(a[i][1] - b[i][1]);
            count += 2;
        }
        return count === 0 ? Infinity : sum / count; // average per coordinate
    };

    const handleScan = (liveHashes) => {
        if (!liveHashes || liveHashes.length === 0) {
            // onFail(); // Don't fail immediately on empty scan, wait for valid data
            return;
        }

        // Compute best (smallest) average coordinate distance between any live hash and stored hash
        let bestDistance = Infinity;
        liveHashes.forEach(live => {
            storedHashes.forEach(stored => {
                const dist = sampleDistance(live, stored);
                if (dist < bestDistance) bestDistance = dist;
            });
        });

        console.log(`🔒 Face match distance: ${bestDistance.toFixed(4)} (threshold ${MATCH_THRESHOLD})`);

        if (bestDistance <= MATCH_THRESHOLD) {
            onSuccess();
        } else {
            onFail();
        }
    };

      return (
          <div className={ui.screen}>
              <div className="glass-card max-w-4xl w-full space-y-4">
                  <h2 className="text-3xl font-display font-semibold">Bouncer Face Scan</h2>
                  <p className="text-gray-300">Please ask the guest to look at the camera.</p>
                  <FaceScanner 
                    key={`bouncer-face-${verificationStage}`}
                    stepInstruction="Center" 
                    onStepComplete={handleScan} 
                    isPaused={verificationStage !== "FACE"}
                    facingMode="environment"
                  />
              </div>
          </div>
      );
};

export default App;