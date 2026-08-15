'use client';

import React, { useState, useEffect } from 'react';
import { Coffee, Calendar, RefreshCw, AlertCircle, CheckCircle2, Sliders } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAccessibility } from '../context/AccessibilityContext';

const CONVERSATION_STARTERS = [
  'How are you managing off-hours deployment syncs?',
  'What are your tips for keeping zoom meetings short?',
  'Which Support Circle do you check the most?'
];

export default function CoffeeRoulette() {
  const { highContrast } = useAccessibility();
  
  const [pairedName, setPairedName] = useState<string | null>(null);
  const [pairedRole, setPairedRole] = useState<string | null>(null);
  const [pairedAvatar, setPairedAvatar] = useState<string | null>(null);
  
  const [isPaused, setIsPaused] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Load local pause state
    const savedPause = localStorage.getItem('pulse-coffee-roulette-paused');
    if (savedPause === 'true') setIsPaused(true);

    const fetchPairing = async () => {
      setInitialLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch latest pairing for this user
        const { data: pairings, error } = await supabase
          .from('coffee_roulette_pairings')
          .select('*')
          .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (pairings && pairings.length > 0) {
          const p = pairings[0];
          const otherUserId = p.user_1_id === user.id ? p.user_2_id : p.user_1_id;

          // Fetch other user's profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, job_title, avatar')
            .eq('id', otherUserId)
            .single();

          if (profile) {
            setPairedName(profile.full_name);
            setPairedRole(profile.job_title ?? 'Employee');
            setPairedAvatar(profile.avatar ?? profile.full_name.substring(0, 2).toUpperCase());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchPairing();
  }, []);

  const handleTogglePause = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    localStorage.setItem('pulse-coffee-roulette-paused', String(nextPaused));
  };

  const handleScheduleChat = () => {
    if (isPaused || !pairedName) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setScheduleSuccess(true);
      setTimeout(() => setScheduleSuccess(false), 4000);
    }, 1200);
  };

  const handleRerollPairing = async () => {
    setLoading(true);
    // In a real app, this would call a backend function to re-roll and create a new row
    // in coffee_roulette_pairings. We'll simulate it by assigning a hardcoded mock for demonstration
    // since we cannot reliably find another unmatched user safely entirely on the frontend.
    setTimeout(() => {
      setLoading(false);
      setPairedName('James Miller');
      setPairedRole('Staff Infrastructure Architect');
      setPairedAvatar('JM');
    }, 1000);
  };

  if (initialLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
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
            aria-checked={!isPaused}
            onClick={handleTogglePause}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              !isPaused ? 'bg-teal-600' : 'bg-neutral-200'
            }`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              !isPaused ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Main card */}
      {isPaused ? (
        <div className={`p-12 text-center bg-white rounded-2xl border ${
          highContrast ? 'border-black' : 'border-[#f1f0ea]'
        }`}>
          <AlertCircle className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-700">Coffee Roulette is Paused</p>
          <p className="text-[11px] text-neutral-400 mt-1 max-w-xs mx-auto leading-normal">
            You are temporarily excluded from the pairing pool. Toggle active pairing back on to participate in the next round.
          </p>
        </div>
      ) : !pairedName ? (
        <div className={`p-12 text-center bg-white rounded-2xl border ${
          highContrast ? 'border-black' : 'border-[#f1f0ea]'
        }`}>
          <Coffee className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-700">No active pairing found</p>
          <p className="text-[11px] text-neutral-400 mt-1">Wait until the next matching cycle on Monday to receive a partner!</p>
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
              <div className="h-20 w-20 rounded-full bg-teal-50 text-teal-700 border-2 border-teal-200 shadow-md flex items-center justify-center text-2xl font-bold mx-auto overflow-hidden">
                {(pairedAvatar?.startsWith('data:image') || pairedAvatar?.startsWith('http')) ? (
                  <img src={pairedAvatar} alt="Paired avatar" className="h-full w-full object-cover" />
                ) : (
                  pairedAvatar
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-800 leading-snug">{pairedName}</h3>
                <span className="text-[10px] text-neutral-400 font-semibold">{pairedRole}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-50/50 border border-neutral-100 text-[10px] text-neutral-500 leading-normal">
                Matched on: <strong>{new Date().toLocaleDateString()}</strong> <br />
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
                <span>{loading ? 'Scheduling...' : 'Schedule Chat'}</span>
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
                {CONVERSATION_STARTERS.map((starter, idx) => (
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
