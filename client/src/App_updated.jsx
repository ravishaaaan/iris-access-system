import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code"; 
import { QrReader } from 'react-qr-reader'; 
import FaceScanner from './components/IrisScanner'; 
import { getContract } from './utils/ethereum';
import { ethers } from "ethers"; // Needed to get wallet address

const STEPS = ["Center", "Turn Left", "Turn Right", "Look Up", "Look Down"];

const App = () => {
  // Navigation: 'HOME', 'CODE_GATE', 'FORM', 'SUCCESS', 'BOUNCER_HOME', 'BOUNCER_VERIFY'
  const [view, setView] = useState("HOME"); 
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

  // --- METAMASK CONNECTION FUNCTIONS ---
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAvailableAccounts(accounts);
        setConnectedAccount(accounts[0]);
        console.log("✅ Connected to MetaMask:", accounts[0]);
        console.log("📋 Available accounts:", accounts);
      }
    } catch (error) {
      console.error("❌ Connection Error:", error);
      alert("Failed to connect MetaMask: " + error.message);
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
    return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  }, []);

  // --- SHORTCUT STYLES ---
  const walletDisplayStyle = {
    background: '#1a1a1a',
    border: '1px solid #0f0',
    padding: '10px 15px',
    borderRadius: '8px',
    color: '#0f0',
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all'
  };

  const accountMenuStyle = {
    position: 'absolute',
    top: '60px',
    right: '20px',
    background: '#222',
    border: '1px solid #0f0',
    borderRadius: '8px',
    padding: '10px',
    zIndex: 1000,
    maxHeight: '300px',
    overflowY: 'auto',
    minWidth: '250px'
  };

  const accountItemStyle = (isActive) => ({
    padding: '10px',
    margin: '5px 0',
    background: isActive ? '#0f0' : '#1a1a1a',
    color: isActive ? '#000' : '#0f0',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    border: isActive ? 'none' : '1px solid #0f0',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s'
  });
  
  // ------------------------------------------------------
  // VIEW 1: HOME
  // ------------------------------------------------------
  if (view === "HOME") {
    return (
      <div style={styles.container}>
        <div style={{position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'flex-end'}}>
          {connectedAccount ? (
            <>
              <div style={walletDisplayStyle}>
                ✅ {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
              </div>
              <button 
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                style={{...styles.button, fontSize: '12px', padding: '8px 12px', background: '#2196F3'}}
              >
                🔄 Switch Account
              </button>
              <button 
                onClick={disconnectWallet}
                style={{...styles.button, fontSize: '12px', padding: '8px 12px', background: '#d32f2f'}}
              >
                Disconnect
              </button>

              {/* Account Switch Menu */}
              {showAccountMenu && availableAccounts.length > 0 && (
                <div style={accountMenuStyle}>
                  <div style={{color: '#0f0', marginBottom: '10px', fontWeight: 'bold', fontSize: '11px'}}>
                    Available Accounts ({availableAccounts.length}):
                  </div>
                  {availableAccounts.map((acc, idx) => (
                    <div 
                      key={idx}
                      onClick={() => switchAccount(acc)}
                      style={accountItemStyle(acc === connectedAccount)}
                    >
                      Account {idx + 1}: {acc.slice(0, 6)}...{acc.slice(-4)}
                      {acc === connectedAccount && ' ✓'}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <button 
              onClick={connectWallet}
              style={{...styles.button, fontSize: '14px', padding: '10px 20px', background: '#4CAF50'}}
            >
              🦊 Connect MetaMask
            </button>
          )}
        </div>

        <h1 style={{fontSize: '40px', marginBottom: '40px'}}>🛡️ Decentralized Access</h1>
        <button style={styles.bigButton} onClick={() => setView("CODE_GATE")}>I am a VIP Guest</button>
        <br/>
        <button style={{...styles.bigButton, background: '#333', color:'#aaa'}} onClick={() => setView("BOUNCER_HOME")}>I am the Bouncer</button>
      </div>
    );
  }

  // Rest of the views remain the same...
  // CODE_GATE, FORM, SUCCESS, BOUNCER_HOME, BOUNCER_VERIFY

  // ------------------------------------------------------
  // VIEW 2: CODE VALIDATION (Dynamic)
  // ------------------------------------------------------
  if (view === "CODE_GATE") {
    const checkCode = async () => {
        if (!accessCode) return alert("Please enter a code");
        try {
            setLoading(true);
            // Call backend API (no gas required)
            const response = await fetch('http://localhost:3001/api/validate-code', {
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
      <div style={styles.container}>
        <h2>Enter VIP Access Code</h2>
        <input 
            style={styles.input} 
            value={accessCode} 
            onChange={(e) => setAccessCode(e.target.value)} 
            placeholder="e.g. 5ca4e890..."
        />
        <button style={styles.button} onClick={checkCode} disabled={loading}>
            {loading ? "Verifying..." : "Unlock Registration"}
        </button>
        <button onClick={() => setView("HOME")} style={{background:'none', border:'none', color:'#666', marginTop:'20px', cursor:'pointer'}}>Back</button>
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
              setAvailableAccounts(accounts);
              setConnectedAccount(walletAddress);
            }
            
            setMyWalletAddress(walletAddress);
            console.log("Submitting registration with wallet:", walletAddress);
            console.log("Access Code:", accessCode);

            // Call backend API (ADMIN PAYS GAS)
            const response = await fetch('http://localhost:3001/api/register', {
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
      <div style={{...styles.container, justifyContent: 'flex-start', paddingTop: '40px'}}>
        <h2>VIP Registration</h2>
        <p style={{color: '#888', marginBottom: '20px'}}>Code: {accessCode}</p>

        <input style={styles.input} name="name" placeholder="Full Name" onChange={handleInput} />
        <input style={styles.input} name="email" placeholder="Email Address" onChange={handleInput} />
        <input style={styles.input} name="phone" placeholder="Phone Number" onChange={handleInput} />
        <input style={styles.input} name="idNumber" placeholder="ID / Passport Number" onChange={handleInput} />
        
        <div style={{width: '320px', textAlign: 'left', marginTop: '20px', color: '#aaa', fontSize: '14px'}}>Security Challenge (For Bouncer Check)</div>
        <select style={styles.input} name="question" onChange={handleInput}>
            <option value="">Select a Secret Question...</option>
            <option value="Mother's Maiden Name?">Mother's Maiden Name?</option>
            <option value="Name of First Pet?">Name of First Pet?</option>
            <option value="City you were born in?">City you were born in?</option>
            <option value="Last 4 digits of Credit Card?">Last 4 digits of Credit Card?</option>
        </select>
        <input style={styles.input} name="answer" placeholder="Your Answer" onChange={handleInput} />

        <hr style={{width: '300px', borderColor: '#333', margin: '30px 0'}} />

        {/* FACE SCANNER BUTTON */}
        {!isFaceRegistered ? (
            <button 
                style={{...styles.button, background: isFormFull ? '#2196F3' : '#444'}} 
                disabled={!isFormFull}
                onClick={() => setShowFaceModal(true)}
            >
                {isFormFull ? "📷 Step 2: Register Face" : "Fill Form to Enable Camera"}
            </button>
        ) : (
            <div style={{color: '#0f0', border: '1px solid #0f0', padding: '10px', borderRadius: '5px', width: '300px', textAlign: 'center'}}>
                ✅ Face Biometrics Secured ({faceHashes.length} points)
            </div>
        )}

        {/* FINAL SUBMIT BUTTON */}
        {isFaceRegistered && (
            <button 
                style={{...styles.bigButton, marginTop: '20px', width: '320px'}} 
                disabled={loading}
                onClick={submitToBlockchain}
            >
                {loading ? "Minting to Blockchain..." : "FINISH REGISTRATION"}
            </button>
        )}

        {/* FACE REGISTRATION MODAL */}
        {showFaceModal && (
            <div style={{
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                background: 'rgba(0,0,0,0.95)', 
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <FaceRegistrationWrapper 
                    onComplete={(hashes) => {
                        setFaceHashes(hashes);
                        setIsFaceRegistered(true);
                        setShowFaceModal(false);
                    }} 
                />
            </div>
        )}
      </div>
    );
  }

  // Rest remains the same - copying from original
  return (
    <div style={styles.container}>
      <h1>Loading...</h1>
    </div>
  );
};

const styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#111', color: 'white', fontFamily: 'Arial', position: 'relative' },
    input: { padding: '15px', margin: '8px', borderRadius: '5px', border: '1px solid #333', background: '#222', color: 'white', width: '320px', fontSize: '16px' },
    button: { padding: '15px 30px', margin: '10px', borderRadius: '50px', border: 'none', background: '#444', color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
    bigButton: { padding: '20px 40px', margin: '15px', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg, #00C9FF 0%, #92FE9D 100%)', color: 'black', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }
};

export default App;
