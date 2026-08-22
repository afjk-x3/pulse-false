'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ShieldAlert, Check, AlertTriangle } from 'lucide-react';
import { useAccessibility} from'../context/AccessibilityContext';

interface WebcamCVConsentModalProps {
 isOpen: boolean;
 onAccept: () => void;
 onDecline: () => void;
}

export default function WebcamCVConsentModal({ isOpen, onAccept, onDecline}: WebcamCVConsentModalProps) {
 const { highContrast} = useAccessibility();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
  <div 
  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in"
  role="dialog"
  aria-modal="true"
  aria-labelledby="consent-modal-title"
  aria-describedby="consent-modal-desc"
  onClick={onDecline}
  >
  <div 
  onClick={(e) => e.stopPropagation()}
  className={`w-full max-w-lg p-6 bg-white rounded-2xl border shadow-2xl space-y-4 animate-scale-up ${
  highContrast ?'border-black text-black' :'border-neutral-100'
 }`}>
 {/* Header */}
 <div className="flex items-start gap-3 border-b pb-3.5 border-neutral-100">
 <div className="h-10 w-10 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
 <Camera className="h-5 w-5" />
 </div>
 <div>
 <h3 id="consent-modal-title" className="text-sm font-bold text-neutral-800">
 Activate Local Computer Vision Telemetry?
 </h3>
 <span className="text-[10px] font-semibold text-teal-600 block mt-0.5">Opt-in Webcam Consent Required</span>
 </div>
 </div>

 {/* Content */}
 <div id="consent-modal-desc" className="text-xs text-neutral-500 leading-relaxed space-y-3">
 <p>
 To compute eye strain (via eye-blink frequency) and skeletal alignment (via posture slumping), WBG uses a lightweight client-side machine learning module.
 </p>
 
 <div className={`p-3.5 rounded-xl bg-teal-50/40 border border-teal-150/40 text-[10px] text-teal-950/80 space-y-1.5 ${
 highContrast ?'border-black text-black glass-card font-bold' :''
}`}>
 <span className="font-bold flex items-center gap-1 text-[11px] text-teal-800">
 <ShieldAlert className="h-4.5 w-4.5" />
 <span>Privacy & Security Guarantees:</span>
 </span>
 <ul className="list-disc pl-4 space-y-1">
 <li><strong>100% Client-Side:</strong> All calculations execute in local browser memory.</li>
 <li><strong>No Server Uploads:</strong> No image data, frames, or biometric templates leave your device.</li>
 <li><strong>Zero Video Caching:</strong> Video streams are analysed ephemerally in RAM and instantly discarded.</li>
 <li><strong>Easily Revocable:</strong> Revoke consent instantly at any time from the Privacy Center or the header icon.</li>
 </ul>
 </div>

 <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 text-[10px] text-amber-800 flex items-start gap-2">
 <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
 <p>
 When active, a persistent high-contrast indicator is shown in your browser tab, and the camera icon in your dashboard header will glow.
 </p>
 </div>

 <p className="pt-1.5">Would you like to grant WBG access to the webcam for stress & fatigue telemetry?</p>
 </div>

 {/* Actions */}
 <div className="flex items-center justify-end gap-2 border-t pt-3.5 border-neutral-100">
 <button
 onClick={onDecline}
 className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition"
 >
 Decline & Turn Off
 </button>
 <button
 onClick={onAccept}
 className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition flex items-center gap-1.5"
 >
 <Check className="h-4 w-4" />
 <span>Accept & Enable</span>
 </button>
 </div>
 </div>
 </div>,
 document.body
 );
}
