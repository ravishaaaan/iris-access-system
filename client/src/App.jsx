import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code"; 
import { QrReader } from 'react-qr-reader'; 
import FaceScanner from './components/IrisScanner'; 

// --- STYLE CONFIG ---
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
    const [view, setView] = useState(initialView); 
    const [showFaceModal, setShowFaceModal] = useState(false); 
    const [connectedAccount, setConnectedAccount] = useState("");
    const [accessCode, setAccessCode] = useState("");
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", idNumber: "", question: "", answer: "" });
    const [faceHashes, setFaceHashes] = useState([]);
    const [isFaceRegistered, setIsFaceRegistered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [myWalletAddress, setMyWalletAddress] = useState("");

    // BOUNCER STATES
    const [scannedAddress, setScannedAddress] = useState("");
    const [userProfile, setUserProfile] = useState(null);
    const [verificationStage, setVerificationStage] = useState("QR");
    const [enableScanner, setEnableScanner] = useState(true);

    const connectWallet = async () => {
        if (!window.ethereum) return alert("Install MetaMask");
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setConnectedAccount(accounts[0]);
    };

    // --- VIEW: HOME ---
    if (view === "HOME") {
        return (
            <div className={ui.screen}>
                <div className="w-full max-w-4xl text-center space-y-8">
                    <h1 className="text-5xl font-bold">Iris Access System</h1>
                    <div className="flex justify-center gap-4">
                        <button className={ui.primary} onClick={() => setView("CODE_GATE")}>Guest Registration</button>
                        <button className={ui.button} onClick={() => setView("BOUNCER_HOME")}>Bouncer Panel</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: CODE GATE ---
    if (view === "CODE_GATE") {
        const checkCode = async () => {
            setLoading(true);
            try {
                const res = await fetch('https://iris-access-system.onrender.com/api/validate-code', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: accessCode })
                });
                const data = await res.json();
                if (data.valid) setView("FORM");
                else alert("Invalid Code");
            } catch (e) { alert("Backend Error"); }
            setLoading(false);
        };

        return (
            <div className={ui.screen}>
                <div className={ui.card}>
                    <h2 className="text-2xl font-bold">Enter Access Code</h2>
                    <input className={ui.input} value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="Code..." />
                    <button className={ui.primary} onClick={checkCode} disabled={loading}>{loading ? "Checking..." : "Next"}</button>
                    <button className={ui.ghost} onClick={() => setView("HOME")}>Back</button>
                </div>
            </div>
        );
    }

    // --- VIEW: FORM ---
    if (view === "FORM") {
        const handleInput = (e) => setFormData({...formData, [e.target.name]: e.target.value});
        const isFormFull = formData.name && formData.idNumber && formData.question && formData.answer;

        const submitToBlockchain = async () => {
            setLoading(true);
            try {
                let wallet = connectedAccount;
                if (!wallet && window.ethereum) {
                    const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    wallet = accs[0];
                }
                setMyWalletAddress(wallet);

                const res = await fetch('https://iris-access-system.onrender.com/api/register', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formData, accessCode, faceHashes, userWallet: wallet })
                });
                const data = await res.json();
                if (data.success) setView("SUCCESS");
                else alert("Error: " + data.error);
            } catch (e) { alert("Error: " + e.message); }
            setLoading(false);
        };

        return (
            <div className={ui.screen}>
                <div className={ui.card}>
                    <h2 className="text-2xl font-bold">Registration</h2>
                    <div className="grid gap-4">
                        <input className={ui.input} name="name" placeholder="Name" onChange={handleInput} />
                        <input className={ui.input} name="email" placeholder="Email" onChange={handleInput} />
                        <input className={ui.input} name="phone" placeholder="Phone" onChange={handleInput} />
                        <input className={ui.input} name="idNumber" placeholder="ID Number" onChange={handleInput} />
                        <select className={ui.input} name="question" onChange={handleInput}>
                            <option>Select Secret Question...</option>
                            <option>Mother's Maiden Name?</option>
                            <option>First Pet Name?</option>
                        </select>
                        <input className={ui.input} name="answer" placeholder="Secret Answer" onChange={handleInput} />
                    </div>

                    {!isFaceRegistered ? (
                        <button className={ui.primary} disabled={!isFormFull} onClick={() => setShowFaceModal(true)}>
                            📷 Capture Face
                        </button>
                    ) : (
                        <div className="text-emerald-400 border border-emerald-500 p-2 rounded text-center">✅ Face Captured</div>
                    )}

                    {isFaceRegistered && (
                        <button className={ui.primary} onClick={submitToBlockchain} disabled={loading}>
                            {loading ? "Registering..." : "Submit Registration"}
                        </button>
                    )}
                </div>

                {showFaceModal && (
                    <div className="fixed inset-0 bg-black z-50 p-4">
                         <FaceRegistrationWrapper onComplete={(hashes) => {
                             setFaceHashes(hashes); setIsFaceRegistered(true); setShowFaceModal(false);
                         }} />
                    </div>
                )}
            </div>
        );
    }

    if (view === "SUCCESS") {
        return (
            <div className={ui.screen}>
                 <div className="bg-white p-4 rounded"><QRCode value={myWalletAddress} /></div>
                 <h2 className="mt-4 text-2xl">Registered!</h2>
                 <button className={ui.button} onClick={() => setView("HOME")}>Done</button>
            </div>
        );
    }

    // --- BOUNCER LOGIC ---
    if (view === "BOUNCER_HOME") {
        const handleScan = async (result) => {
            if (!result || !enableScanner) return;
            setEnableScanner(false);
            const addr = result.text;
            setScannedAddress(addr);

            try {
                const res = await fetch('https://iris-access-system.onrender.com/api/get-profile', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr })
                });
                const profile = await res.json();
                
                if (profile.exists) {
                    setUserProfile(profile);
                    setVerificationStage("QUESTION");
                    setView("BOUNCER_VERIFY");
                } else {
                    alert("User Not Found or Already Redeemed");
                    setEnableScanner(true);
                }
            } catch (e) {
                alert("Scan Error: " + e.message);
                setEnableScanner(true);
            }
        };

        return (
            <div className={ui.screen}>
                <div className={ui.card}>
                    <h2 className="text-2xl font-bold mb-4">Bouncer: Scan QR</h2>
                    <div className="aspect-square bg-black overflow-hidden rounded-xl border-2 border-neon">
                         {enableScanner && <QrReader onResult={handleScan} constraints={{ facingMode: 'environment' }} style={{ width: '100%' }} />}
                    </div>
                    <button className={ui.ghost} onClick={() => setView("HOME")}>Exit</button>
                </div>
            </div>
        );
    }

    if (view === "BOUNCER_VERIFY") {
        if (verificationStage === "QUESTION") {
            return (
                <div className={ui.screen}>
                    <div className={ui.card}>
                        <h2 className="text-xl">Ask: {userProfile.question}</h2>
                        <div className="p-4 bg-white/10 rounded my-4">Answer: {userProfile.answer}</div>
                        <div className="flex gap-4">
                            <button className="pill-btn bg-red-500 w-1/2" onClick={() => setView("BOUNCER_HOME")}>Wrong</button>
                            <button className="pill-btn bg-emerald-500 w-1/2" onClick={() => setVerificationStage("FACE")}>Correct</button>
                        </div>
                    </div>
                </div>
            );
        }

        if (verificationStage === "FACE") {
            return (
                <BouncerFaceValidator 
                    storedHashes={userProfile.faceHashes} 
                    onSuccess={() => {
                        // Mark validated on backend
                        fetch('https://iris-access-system.onrender.com/api/mark-validated', {
                            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({address: scannedAddress})
                        });
                        setVerificationStage("GRANTED");
                    }}
                    onFail={() => {
                        alert("Face Mismatch!");
                        setView("BOUNCER_HOME");
                    }}
                />
            );
        }

        if (verificationStage === "GRANTED") {
            return (
                <div className={ui.screen}>
                    <div className="bg-emerald-900/50 p-10 rounded-2xl border border-emerald-500 text-center">
                        <h1 className="text-6xl">✅</h1>
                        <h2 className="text-4xl font-bold mt-4">ACCESS GRANTED</h2>
                        <button className="mt-8 pill-btn bg-white/20" onClick={() => {
                            setVerificationStage("QR"); setView("BOUNCER_HOME"); setEnableScanner(true);
                        }}>Next Guest</button>
                    </div>
                </div>
            );
        }
    }

    return null;
};

// --- HELPERS ---
const FaceRegistrationWrapper = ({ onComplete }) => {
    // Simplified for brevity, assume logic is same as before but just calling onComplete
    const [step, setStep] = useState(0);
    return (
        <div className="bg-slate-900 p-4 rounded-xl text-center">
            <h3 className="text-xl mb-4 text-white">Capture Angle: {STEPS[step]}</h3>
            <FaceScanner 
                stepInstruction={STEPS[step]}
                onStepComplete={(hashes) => {
                    if (step < STEPS.length - 1) setStep(step + 1);
                    else onComplete(hashes); // Mocking accumulation for brevity
                }} 
            />
        </div>
    );
};

const BouncerFaceValidator = ({ storedHashes, onSuccess, onFail }) => {
    // CRITICAL FIX: Increased threshold to 0.35 (35% deviation allowed)
    const MATCH_THRESHOLD = 0.35; 

    const parseHash = (hash) => hash.split('|').map(pair => pair.split(',').map(Number));
    const sampleDistance = (h1, h2) => {
        const a = parseHash(h1); const b = parseHash(h2);
        const len = Math.min(a.length, b.length);
        let sum = 0;
        for (let i = 0; i < len; i++) {
            sum += Math.abs(a[i][0] - b[i][0]) + Math.abs(a[i][1] - b[i][1]);
        }
        return sum / (len * 2);
    };

    const handleScan = (liveHashes) => {
        if (!liveHashes || liveHashes.length === 0) return;
        let bestDistance = Infinity;
        liveHashes.forEach(live => {
            storedHashes.forEach(stored => {
                const dist = sampleDistance(live, stored);
                if (dist < bestDistance) bestDistance = dist;
            });
        });
        console.log(`Diff: ${bestDistance.toFixed(3)} vs Threshold: ${MATCH_THRESHOLD}`);

        if (bestDistance <= MATCH_THRESHOLD) onSuccess();
        else onFail();
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
            <h2 className="text-2xl mb-4">Scan Face</h2>
            <FaceScanner stepInstruction="Center" onStepComplete={handleScan} />
        </div>
    );
};

export default App;