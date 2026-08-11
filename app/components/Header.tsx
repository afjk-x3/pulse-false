'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Accessibility, 
  Video, 
  VideoOff, 
  Sparkles,
  X,
  LogOut
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import WebcamCVConsentModal from './WebcamCVConsentModal';
import { supabase } from '../lib/supabaseClient';

interface HeaderProps {
  title: string;
  currentUser: any; // Using any during migration transition
  onLogout: () => void;
}

export default function Header({ title, currentUser, onLogout }: HeaderProps) {
  const {
    openDyslexic,
    setOpenDyslexic,
    readingRuler,
    setReadingRuler,
    highContrast,
    setHighContrast,
    fontScale,
    setFontScale,
    ttsEnabled,
    setTtsEnabled,
    ttsSpeed,
    setTtsSpeed,
    ttsPitch,
    setTtsPitch,
    nudgeStyle,
    setNudgeStyle
  } = useAccessibility();

  const [isAccessMenuOpen, setIsAccessMenuOpen] = useState(false);
  const [cvActive, setCvActive] = useState(true);
  const [cvTooltipVisible, setCvTooltipVisible] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load CV active state from Supabase (or fallback to local while transitioning)
  useEffect(() => {
    const fetchConsent = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('camera_telemetry_consented')
          .eq('id', user.id)
          .single();
        if (data) {
          setCvActive(data.camera_telemetry_consented);
          // Also persist back to localStorage for fallback scripts that might still check it
          localStorage.setItem('pulse-cv-consent', String(data.camera_telemetry_consented));
          localStorage.setItem('pulse-cv-active', String(data.camera_telemetry_consented));
        }
      } else {
        // Fallback for when not fully migrated in page.tsx
        const savedCv = localStorage.getItem('pulse-cv-active');
        const consent = localStorage.getItem('pulse-cv-consent') === 'true';
        if (savedCv !== null) {
          setCvActive(savedCv === 'true' && consent);
        }
      }
    };
    fetchConsent();
  }, []);

  const updateConsentDB = async (val: boolean) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ camera_telemetry_consented: val })
          .eq('id', user.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleCv = () => {
    if (loading) return;

    if (cvActive) {
      setCvActive(false);
      localStorage.setItem('pulse-cv-active', 'false');
      // If we pause, we aren't revoking consent necessarily, just pausing the stream.
      // But based on the original logic, pulse-cv-active is separate from pulse-cv-consent.
      // Since the DB only has `camera_telemetry_consented`, we will tie them together for the DB layer.
      updateConsentDB(false);
      
      setCvTooltipVisible(true);
      const timer = setTimeout(() => setCvTooltipVisible(false), 4000);
      return () => clearTimeout(timer);
    } else {
      const consent = localStorage.getItem('pulse-cv-consent') === 'true';
      // In the new world, if we toggle it back on, we should just show the consent modal if they don't have it.
      if (consent) {
        setCvActive(true);
        localStorage.setItem('pulse-cv-active', 'true');
        updateConsentDB(true);
        
        setCvTooltipVisible(true);
        const timer = setTimeout(() => setCvTooltipVisible(false), 4000);
        return () => clearTimeout(timer);
      } else {
        setIsConsentModalOpen(true);
      }
    }
  };

  const handleAcceptConsent = () => {
    localStorage.setItem('pulse-cv-consent', 'true');
    localStorage.setItem('pulse-cv-active', 'true');
    setCvActive(true);
    setIsConsentModalOpen(false);
    updateConsentDB(true);
    
    setCvTooltipVisible(true);
    setTimeout(() => setCvTooltipVisible(false), 4000);
  };

  const handleDeclineConsent = () => {
    localStorage.setItem('pulse-cv-consent', 'false');
    localStorage.setItem('pulse-cv-active', 'false');
    setCvActive(false);
    setIsConsentModalOpen(false);
    updateConsentDB(false);
  };

  return (
    <header className={`sticky top-0 right-0 z-20 flex h-20 items-center justify-between px-6 lg:px-8 bg-white border-b select-none ${
      highContrast 
        ? 'border-black bg-white text-black' 
        : 'border-[#f1f0ea]'
    }`}>
      {/* Page Title & Breadcrumb (Responsive margin for mobile burger) */}
      <div className="flex items-center gap-3 pl-14 lg:pl-0">
        {/* Mobile-only small logo marker */}
        <div className="lg:hidden relative w-8 h-8 shrink-0">
          <Image 
            src="/logo-icon.svg" 
            alt="Pulse mark" 
            fill
            className="object-contain"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 focus:outline-none">
            {title}
          </h1>
          <p className="text-xs text-neutral-400 hidden sm:block">AxionHR Well-Being Guardian Dashboard</p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Active Local Computer Vision Processing Camera Status */}
        <div className="relative">
          <button
            onClick={toggleCv}
            disabled={loading}
            className={`p-2.5 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              cvActive 
                ? (highContrast ? 'bg-black text-white border-2 border-black animate-glow-teal' : 'bg-teal-50 text-teal-600 animate-glow-teal')
                : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
            } ${loading ? 'opacity-50' : ''}`}
            aria-label={cvActive ? "Pause Local Well-being Computer Vision Telemetry" : "Resume Local Well-being Computer Vision Telemetry"}
            aria-live="polite"
            onMouseEnter={() => setCvTooltipVisible(true)}
            onMouseLeave={() => setCvTooltipVisible(false)}
          >
            {cvActive ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            
            {/* Pulsing indicator core */}
            {cvActive && (
              <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-teal-400 ring-2 ring-white" />
            )}
          </button>

          {/* Micro-Telemetry status explanation tooltips */}
          {cvTooltipVisible && (
            <div className={`absolute right-0 mt-3.5 w-72 p-3.5 rounded-lg border bg-white shadow-lg text-xs leading-relaxed z-50 text-neutral-600 ${
              highContrast ? 'border-black text-black font-bold' : 'border-neutral-200'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold text-neutral-800 mb-1">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <span>Local Computer Vision Processing</span>
              </div>
              <p className="mb-2">
                {cvActive 
                  ? "Active local analysis (gaze, micro-expressions, posture) to compute stress indices. Completely private." 
                  : "Analysis disabled. Stress telemetry is currently suspended."}
              </p>
              <div className="p-1.5 bg-neutral-50 rounded border border-neutral-100 text-[10px] text-neutral-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                <span>100% In-Browser. Zero server transmission.</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Accessibility Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsAccessMenuOpen(!isAccessMenuOpen)}
            className={`p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              isAccessMenuOpen 
                ? (highContrast ? 'bg-black text-white border-2 border-black' : 'bg-neutral-800 text-white')
                : (highContrast ? 'border border-black text-black hover:bg-neutral-100' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100')
            }`}
            aria-expanded={isAccessMenuOpen}
            aria-haspopup="true"
            aria-label="Accessibility settings panel"
          >
            <Accessibility className="h-5 w-5" />
          </button>

          {/* Dropdown Menu */}
          {isAccessMenuOpen && (
            <>
              {/* Overlay blocker for outside clicks */}
              <div className="fixed inset-0 z-40" onClick={() => setIsAccessMenuOpen(false)} />
              
              <div className={`absolute right-0 mt-3 w-80 p-5 rounded-xl border bg-white shadow-xl z-50 transition-all ${
                highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
              }`}>
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Accessibility className="h-5 w-5 text-teal-600" />
                    <span className="font-bold text-neutral-800">Accessibility Hub</span>
                  </div>
                  <button 
                    onClick={() => setIsAccessMenuOpen(false)}
                    className="p-1 rounded hover:bg-neutral-100 focus:ring-2 focus:ring-teal-500"
                    aria-label="Close accessibility panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* OpenDyslexic Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="dyslexic-toggle" className="block text-sm font-semibold text-neutral-700">OpenDyslexic Font</label>
                      <span className="text-[11px] text-neutral-400 block">Enables dyslexia-friendly typeface</span>
                    </div>
                    <button
                      id="dyslexic-toggle"
                      role="switch"
                      aria-checked={openDyslexic}
                      onClick={() => setOpenDyslexic(!openDyslexic)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        openDyslexic ? 'bg-teal-600' : 'bg-neutral-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        openDyslexic ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Reading Ruler Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="ruler-toggle" className="block text-sm font-semibold text-neutral-700">Reading Ruler</label>
                      <span className="text-[11px] text-neutral-400 block">Horizontal tracking guide follows cursor</span>
                    </div>
                    <button
                      id="ruler-toggle"
                      role="switch"
                      aria-checked={readingRuler}
                      onClick={() => setReadingRuler(!readingRuler)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        readingRuler ? 'bg-teal-600' : 'bg-neutral-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        readingRuler ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* High Contrast Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="contrast-toggle" className="block text-sm font-semibold text-neutral-700">High Contrast Mode</label>
                      <span className="text-[11px] text-neutral-400 block">Stark black & white layout borders</span>
                    </div>
                    <button
                      id="contrast-toggle"
                      role="switch"
                      aria-checked={highContrast}
                      onClick={() => setHighContrast(!highContrast)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        highContrast ? 'bg-teal-600' : 'bg-neutral-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        highContrast ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Font Scaling Options */}
                  <div className="border-t pt-3.5">
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Text Zoom Scale</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-50 rounded-lg border border-neutral-100">
                      {(['normal', 'large', 'extra-large'] as const).map((scale) => (
                        <button
                          key={scale}
                          onClick={() => setFontScale(scale)}
                          className={`py-1.5 px-2 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                            fontScale === scale
                              ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80 font-bold'
                              : 'text-neutral-500 hover:text-neutral-800'
                          }`}
                        >
                          {scale === 'normal' && '100%'}
                          {scale === 'large' && '120%'}
                          {scale === 'extra-large' && '140%'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text-to-Speech Toggle & Sliders */}
                  <div className="border-t pt-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="tts-toggle" className="block text-sm font-semibold text-neutral-700">Text-to-Speech</label>
                        <span className="text-[11px] text-neutral-400 block">Reads hovered text elements</span>
                      </div>
                      <button
                        id="tts-toggle"
                        role="switch"
                        aria-checked={ttsEnabled}
                        onClick={() => setTtsEnabled(!ttsEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          ttsEnabled ? 'bg-teal-600' : 'bg-neutral-200'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          ttsEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {ttsEnabled && (
                      <div className="space-y-2.5 p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-neutral-500">
                            <span>Speech Speed</span>
                            <span>{ttsSpeed}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={ttsSpeed}
                            onChange={(e) => setTtsSpeed(Number(e.target.value))}
                            className="w-full h-1.5 bg-neutral-250 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
                            aria-label="Speech Speed"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-neutral-500">
                            <span>Speech Pitch</span>
                            <span>{ttsPitch}</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={ttsPitch}
                            onChange={(e) => setTtsPitch(Number(e.target.value))}
                            className="w-full h-1.5 bg-neutral-250 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
                            aria-label="Speech Pitch"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nudge Delivery Preferences */}
                  <div className="border-t pt-3.5">
                    <label htmlFor="nudge-style-select" className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      Nudge Delivery Style
                    </label>
                    <select
                      id="nudge-style-select"
                      value={nudgeStyle}
                      onChange={(e) => setNudgeStyle(e.target.value as 'toast' | 'glow' | 'push' | 'off')}
                      className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                        highContrast ? 'border-black' : 'border-neutral-200'
                      }`}
                    >
                      <option value="toast">Toast Notification</option>
                      <option value="glow">Ambient Edge-Glow</option>
                      <option value="push">Web Push Notification</option>
                      <option value="off">Off / Disabled</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-3 pl-2 border-l border-neutral-200">
          <div className="relative h-9 w-9 rounded-full overflow-hidden border border-neutral-200 shrink-0 select-none">
            <div className="h-full w-full bg-neutral-100 flex items-center justify-center font-bold text-teal-700 text-sm animate-fade-in">
              {currentUser?.avatar || currentUser?.full_name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
          </div>
          <div className="hidden sm:block text-left select-none animate-fade-in">
            <span className="block text-xs font-bold text-neutral-800 leading-none">{currentUser?.name || currentUser?.full_name}</span>
            <span className="block text-[9px] text-neutral-400 mt-1 font-semibold">{currentUser?.title || currentUser?.job_title}</span>
          </div>
          {/* Sign Out Action */}
          <button
            onClick={onLogout}
            className={`p-1.5 rounded-lg hover:bg-neutral-50 border border-transparent transition focus:outline-none focus:ring-2 focus:ring-red-500`}
            aria-label={`Log out from ${currentUser?.name || currentUser?.full_name}`}
            title="Sign Out Account"
          >
            <LogOut className="h-4 w-4 text-neutral-400 hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
      {/* Consent flow modal overlay */}
      <WebcamCVConsentModal 
        isOpen={isConsentModalOpen}
        onAccept={handleAcceptConsent}
        onDecline={handleDeclineConsent}
      />
    </header>
  );
}
