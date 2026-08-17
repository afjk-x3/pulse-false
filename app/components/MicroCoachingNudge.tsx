'use client';

import React, { useState, useEffect} from'react';
import { Sparkles, X, Check} from'lucide-react';
import { useAccessibility} from'../context/AccessibilityContext';

export default function MicroCoachingNudge() {
 const { highContrast} = useAccessibility();
 const [isVisible, setIsVisible] = useState(false);
 const [isTimerOpen, setIsTimerOpen] = useState(false);
 const [timerSeconds, setTimerSeconds] = useState(20);
 const [timerPhase, setTimerPhase] = useState<'inhale' |'exhale' |'hold'>('inhale');
 const [timerComplete, setTimerComplete] = useState(false);

 useEffect(() => {
 // Show toast after 90 minutes
 const showTimer = setTimeout(() => {
 const dismissed = sessionStorage.getItem('pulse-nudge-dismissed') ==='true';
 if (!dismissed) {
 setIsVisible(true);
}
}, 90 * 60 * 1000); // 90 minutes

 return () => clearTimeout(showTimer);
}, []);

 const handleDismiss = () => {
 setIsVisible(false);
 sessionStorage.setItem('pulse-nudge-dismissed','true');
};

 const handleStartBreak = () => {
 setIsVisible(false);
 setIsTimerOpen(true);
 setTimerSeconds(20);
 setTimerPhase('inhale');
 setTimerComplete(false);
};

 // Breathing timer cycle logic
 useEffect(() => {
 if (!isTimerOpen || timerSeconds <= 0) {
 if (isTimerOpen && timerSeconds === 0) {
 setTimeout(() => {
 setTimerComplete(true);
}, 0);
 setTimeout(() => {
 setIsTimerOpen(false);
 sessionStorage.setItem('pulse-nudge-dismissed','true');
}, 3000);
}
 return;
}

 const interval = setInterval(() => {
 setTimerSeconds((prev) => prev - 1);
 
 // Rotate phase every 4 seconds
 const phaseSecs = (20 - timerSeconds) % 12;
 if (phaseSecs < 4) {
 setTimerPhase('inhale');
} else if (phaseSecs < 8) {
 setTimerPhase('hold');
} else {
 setTimerPhase('exhale');
}
}, 1000);

 return () => clearInterval(interval);
}, [isTimerOpen, timerSeconds]);

 if (!isVisible && !isTimerOpen) return null;

 return (
 <>
 {/* Floating Micro-Coaching Nudge Toast */}
 {isVisible && (
 <div 
 className={`fixed bottom-6 right-6 z-40 max-w-sm p-5 rounded-2xl glass-card shadow-2xl border flex gap-4 transition-all duration-300 transform translate-y-0 animate-slide-up ${
 highContrast ?'border-black text-black' :'border-teal-100/60'
}`}
 role="status"
 aria-live="polite"
 >
 {/* Accent border strip */}
 <div className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl bg-teal-600" />
 
 <div className="flex-1 space-y-2">
 <div className="flex items-center gap-1.5 text-teal-700 font-bold text-xs uppercase tracking-wider">
 <Sparkles className="h-4 w-4" />
 <span>Well-Being Nudge</span>
 </div>

 <div className="space-y-1">
 <h3 className="text-xs font-bold text-neutral-800">Time for a Screen Break</h3>
 <p className="text-[11px] text-neutral-500 leading-normal">
 You have been active for 90 consecutive minutes. Stare at a distant object 20 feet away for 20 seconds to reset eye strain.
 </p>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-2 pt-1">
 <button
 onClick={handleStartBreak}
 className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
 highContrast
 ?'bg-black text-white hover:bg-neutral-800'
 :'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
}`}
 >
 Start 20s Break
 </button>
 <button
 onClick={handleDismiss}
 className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition"
 >
 Dismiss
 </button>
 </div>
 </div>

 <button
 onClick={handleDismiss}
 className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 self-start focus:ring-2 focus:ring-teal-500"
 aria-label="Dismiss nudge"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 )}

 {/* Breathing Guide Modal Overlay */}
 {isTimerOpen && (
 <div 
 className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in"
 role="dialog"
 aria-modal="true"
 aria-labelledby="timer-title"
 >
 <div className="text-center max-w-sm p-6 space-y-6">
 <h2 id="timer-title" className="text-xl font-bold text-neutral-800">
 {timerComplete ?"Break Complete!" :"Micro-Rest: 20-20-20 Rule"}
 </h2>
 
 {timerComplete ? (
 <div className="space-y-4 animate-scale-up">
 <div className="h-20 w-20 rounded-full bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mx-auto shadow-md">
 <Check className="h-10 w-10 stroke-[2.5]" />
 </div>
 <p className="text-sm font-semibold text-neutral-700">Good job. Your eyes thank you!</p>
 <p className="text-xs text-neutral-400">Returning you to the dashboard...</p>
 </div>
 ) : (
 <div className="space-y-6">
 {/* Breathing circle indicator */}
 <div className="relative flex items-center justify-center h-44 w-44 mx-auto">
 {/* Outer pulsing ring */}
 <div className={`absolute rounded-full bg-teal-100/40 border border-teal-200/50 transition-all duration-1000 ${
 timerPhase ==='inhale' ?'scale-110 opacity-70' :
 timerPhase ==='hold' ?'scale-105 opacity-50' :'scale-90 opacity-20'
}`} style={{ width:'100%', height:'100%'}} />

 {/* Inner solid circle */}
 <div className={`rounded-full bg-teal-600/10 border-2 border-teal-600 flex flex-col items-center justify-center transition-all duration-1000 shadow-md ${
 timerPhase ==='inhale' ?'h-32 w-32' :
 timerPhase ==='hold' ?'h-32 w-32 bg-teal-600/20' :'h-24 w-24'
}`}>
 <span className="text-2xl font-bold text-teal-900">{timerSeconds}s</span>
 <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mt-1">
 {timerPhase}
 </span>
 </div>
 </div>

 <div className="space-y-2">
 <p className="text-sm font-semibold text-neutral-700 leading-snug">
 {timerPhase ==='inhale' &&"Slowly inhale... fill your lungs."}
 {timerPhase ==='hold' &&"Hold... rest your focus."}
 {timerPhase ==='exhale' &&"Exhale gently... release tension."}
 </p>
 <p className="text-xs text-neutral-400 max-w-xs leading-normal">
 Focus your gaze on an object at least 20 feet away to relax your optical ciliary muscles.
 </p>
 </div>

 <button
 onClick={() => setIsTimerOpen(false)}
 className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition"
 >
 Exit Session
 </button>
 </div>
 )}
 </div>
 </div>
 )}
 </>
 );
}
