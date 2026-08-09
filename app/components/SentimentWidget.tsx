'use client';

import React, { useState, useEffect } from 'react';
import { Heart, X, Check, Smile } from 'lucide-react';
import { PulseDB } from '../lib/db';
import { useAccessibility } from '../context/AccessibilityContext';

interface SentimentWidgetProps {
  onLogSaved: () => void;
}

export default function SentimentWidget({ onLogSaved }: SentimentWidgetProps) {
  const { highContrast } = useAccessibility();
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastLoggedTime, setLastLoggedTime] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const moods = [
    { score: 1, emoji: '😢', label: 'Struggling', color: 'hover:bg-red-50 text-red-600' },
    { score: 2, emoji: '😕', label: 'Fatigued', color: 'hover:bg-orange-50 text-orange-600' },
    { score: 3, emoji: '😐', label: 'Neutral', color: 'hover:bg-amber-50 text-amber-600' },
    { score: 4, emoji: '🙂', label: 'Good', color: 'hover:bg-blue-50 text-blue-600' },
    { score: 5, emoji: '😄', label: 'Energized', color: 'hover:bg-green-50 text-green-600' },
  ];

  const isNearEndOfWorkingHours = () => {
    try {
      const config = PulseDB.getAdminConfig();
      if (!config || !config.workingHoursEnd) return false;
      
      const [endHour, endMin] = config.workingHoursEnd.split(':').map(Number);
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      
      const nowMinutes = currentHour * 60 + currentMin;
      const endMinutes = endHour * 60 + endMin;
      
      // Near end is defined as within 60 minutes before workingHoursEnd or anytime after
      return nowMinutes >= (endMinutes - 60);
    } catch (e) {
      console.error('Error calculating working hours end:', e);
      return false;
    }
  };

  // Morning Launch Trigger (Automated, capped at 1/day)
  useEffect(() => {
    const timer = setTimeout(() => {
      const logs = PulseDB.getSentimentLogs();
      const todayStr = new Date().toDateString();
      
      let hasLoggedToday = false;
      if (logs.length > 0) {
        const lastLog = logs[logs.length - 1];
        const lastLogDate = new Date(lastLog.timestamp).toDateString();
        if (lastLogDate === todayStr) {
          hasLoggedToday = true;
          setLastLoggedTime(new Date(lastLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }

      const morningTriggeredDate = localStorage.getItem('pulse-morning-checkin-triggered-date');
      const alreadyMorningTriggeredToday = morningTriggeredDate === todayStr;

      if (!hasLoggedToday) {
        if (!alreadyMorningTriggeredToday) {
          // Open automated prompt
          setIsExpanded(true);
          localStorage.setItem('pulse-morning-checkin-triggered-date', todayStr);
        } else {
          // Capped: already prompted today but not checked in, keep minimized
          setIsExpanded(false);
        }
      } else {
        // Logged today: keep minimized
        setIsExpanded(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // End-of-Day Exit Trigger (Automated, capped at 1/day)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const logs = PulseDB.getSentimentLogs();
        const todayStr = new Date().toDateString();
        
        const hasLoggedToday = logs.some(l => new Date(l.timestamp).toDateString() === todayStr);
        const exitTriggeredDate = localStorage.getItem('pulse-exit-checkin-triggered-date');
        const alreadyExitTriggeredToday = exitTriggeredDate === todayStr;

        if (!hasLoggedToday && !alreadyExitTriggeredToday && isNearEndOfWorkingHours()) {
          // Trigger exit prompt
          localStorage.setItem('pulse-exit-checkin-triggered-date', todayStr);
          setIsExpanded(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleMoodSelect = (score: number, emoji: string) => {
    PulseDB.addSentimentLog(score, emoji);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastLoggedTime(nowStr);
    setShowSuccess(true);
    onLogSaved();

    // Transition from success to minimized state
    setTimeout(() => {
      setShowSuccess(false);
      setIsExpanded(false);
    }, 2500);
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-xl hover:bg-teal-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
            highContrast ? 'bg-black text-white border-2 border-white' : ''
          }`}
          aria-label="Open sentiment check-in"
          title="Daily Sentiment Check-in"
        >
          {lastLoggedTime ? (
            <span className="text-xl">✅</span>
          ) : (
            <Smile className="h-6 w-6 animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-40 w-80 p-5 rounded-2xl bg-white shadow-2xl border transition-all duration-300 ${
        highContrast ? 'border-black text-black' : 'border-neutral-100'
      }`}
      role="complementary"
      aria-label="Daily mood survey card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-1.5 text-teal-700 font-bold text-sm">
          <Heart className={`h-4.5 w-4.5 fill-teal-600 text-teal-600 ${highContrast ? 'text-black fill-black' : ''}`} />
          <span className={highContrast ? 'text-black' : ''}>Pulse Check</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded-md text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Minimize widget"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showSuccess ? (
        <div className="py-4 text-center flex flex-col items-center justify-center animate-fade-in">
          <div className="h-10 w-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-2.5">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-neutral-700">Check-in logged! Thank you.</p>
          <p className="text-[10px] text-neutral-400 mt-1">Telemetry synced to your private profile.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-neutral-800 mb-1">
            How are you feeling today?
          </h2>
          <p className="text-[11px] text-neutral-400 mb-4 leading-tight">
            Select an emoji to log your baseline. This influences your local Burnout Risk Index.
          </p>

          {/* Emoji row */}
          <div className="grid grid-cols-5 gap-2" role="group" aria-label="Mood options">
            {moods.map((mood) => (
              <button
                key={mood.score}
                onClick={() => handleMoodSelect(mood.score, mood.emoji)}
                className={`flex flex-col items-center py-2.5 rounded-xl border border-transparent transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${mood.color}`}
                aria-label={`Mood: ${mood.label}`}
                title={mood.label}
              >
                <span className="text-2xl mb-1 filter drop-shadow-xs transform active:scale-95 duration-100">{mood.emoji}</span>
                <span className="text-[9px] font-medium leading-none text-neutral-500">{mood.label}</span>
              </button>
            ))}
          </div>

          {lastLoggedTime && (
            <p className="text-[10px] text-neutral-400 text-center mt-4">
              Today&apos;s check-in logged at {lastLoggedTime}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
