'use client';

import React, { useState, useEffect, useCallback } from 'react';
import BurnoutRiskIndex from './components/BurnoutRiskIndex';
import KAnonymityEmptyState from './components/KAnonymityEmptyState';
import RightToDisconnectOutbox from './components/RightToDisconnectOutbox';
import SentimentTrendLine from './components/SentimentTrendLine';
import BRIExplainerCard from './components/BRIExplainerCard';
import CalendarGuard from './components/CalendarGuard';
import BRIExplanationFeed from './components/BRIExplanationFeed';

import { useAccessibility } from './context/AccessibilityContext';
import { Heart, ThumbsUp, Inbox, Moon } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import WindDownRoutine from './components/WindDownRoutine';

export default function Home() {
  const { highContrast } = useAccessibility();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isWindDownOpen, setIsWindDownOpen] = useState(false);

  // Quick stats states
  const [outboxCount, setOutboxCount] = useState(0);
  const [kudosCount, setKudosCount] = useState(0);
  const [sentimentCount, setSentimentCount] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [eapUrl, setEapUrl] = useState<string | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user profile stats
        const fetchStats = async () => {
          try {
            const [profileRes, outboxRes, kudosRes, sentimentRes, adminRes] = await Promise.all([
              supabase.from('user_profiles').select('full_name').eq('id', session.user.id).single(),
              supabase.from('outbox_messages').select('id', { count: 'exact' }).eq('sender_id', session.user.id).eq('status', 'queued'),
              supabase.from('kudos_posts').select('id', { count: 'exact' }),
              supabase.from('mood_logs').select('id', { count: 'exact' }).eq('user_id', session.user.id),
              supabase.from('admin_configs').select('eap_referral_url').single()
            ]);

            if (profileRes.data) setUserProfile(profileRes.data);
            setOutboxCount(outboxRes.count || 0);
            setKudosCount(kudosRes.count || 0);
            setSentimentCount(sentimentRes.count || 0);
            if (adminRes.data) setEapUrl(adminRes.data.eap_referral_url);
          } catch (e) {
            console.error(e);
          }
        };
        fetchStats();
      }
    });
  }, [refreshTrigger]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner Card */}
      <div className={`p-4 sm:p-6 glass-card rounded-2xl border flex flex-col gap-6 transition-colors duration-300 ${highContrast ? 'border-black' : 'border-border-color'}`}>
        
        {/* Top Row: Welcome Text & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-neutral-800">
              Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Guardian'}.
            </h2>
            <p className="text-xs text-neutral-500 max-w-lg leading-relaxed">
              AxionHR Well-Being Guardian is monitoring locally. Your data is 100% private, anonymous, and encrypted inside this browser sandbox.
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
            {eapUrl && (
              <a 
                href={eapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none px-5 py-2.5 bg-neutral-100 text-neutral-800 rounded-xl hover:bg-neutral-200 border border-border-color transition-colors font-bold flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                <Heart className="w-4 h-4 text-rose-500" /> EAP Support
              </a>
            )}
            <button 
              onClick={() => setIsWindDownOpen(true)}
              className="flex-1 md:flex-none px-5 py-2.5 bg-neutral-800 text-white rounded-xl hover:bg-black transition-colors font-medium flex items-center justify-center gap-2 text-sm shadow-sm"
            >
               <Moon className="w-4 h-4 text-teal-400" /> Wind-Down
            </button>
          </div>
        </div>

        {/* Bottom Row: Micro Analytics Banner Row */}
        <div className="flex flex-wrap gap-3">
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50/50 border border-neutral-100 flex items-center gap-2 text-xs flex-1 sm:flex-none">
            <Inbox className="h-4.5 w-4.5 text-teal-600 shrink-0" />
            <div className="whitespace-nowrap">
              <span className="block text-[10px] text-neutral-400 font-semibold uppercase">Queued Mail</span>
              <span className="font-bold text-neutral-700">{outboxCount} locked</span>
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50/50 border border-neutral-100 flex items-center gap-2 text-xs flex-1 sm:flex-none">
            <ThumbsUp className="h-4.5 w-4.5 text-teal-600 shrink-0" />
            <div className="whitespace-nowrap">
              <span className="block text-[10px] text-neutral-400 font-semibold uppercase">Kudos Shared</span>
              <span className="font-bold text-neutral-700">{kudosCount} notes</span>
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50/50 border border-neutral-100 flex items-center gap-2 text-xs flex-1 sm:flex-none">
            <Heart className="h-4.5 w-4.5 text-teal-600 shrink-0" />
            <div className="whitespace-nowrap">
              <span className="block text-[10px] text-neutral-400 font-semibold uppercase">Sentiment Checks</span>
              <span className="font-bold text-neutral-700">{sentimentCount} logs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Widgets - Two Column Layout for better vertical packing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 focus-dimming-active items-start">
        
        {/* Left Column: Primary Focus / Wider (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 7-Day Burnout Risk heatmap */}
          <div className="focus-dimming-card glass-card rounded-2xl overflow-hidden flex flex-col">
            <BurnoutRiskIndex
              onNavigateToTab={() => {}}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Sentiment Trend Line chart */}
          <div className="focus-dimming-card glass-card rounded-2xl overflow-hidden flex flex-col">
            <SentimentTrendLine refreshTrigger={refreshTrigger} />
          </div>

          {/* Team Workload / k-Anonymity privacy state */}
          <div className="focus-dimming-card glass-card rounded-2xl overflow-hidden flex flex-col">
            <KAnonymityEmptyState />
          </div>

          {/* Calendar Guard */}
          <div className="focus-dimming-card glass-card rounded-2xl overflow-hidden flex flex-col">
            <CalendarGuard />
          </div>
        </div>

        {/* Right Column: Secondary / Actionable (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* GBDT Factor attribution explainer card */}
          <div className="focus-dimming-card glass-card rounded-2xl overflow-hidden flex flex-col">
            <BRIExplainerCard />
          </div>
          
          {/* BRI Explanation Feed */}
          <div className="focus-dimming-card glass-card rounded-2xl overflow-hidden flex flex-col">
            <BRIExplanationFeed refreshTrigger={refreshTrigger} />
          </div>

          {/* Right-to-Disconnect Queue */}
          <div className="focus-dimming-card glass-card rounded-2xl overflow-hidden flex flex-col">
            <RightToDisconnectOutbox
              onRefreshStats={triggerRefresh}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>

      </div>

      <WindDownRoutine 
        isOpen={isWindDownOpen} 
        onClose={() => setIsWindDownOpen(false)} 
        userProfile={userProfile} 
        outboxCount={outboxCount} 
      />
    </div>
  );
}
