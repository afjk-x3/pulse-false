'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type FontScale = 'normal' | 'large' | 'extra-large';

interface AccessibilityContextType {
  openDyslexic: boolean;
  setOpenDyslexic: (val: boolean) => void;
  readingRuler: boolean;
  setReadingRuler: (val: boolean) => void;
  readingRulerY: number;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  ttsEnabled: boolean;
  setTtsEnabled: (val: boolean) => void;
  ttsSpeed: number;
  setTtsSpeed: (val: number) => void;
  ttsPitch: number;
  setTtsPitch: (val: number) => void;
  nudgeStyle: 'toast' | 'glow' | 'push' | 'off';
  setNudgeStyle: (val: 'toast' | 'glow' | 'push' | 'off') => void;
  speakText: (text: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [openDyslexic, setOpenDyslexic] = useState(false);
  const [readingRuler, setReadingRuler] = useState(false);
  const [readingRulerY, setReadingRulerY] = useState(0);
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>('normal');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [nudgeStyle, setNudgeStyle] = useState<'toast' | 'glow' | 'push' | 'off'>('toast');

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedDyslexic = localStorage.getItem('pulse-dyslexic') === 'true';
      const savedRuler = localStorage.getItem('pulse-ruler') === 'true';
      const savedContrast = localStorage.getItem('pulse-contrast') === 'true';
      const savedScale = localStorage.getItem('pulse-font-scale') as FontScale;
      const savedTts = localStorage.getItem('pulse-tts-enabled') === 'true';
      const savedTtsSpeed = Number(localStorage.getItem('pulse-tts-speed') || '1.0');
      const savedTtsPitch = Number(localStorage.getItem('pulse-tts-pitch') || '1.0');
      const savedNudgeStyle = (localStorage.getItem('pulse-nudge-style') || 'toast') as 'toast' | 'glow' | 'push' | 'off';

      setTimeout(() => {
        setOpenDyslexic(savedDyslexic);
        setReadingRuler(savedRuler);
        setHighContrast(savedContrast);
        if (savedScale && ['normal', 'large', 'extra-large'].includes(savedScale)) {
          setFontScale(savedScale);
        }
        setTtsEnabled(savedTts);
        setTtsSpeed(savedTtsSpeed);
        setTtsPitch(savedTtsPitch);
        setNudgeStyle(savedNudgeStyle);
      }, 0);
    } catch (e) {
      console.error('Failed to load accessibility preferences:', e);
    }
  }, []);

  // Sync to localStorage and body classes
  useEffect(() => {
    localStorage.setItem('pulse-dyslexic', String(openDyslexic));
    if (openDyslexic) {
      document.body.classList.add('font-dyslexic');
    } else {
      document.body.classList.remove('font-dyslexic');
    }
  }, [openDyslexic]);

  useEffect(() => {
    localStorage.setItem('pulse-ruler', String(readingRuler));
  }, [readingRuler]);

  useEffect(() => {
    localStorage.setItem('pulse-contrast', String(highContrast));
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('pulse-font-scale', fontScale);
    document.body.classList.remove('text-normal', 'text-large', 'text-xlarge');
    if (fontScale === 'normal') {
      document.body.classList.add('text-normal');
    } else if (fontScale === 'large') {
      document.body.classList.add('text-large');
    } else if (fontScale === 'extra-large') {
      document.body.classList.add('text-xlarge');
    }
  }, [fontScale]);

  // Sync TTS & Nudge style to localStorage
  useEffect(() => {
    localStorage.setItem('pulse-tts-enabled', String(ttsEnabled));
    if (!ttsEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [ttsEnabled]);

  useEffect(() => {
    localStorage.setItem('pulse-tts-speed', String(ttsSpeed));
  }, [ttsSpeed]);

  useEffect(() => {
    localStorage.setItem('pulse-tts-pitch', String(ttsPitch));
  }, [ttsPitch]);

  useEffect(() => {
    localStorage.setItem('pulse-nudge-style', nudgeStyle);
  }, [nudgeStyle]);

  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    if (!ttsEnabled) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsSpeed;
    utterance.pitch = ttsPitch;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled, ttsSpeed, ttsPitch]);

  // Global hover reader for Text-to-Speech
  useEffect(() => {
    if (!ttsEnabled) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        ['H1', 'H2', 'H3', 'P', 'SPAN', 'BUTTON', 'LABEL'].includes(target.tagName) &&
        target.innerText &&
        target.innerText.trim().length > 0
      ) {
        speakText(target.innerText);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [ttsEnabled, speakText]);

  // Handle Reading Ruler mouse position tracking
  useEffect(() => {
    if (!readingRuler) return;

    const handleMouseMove = (e: MouseEvent) => {
      setReadingRulerY(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [readingRuler]);

  return (
    <AccessibilityContext.Provider
      value={{
        openDyslexic,
        setOpenDyslexic,
        readingRuler,
        setReadingRuler,
        readingRulerY,
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
        setNudgeStyle,
        speakText
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
