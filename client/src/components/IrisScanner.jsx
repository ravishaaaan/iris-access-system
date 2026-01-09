import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import ProgressRing from './ProgressRing';

const FaceScanner = ({ stepInstruction, onStepComplete, isPaused, facingMode = "user" }) => {
  const webcamRef = useRef(null);
  const [activeFacing, setActiveFacing] = useState(facingMode);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing AI...");
  const [debugData, setDebugData] = useState(""); 
  
  const instructionRef = useRef(stepInstruction);
  const frameCounter = useRef(0);
  const burstBuffer = useRef([]); 
  const isBursting = useRef(false);
  const completedRef = useRef(false);
  const BURST_SIZE = 6; 
  const TARGET_FRAMES = 6; // Faster lock-on for better UX
  const stepStartRef = useRef(0);
  const burstStartRef = useRef(0);
  const SOFT_TIMEOUT_MS = 8000;   // After this, relax thresholds
  const HARD_TIMEOUT_MS = 20000;  // After this, force-capture to avoid stalls
  const BURST_TIMEOUT_MS = 6000;  // If burst hangs, auto-complete

  useEffect(() => {
    // Keep active facing in sync with prop when it changes
    setActiveFacing(facingMode);
  }, [facingMode]);

  useEffect(() => {
    // If we are paused, reset everything and DO NOTHING
    if (isPaused) {
      setStatus("Cooling down...");
      setProgress(0);
      frameCounter.current = 0;
      burstBuffer.current = [];
      isBursting.current = false;
      return;
    }

    // Only update instruction if NOT paused
    instructionRef.current = stepInstruction;
    frameCounter.current = 0; 
    setProgress(0);
    burstBuffer.current = [];
    isBursting.current = false;
    completedRef.current = false;
    setStatus("Align Face...");
    stepStartRef.current = Date.now();
    burstStartRef.current = 0;
  }, [stepInstruction, isPaused]);

  // Initialize MediaPipe FaceMesh once per mount
  const faceMeshRef = useRef(null);

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;

    return () => {
      if (faceMeshRef.current?.close) {
        faceMeshRef.current.close();
      }
      faceMeshRef.current = null;
    };
  }, []);

  // Initialize camera per facing mode / pause state
  useEffect(() => {
    if (isPaused) return;
    if (!faceMeshRef.current) return;

    console.log('🎥 Initializing camera for step:', stepInstruction, 'facing', activeFacing);
    
    let camera;
    let attempts = 0;
    const initCamera = () => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        console.log('✅ Camera ready, starting...');
        camera = new Camera(webcamRef.current.video, {
          onFrame: async () => {
            if (!isPaused && webcamRef.current && webcamRef.current.video && faceMeshRef.current) {
              await faceMeshRef.current.send({ image: webcamRef.current.video });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
      } else {
        attempts += 1;
        if (attempts === 20 && activeFacing !== 'user') {
          console.warn('⚠️ Fallback to user-facing camera');
          setActiveFacing('user');
          return;
        }
        setTimeout(initCamera, 100);
      }
    };

    initCamera();

    return () => {
      if (camera) {
        camera.stop();
      }
    };
  }, [isPaused, activeFacing, stepInstruction]); // Re-initialize when step or facing changes

  const onResults = (results) => {
    // Double check pause state
    if (isPaused) return;
    // Guard: Stop processing if step already completed
    if (completedRef.current) return;
    if (burstBuffer.current.length >= BURST_SIZE && !isBursting.current) return;

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setStatus("No Face Detected");
      return;
    }
    const landmarks = results.multiFaceLandmarks[0];
    checkPose(landmarks);
  };

  const checkPose = (landmarks) => {
    // Calculate Hash
    const keyPoints = [1, 33, 263, 61, 291, 199, 152];
    const currentHash = keyPoints.map(i => 
        `${landmarks[i].x.toFixed(3)},${landmarks[i].y.toFixed(3)}`
    ).join("|");

    if (isBursting.current) {
      if (!burstStartRef.current) burstStartRef.current = Date.now();
      const burstElapsed = Date.now() - burstStartRef.current;
      burstBuffer.current.push(currentHash);
      const captured = burstBuffer.current.length;
      setStatus(`Capturing: ${captured}/${BURST_SIZE}`);
      setProgress(Math.min((captured / BURST_SIZE) * 100, 100));
      
      if (captured >= BURST_SIZE || burstElapsed > BURST_TIMEOUT_MS) {
        if (burstElapsed > BURST_TIMEOUT_MS) {
          console.warn("⏱️ Burst timeout, auto-completing step", instructionRef.current);
        }
        console.log(`✅ Step complete! Captured ${captured} samples for ${instructionRef.current}`);
        completedRef.current = true;
        onStepComplete(burstBuffer.current);
        isBursting.current = false; 
        return;
      }
      return; 
    }

    // Alignment Logic
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const midEye = landmarks[168]; 
    const chin = landmarks[152];   

    const distToLeft = Math.abs(nose.x - leftEye.x);
    const distToRight = Math.abs(nose.x - rightEye.x);
    const yawRatio = distToLeft / (distToRight + 0.001);

    const distUp = Math.abs(nose.y - midEye.y);
    const distDown = Math.abs(nose.y - chin.y);
    const pitchRatio = distUp / (distDown + 0.001);

    const currentStep = instructionRef.current;
    if (!currentStep) return;

    let isAligned = false;
    const elapsed = Date.now() - stepStartRef.current;
    const assist = elapsed > SOFT_TIMEOUT_MS; // enable assisted thresholds

    if (currentStep === "Center") {
      setDebugData(`Yaw: ${yawRatio.toFixed(2)} | Pitch: ${pitchRatio.toFixed(2)}`);
      const yawOk = assist ? (yawRatio > 0.65 && yawRatio < 1.45) : (yawRatio > 0.8 && yawRatio < 1.25);
      const pitchOk = assist ? (pitchRatio > 0.25 && pitchRatio < 0.75) : (pitchRatio > 0.35 && pitchRatio < 0.65);
      if (yawOk && pitchOk) isAligned = true;
      else setStatus(assist ? "Look Straight (assisted)" : "Look Straight Ahead");
    } 
    else if (currentStep === "Turn Left") {
      const thr = assist ? 1.00 : 0.85;
      setDebugData(`Yaw: ${yawRatio.toFixed(2)} (< ${thr.toFixed(2)})`);
      if (yawRatio < thr) isAligned = true;
      else setStatus(assist ? "Turn Left (assisted) ->" : "Turn Left More ->");
    } 
    else if (currentStep === "Turn Right") {
      const thr = assist ? 1.05 : 1.20;
      setDebugData(`Yaw: ${yawRatio.toFixed(2)} (> ${thr.toFixed(2)})`);
      if (yawRatio > thr) isAligned = true;
      else setStatus(assist ? "<- Turn Right (assisted)" : "<- Turn Right More");
    }
    else if (currentStep === "Look Up") {
      const thr = assist ? 0.70 : 0.55;
      setDebugData(`Pitch: ${pitchRatio.toFixed(2)} (< ${thr.toFixed(2)})`);
      if (pitchRatio < thr) isAligned = true;
      else setStatus(assist ? "Look Up (assisted) ^" : "Look Up Higher ^");
    }
    else if (currentStep === "Look Down") {
      const thr = assist ? 0.35 : 0.45;
      setDebugData(`Pitch: ${pitchRatio.toFixed(2)} (> ${thr.toFixed(2)})`);
      if (pitchRatio > thr) isAligned = true;
      else setStatus(assist ? "Look Down (assisted) v" : "Look Down Lower v");
    }

    // HARD TIMEOUT: force capture to avoid getting stuck forever
    if (elapsed > HARD_TIMEOUT_MS && !isBursting.current) {
      isBursting.current = true;
      frameCounter.current = 0;
      setStatus("Auto-capturing (timeout)");
    }

    if (isAligned) {
      setStatus("Hold Steady...");
      frameCounter.current += 1; 
      const percent = Math.min((frameCounter.current / TARGET_FRAMES) * 100, 100);
      setProgress(percent);
      
      if (frameCounter.current >= TARGET_FRAMES) {
        console.log(`🎯 Alignment locked for ${instructionRef.current}. Starting burst capture...`);
        isBursting.current = true; 
        frameCounter.current = 0;  
      }
    } else {
      if (frameCounter.current > 0) frameCounter.current -= 1;
      const percent = Math.min((frameCounter.current / TARGET_FRAMES) * 100, 100);
      setProgress(percent);
    }
  };

  return (
    <div style={{ position: 'relative', width: '640px', height: '480px', background: '#000', margin: '0 auto', borderRadius: '20px', overflow: 'hidden' }}>
      {/* If paused, we blur the camera to indicate "Wait" */}
      <Webcam
        ref={webcamRef}
        style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          transform: facingMode === 'user' ? "scaleX(-1)" : "none",
          filter: isPaused ? "blur(10px) grayscale(100%)" : "none", // Visual feedback
          transition: "filter 0.5s ease"
        }} 
        videoConstraints={{ width: 640, height: 480, facingMode: activeFacing }}
      />
      
      {!isPaused && (
        <>
          <ProgressRing radius={120} stroke={8} progress={progress} />
          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: '#0f0', padding: '5px', fontSize: '14px', fontWeight: 'bold' }}>
            Step: {instructionRef.current} <br/> {debugData}
          </div>
          <div style={{ position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold', textShadow: '0px 0px 5px black' }}>
            {status}
          </div>
        </>
      )}
    </div>
  );
};

export default FaceScanner;