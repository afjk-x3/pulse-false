'use client';

import React, { useState, useEffect } from 'react';
import { Coffee, Calendar, RefreshCw, AlertCircle, CheckCircle2, Sliders } from 'lucide-react';
import { PulseDB, CoffeeRouletteState } from '../lib/db';
import { useAccessibility } from '../context/AccessibilityContext';

export default function CoffeeRoulette() {
  const { highContrast } = useAccessibility();
  const [rouletteState, setRouletteState] = useState<CoffeeRouletteState | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRouletteState(PulseDB.getCoffeeRoulette());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleTogglePause = () => {
    if (!rouletteState) return;
    const nextPaused = !rouletteState.paused;
    const updated = PulseDB.updateCoffeeRoulette({ paused: nextPaused });
    setRouletteState(updated);
  };

  const handleScheduleChat = () => {
    if (!rouletteState) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setScheduleSuccess(true);
      setTimeout(() => setScheduleSuccess(false), 4000);
    }, 1200);
  };

  const handleRerollPairing = () => {
    // Simulate a recalculation / re-pairing
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const updated = PulseDB.updateCoffeeRoulette({
        pairedName: 'James Miller',
        pairedRole: 'Staff Infrastructure Architect',
        pairedAvatar: 'JM',
        conversationStarters: [
          'How are you managing off-hours deployment syncs?',
          'What are your tips for keeping zoom meetings short?',
          'Which Support Circle do you check the most?'
        ],
        schedulingLink: 'https://calendly.com/axionhr-coffee-roulette/james'
      });
      setRouletteState(updated);
    }, 1000);
  };

  if (!rouletteState) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400">
        Loading Coffee Roulette pairing...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro header */}
      <div className={`p-6 bg-white rounded-2xl border flex flex-col md:flex-row gap-5 items-start justify-between ${
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}>
        <div className="space-y-2">
          <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2">
            <Coffee className="h-5.5 w-5.5 text-teal-600" />
            <span>Coffee Roulette Pairing</span>
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-2xl">
            A bi-weekly cross-team social connector program. Randomly matches you with coworkers across departments to build relationships, share knowledge, and reduce remote work isolation.
          </p>
        </div>

        {/* Toggler */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="roulette-pause-toggle" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            Active Pairing:
          </label>
          <button
            id="roulette-pause-toggle"
            role="switch"
            aria-checked={!rouletteState.paused}
            onClick={handleTogglePause}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              !rouletteState.paused ? 'bg-teal-600' : 'bg-neutral-200'
            }`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              !rouletteState.paused ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Main card */}
      {rouletteState.paused ? (
        <div className={`p-12 text-center bg-white rounded-2xl border ${
          highContrast ? 'border-black' : 'border-[#f1f0ea]'
        }`}>
          <AlertCircle className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-700">Coffee Roulette is Paused</p>
          <p className="text-[11px] text-neutral-400 mt-1 max-w-xs mx-auto leading-normal">
            You are temporarily excluded from the pairing pool. Toggle active pairing back on to participate in the next round.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Paired Colleague details */}
          <div className={`p-6 bg-white rounded-2xl border flex flex-col justify-between items-center text-center md:col-span-1 ${
            highContrast ? 'border-black' : 'border-[#f1f0ea]'
          }`}>
            <div className="space-y-4 w-full">
              <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Your Current Pairing
              </span>

              {/* Avatar circle */}
              <div className="h-20 w-20 rounded-full bg-teal-50 text-teal-700 border-2 border-teal-200 shadow-md flex items-center justify-center text-2xl font-bold mx-auto">
                {rouletteState.pairedAvatar}
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-800 leading-snug">{rouletteState.pairedName}</h3>
                <span className="text-[10px] text-neutral-400 font-semibold">{rouletteState.pairedRole}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-50/50 border border-neutral-100 text-[10px] text-neutral-500 leading-normal">
                Matched on: <strong>Aug 8, 2026</strong> <br />
                Expires in: <strong>6 days</strong>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-2 mt-6">
              <button
                onClick={handleScheduleChat}
                disabled={loading}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  highContrast
                    ? 'bg-black text-white hover:bg-neutral-800'
                    : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                }`}
              >
                <Calendar className="h-4.5 w-4.5" />
                <span>{loading ? "Scheduling..." : "Schedule Chat"}</span>
              </button>

              <button
                onClick={handleRerollPairing}
                disabled={loading}
                className="w-full py-2 rounded-xl text-xs font-semibold hover:bg-neutral-50 text-neutral-500 flex items-center justify-center gap-1.5 border border-neutral-200 transition focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Re-roll Match</span>
              </button>
            </div>
          </div>

          {/* Conversation starters */}
          <div className={`p-6 bg-white rounded-2xl border md:col-span-2 flex flex-col justify-between ${
            highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
          }`}>
            <div className="space-y-4">
              <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Conversation Starters (Low Pressure prompts)
              </span>

              <p className="text-xs text-neutral-500 leading-relaxed">
                Break the ice easily. These topics avoid generic project status updates and focus on building connection:
              </p>

              <div className="space-y-3 pt-2" role="region" aria-label="Conversation starters list">
                {rouletteState.conversationStarters.map((starter, idx) => (
                  <div 
                    key={idx}
                    className={`p-3.5 rounded-xl border bg-neutral-50/40 text-xs font-semibold leading-relaxed text-neutral-700 hover:bg-neutral-50 transition ${
                      highContrast ? 'border-black' : 'border-neutral-100'
                    }`}
                  >
                    <span className="text-teal-600 mr-1.5 font-extrabold">0{idx + 1}.</span>
                    {starter}
                  </div>
                ))}
              </div>
            </div>

            {/* Notification alert success */}
            {scheduleSuccess && (
              <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-start gap-2.5 animate-scale-up">
                <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Calendar Invites Sent!</span>
                  <span className="text-[10px] text-teal-700/80">
                    A mutual 15-minute slot has been booked in your calendar for next Tuesday at 10:00 AM.
                  </span>
                </div>
              </div>
            )}

            <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 leading-tight pt-4 md:pt-0">
              <Sliders className="h-4 w-4 text-teal-600" />
              <span>Roulette matching is updated bi-weekly. Unchecking active pairing disables notifications immediately.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
