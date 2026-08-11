'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, Sparkles, UserCheck } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { supabase } from '../lib/supabaseClient';

export default function BRIExplainerCard() {
  const { highContrast } = useAccessibility();
  const [shareWithManager, setShareWithManager] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPref = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('share_bri_with_manager')
        .eq('id', user.id)
        .single();
      if (data) {
        setShareWithManager(data.share_bri_with_manager);
      }
    };
    fetchPref();
  }, []);

  const handleToggleShare = async () => {
    if (loading) return;
    setLoading(true);
    const nextState = !shareWithManager;
    
    // Optimistic UI update
    setShareWithManager(nextState);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ share_bri_with_manager: nextState })
          .eq('id', user.id);
          
        if (error) throw error;

        // Show temporary confirmation message
        const msg = nextState 
          ? "Opt-in shared: Your direct manager (Derek) will see your aggregate 7-day trend line. Individual telemetry remains hidden."
          : "Sharing revoked: Your manager can no longer access your trend line history.";
        
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
      // Revert if error
      setShareWithManager(!nextState);
    } finally {
      setLoading(false);
    }
  };

  const factors = [
    { name: 'Meeting Overhang', weight: 42, details: '6.2 hours of back-to-back calendar appointments.', color: 'bg-orange-500' },
    { name: 'Off-Hours Activity Drift', weight: 35, details: 'Composing communications 1.5h past configured working hours.', color: 'bg-teal-600' },
    { name: 'Focus Interruption Cadence', weight: 23, details: 'High DOM tab-shifting rates (18 shifts/hr) in focus domains.', color: 'bg-neutral-500' },
  ];

  return (
    <article 
      className={`p-6 bg-white rounded-2xl border focus-dimming-card shadow-xs relative flex flex-col justify-between h-full ${
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}
      aria-labelledby="explainer-title"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 border-b pb-3 border-neutral-100">
          <HelpCircle className="h-5 w-5 text-teal-600" />
          <h2 id="explainer-title" className="text-base font-bold text-neutral-800">
            Why am I seeing this? (Burnout Factors)
          </h2>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed">
          Your Burnout Risk score is calculated by the local GBDT decision model based on three main feature attribution vectors:
        </p>

        {/* Factors Breakdown */}
        <div className="space-y-3.5" role="region" aria-label="Burnout factors weight list">
          {factors.map((factor) => (
            <div key={factor.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-700">{factor.name}</span>
                <span className="font-extrabold text-neutral-400">{factor.weight}% contribution</span>
              </div>
              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${factor.color}`}
                  style={{ width: `${factor.weight}%` }}
                />
              </div>
              <span className="block text-[10px] text-neutral-400 leading-snug">{factor.details}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Share settings */}
      <div className="mt-5 pt-4 border-t border-neutral-100 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="share-bri-toggle" className="block text-xs font-bold text-neutral-700">
              Share Trend with Manager
            </label>
            <span className="text-[10px] text-neutral-400 block leading-tight">
              Allows Derek (Manager) to see your rolling 7-day trend line
            </span>
          </div>

          <button
            id="share-bri-toggle"
            role="switch"
            aria-checked={shareWithManager}
            onClick={handleToggleShare}
            disabled={loading}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              shareWithManager ? 'bg-teal-600' : 'bg-neutral-200'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              shareWithManager ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Alert messaging */}
        {toastMessage && (
          <div className="p-3 bg-teal-50/50 border border-teal-150/40 rounded-xl text-[10px] text-teal-900 leading-normal flex items-start gap-1.5 animate-fade-in">
            <Sparkles className="h-4.5 w-4.5 text-teal-600 shrink-0 mt-0.5" />
            <p>{toastMessage}</p>
          </div>
        )}

        {shareWithManager && !toastMessage && (
          <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 text-[10px] text-neutral-400 flex items-center gap-1.5 font-medium">
            <UserCheck className="h-4 w-4 text-teal-600" />
            <span>Sharing active. Derek can view aggregate trends.</span>
          </div>
        )}
      </div>
    </article>
  );
}
