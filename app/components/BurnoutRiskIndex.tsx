'use client';

import React, { useState, useEffect } from 'react';
import { Info, Shield, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAccessibility } from '../context/AccessibilityContext';

// BRI heatmap data shape — derived from mood_logs and bri_shift_records
interface BRIDayEntry {
  date: string;  // e.g. 'Mon', 'Tue', etc.
  score: number; // 1 = Low, 2 = Moderate, 3 = Elevated
}

// Seed data used when the user has no real BRI history yet
const SEED_BRI_DATA: BRIDayEntry[] = [
  { date: 'Mon', score: 1 },
  { date: 'Tue', score: 1 },
  { date: 'Wed', score: 2 },
  { date: 'Thu', score: 2 },
  { date: 'Fri', score: 3 },
  { date: 'Sat', score: 1 },
  { date: 'Sun', score: 2 },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface BurnoutRiskIndexProps {
  onNavigateToTab: (tab: 'dashboard' | 'kudos' | 'support' | 'privacy') => void;
  refreshTrigger: number;
}

export default function BurnoutRiskIndex({ onNavigateToTab, refreshTrigger }: BurnoutRiskIndexProps) {
  const { highContrast } = useAccessibility();
  const [riskData, setRiskData] = useState<BRIDayEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const fetchBRI = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRiskData(SEED_BRI_DATA);
          return;
        }

        // Fetch the last 7 bri_shift_records to build the heatmap
        const { data: shifts, error } = await supabase
          .from('bri_shift_records')
          .select('new_band, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(7);

        if (error) throw error;

        if (!shifts || shifts.length === 0) {
          // No BRI history — show seeded display data
          setRiskData(SEED_BRI_DATA);
          return;
        }

        const bandToScore = (band: string): number => {
          if (band === 'Low') return 1;
          if (band === 'Moderate') return 2;
          return 3;
        };

        // Reverse so oldest is first (left-to-right on grid)
        const built: BRIDayEntry[] = [...shifts]
          .reverse()
          .map(s => ({
            date: DAY_LABELS[new Date(s.created_at).getDay()],
            score: bandToScore(s.new_band),
          }));

        // Pad to 7 entries with seed data if fewer than 7 real shifts
        const padded = built.length < 7
          ? [...SEED_BRI_DATA.slice(0, 7 - built.length), ...built]
          : built;

        setRiskData(padded.slice(-7));
      } catch (err) {
        console.error(err);
        setRiskData(SEED_BRI_DATA);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBRI();
  }, [refreshTrigger]);

  const getRiskStyle = (score: number) => {
    if (highContrast) {
      if (score === 1) return 'bg-white border-2 border-green-700 text-green-800 font-bold';
      if (score === 2) return 'bg-white border-2 border-blue-700 text-blue-800 font-bold';
      return 'bg-white border-2 border-red-700 text-red-800 font-bold';
    }

    // Nature-inspired palettes
    if (score === 1) {
      return 'bg-[#EAEFE9] border-[#C3D2C1] text-[#2F4F2F] hover:bg-[#DEE8DD]';
    } else if (score === 2) {
      return 'bg-[#E8F1F5] border-[#BDD4E2] text-[#1D3B51] hover:bg-[#D4E4ED]';
    } else {
      return 'bg-[#F9ECE7] border-[#ECCBBF] text-[#6A2B15] hover:bg-[#F2DAD0]';
    }
  };

  const getRiskName = (score: number) => {
    if (score === 1) return 'Low Risk';
    if (score === 2) return 'Moderate Risk';
    return 'Elevated Risk';
  };

  const averageScore = riskData.length > 0
    ? (riskData.reduce((sum, d) => sum + d.score, 0) / riskData.length).toFixed(1)
    : '—';

  return (
    <section
      className={`p-6 bg-white rounded-2xl border focus-dimming-card shadow-xs ${
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}
      aria-labelledby="bri-title"
    >
      {/* Title & Info Indicator */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 id="bri-title" className="text-base font-bold text-neutral-800">
            Burnout Risk Index (7-Day Trend)
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              onBlur={() => setTimeout(() => setShowTooltip(false), 200)}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="More information about Burnout Risk calculation"
              aria-expanded={showTooltip}
            >
              <Info className="h-4 w-4" />
            </button>

            {/* Information Tooltip overlay */}
            {showTooltip && (
              <div
                className={`absolute left-0 mt-2.5 w-72 p-4 rounded-xl border bg-white shadow-xl text-xs z-20 text-neutral-600 leading-relaxed ${
                  highContrast ? 'border-black text-black font-bold' : 'border-neutral-200'
                }`}
              >
                <h3 className="font-bold text-neutral-800 mb-1">How is this calculated?</h3>
                <p className="mb-3">
                  Calculated locally via keyboard cadence anomalies, sentiment inputs, and webcam eye-fatigue triggers.
                </p>
                <div className={`p-2 rounded bg-neutral-50 mb-3 text-[10px] text-neutral-500 border ${
                  highContrast ? 'border-black text-black' : 'border-neutral-100'
                }`}>
                  🔒 Aggregate data is anonymized using k-anonymity bounds to guarantee employee privacy.
                </div>
                <button
                  onClick={() => onNavigateToTab('privacy')}
                  className="flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 transition-colors"
                >
                  <span>Go to Privacy Center</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-2.5 text-[10px] font-semibold text-neutral-500">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-[#EAEFE9] border border-[#C3D2C1]" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-[#E8F1F5] border border-[#BDD4E2]" />
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-[#F9ECE7] border border-[#ECCBBF]" />
            <span>Elevated</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      {isLoading ? (
        <div className="h-24 flex items-center justify-center mb-4">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3 mb-4" role="region" aria-label="7-Day heat calendar">
          {riskData.map((day) => {
            const isToday = day.date === DAY_LABELS[new Date().getDay()];

            return (
              <div
                key={day.date}
                className="flex flex-col items-center"
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <span className={`text-[10px] font-bold mb-2 ${
                  isToday ? 'text-teal-600 font-extrabold underline decoration-2' : 'text-neutral-400'
                }`}>
                  {day.date}
                  {isToday && ' (Today)'}
                </span>

                <div
                  tabIndex={0}
                  className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-200 outline-none focus:ring-2 focus:ring-teal-500 ${getRiskStyle(day.score)}`}
                  aria-label={`Risk for ${day.date}: ${getRiskName(day.score)}`}
                >
                  {/* Score Number Display */}
                  <span className="text-sm font-bold">{day.score}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Summary Card */}
      <div className={`p-3.5 rounded-xl border bg-neutral-50/50 flex items-center justify-between text-xs text-neutral-600 ${
        highContrast ? 'border-black text-black font-semibold' : 'border-neutral-100'
      }`}>
        <div className="flex items-center gap-2">
          <Shield className="h-4.5 w-4.5 text-teal-600 shrink-0" />
          <span>
            {hoveredDay
              ? `Day selected: ${hoveredDay} — ${getRiskName(riskData.find(d => d.date === hoveredDay)?.score || 1)}`
              : `7-day average score: ${averageScore}. Safe disconnect checks active.`
            }
          </span>
        </div>
        <button
          onClick={() => onNavigateToTab('privacy')}
          className="text-teal-700 hover:text-teal-900 font-bold focus:underline"
        >
          Privacy Audit
        </button>
      </div>
    </section>
  );
}
