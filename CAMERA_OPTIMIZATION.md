# Camera Control - Optimized for Performance ✅

## Changes Made

### 1. **IrisScanner Component** (`src/components/IrisScanner.jsx`)
- ✅ Added cleanup function to **stop camera on unmount**
- Camera gracefully stops when component is destroyed
- Prevents memory leaks and unnecessary resource usage

```javascript
// Line ~48-82
useEffect(() => {
  let camera;
  // ... initialize camera ...
  camera.start();

  // Cleanup: Stop camera when component unmounts
  return () => {
    if (camera) {
      camera.stop();
    }
  };
}, []);
```

### 2. **App.jsx - View-based Camera Control**

#### a) BOUNCER_HOME (QR Scanner)
- QR scanner only renders when `enableScanner = true`
- State set to true only in BOUNCER_HOME view
- Conditional render: `{enableScanner && <QrReader ... />}`

#### b) BOUNCER_VERIFY (Face Scanner)
- Face scanner only renders during FACE stage
- Conditional render: `{verificationStage === "FACE" && <FaceScanner ... />}`
- Prevents camera from running during QUESTION and GRANTED stages

#### c) Cleanup Effect (Line ~130-145)
```javascript
useEffect(() => {
    const shouldHaveCameraActive = 
        (view === "FORM" && showFaceModal) || 
        (view === "BOUNCER_HOME") || 
        (view === "BOUNCER_VERIFY" && verificationStage === "FACE");
    
    if (!shouldHaveCameraActive) {
        console.log("📹 Camera disabled (view changed)");
    }
}, [view, showFaceModal, verificationStage]);
```

---

## Camera Lifecycle

| View/Stage | Camera Status |
|-----------|--------------|
| HOME | ❌ Off |
| CODE_GATE | ❌ Off |
| FORM (form only) | ❌ Off |
| FORM (face modal open) | ✅ On (FaceScanner) |
| SUCCESS | ❌ Off |
| BOUNCER_HOME | ✅ On (QrReader) |
| BOUNCER_VERIFY (QUESTION) | ❌ Off |
| BOUNCER_VERIFY (FACE) | ✅ On (FaceScanner) |
| BOUNCER_VERIFY (GRANTED) | ❌ Off |

---

## Benefits

✅ **Battery saving**: Camera only runs when needed  
✅ **Privacy**: No background camera access  
✅ **Performance**: Reduced CPU/GPU usage  
✅ **Memory**: Cameras properly cleanup on unmount  
✅ **UX**: Faster navigation between views  

---

## Testing

1. **Guest Flow**
   - Navigate through HOME → CODE_GATE → FORM
   - Camera stays OFF until you click "Register Face"
   - Modal opens → Camera starts
   - Close modal → Camera stops

2. **Bouncer Flow**
   - Navigate to BOUNCER_HOME
   - Camera starts scanning QR
   - Leave view → Camera stops
   - Scan QR → Move to QUESTION stage → Camera stops
   - Click "CORRECT" → Move to FACE stage → Camera starts
   - Face scan completes → Camera stops

---

## Code Locations

| Change | File | Line |
|--------|------|------|
| Camera cleanup | `src/components/IrisScanner.jsx` | ~70-82 |
| View-based cleanup | `src/App.jsx` | ~130-145 |
| QR scanner conditional | `src/App.jsx` | ~555-561 |
| Face scanner conditional | `src/App.jsx` | ~807-809 |
