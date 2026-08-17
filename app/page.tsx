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
import { Heart, ThumbsUp, Inbox } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

export default function Home() {
  const { highContrast } = useAccessibility();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Quick stats states
  const [outboxCount, setOutboxCount] = useState(0);
  const [kudosCount, setKudosCount] = useState(0);
  const [sentimentCount, setSentimentCount] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user profile stats
        const fetchStats = async () => {
          try {
            const [profileRes, outboxRes, kudosRes, sentimentRes] = await Promise.all([
              supabase.from('user_profiles').select('full_name').eq('id', session.user.id).single(),
              supabase.from('outbox_messages').select('id', { count: 'exact' }).eq('sender_id', session.user.id).eq('status', 'queued'),
              supabase.from('kudos_posts').select('id', { count: 'exact' }),
              supabase.from('mood_logs').select('id', { count: 'exact' }).eq('user_id', session.user.id)
            ]);

            if (profileRes.data) setUserProfile(profileRes.data);
            setOutboxCount(outboxRes.count || 0);
            setKudosCount(kudosRes.count || 0);
            setSentimentCount(sentimentRes.count || 0);
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
      <div className={`p-6 glass-card rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-300 ${highContrast ? 'border-black' : 'border-border-color'
        }`}>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-neutral-800">
            Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Guardian'}.
          </h2>
          <p className="text-xs text-neutral-500 max-w-lg leading-relaxed">
            AxionHR Well-Being Guardian is monitoring locally. Your data is 100% private, anonymous, and encrypted inside this browser sandbox.
          </p>
        </div>

        {/* Micro Analytics Banner Row */}
        <div className="flex flex-wrap gap-4 shrink-0">
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50/50 border border-neutral-100 flex items-center gap-2 text-xs">
            <Inbox className="h-4.5 w-4.5 text-teal-600" />
            <div>
              <span className="block text-[10px] text-neutral-400 font-semibold uppercase">Queued Mail</span>
              <span className="font-bold text-neutral-700">{outboxCount} locked</span>
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50/50 border border-neutral-100 flex items-center gap-2 text-xs">
            <ThumbsUp className="h-4.5 w-4.5 text-teal-600" />
            <div>
              <span className="block text-[10px] text-neutral-400 font-semibold uppercase">Kudos Shared</span>
              <span className="font-bold text-neutral-700">{kudosCount} notes</span>
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50/50 border border-neutral-100 flex items-center gap-2 text-xs">
            <Heart className="h-4.5 w-4.5 text-teal-600" />
            <div>
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
              onNavigateToTab={(tab) => {}}
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
    </div>
  );
}
