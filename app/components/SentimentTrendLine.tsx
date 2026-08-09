'use client';

import React, { useState, useEffect } from 'react';
import { PulseDB, SentimentRecord } from '../lib/db';
import { useAccessibility } from '../context/AccessibilityContext';
import { TrendingUp, Info } from 'lucide-react';

interface SentimentTrendLineProps {
  refreshTrigger: number;
}

export default function SentimentTrendLine({ refreshTrigger }: SentimentTrendLineProps) {
  const { highContrast } = useAccessibility();
  const [logs, setLogs] = useState<SentimentRecord[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; score: number; label: string } | null>(null);

  useEffect(() => {
    // Fetch sentiment logs
    let rawLogs = PulseDB.getSentimentLogs();
    
    // Seed initial mock records if log history is thin, to display a beautiful trend
    if (rawLogs.length < 5) {
      const mockHistorical: SentimentRecord[] = [
        { id: 'm-h1', date: 'Mon', score: 4, emoji: '🙂', timestamp: Date.now() - 3600000 * 24 * 6 },
        { id: 'm-h2', date: 'Tue', score: 3, emoji: '😐', timestamp: Date.now() - 3600000 * 24 * 5 },
        { id: 'm-h3', date: 'Wed', score: 5, emoji: '😄', timestamp: Date.now() - 3600000 * 24 * 4 },
        { id: 'm-h4', date: 'Thu', score: 2, emoji: '😕', timestamp: Date.now() - 3600000 * 24 * 3 },
        { id: 'm-h5', date: 'Fri', score: 4, emoji: '🙂', timestamp: Date.now() - 3600000 * 24 * 2 },
        { id: 'm-h6', date: 'Sat', score: 4, emoji: '🙂', timestamp: Date.now() - 3600000 * 24 * 1 },
      ];
      // Combine mock historical and current logs
      rawLogs = [...mockHistorical, ...rawLogs];
    }
    
    // Keep only the last 7 entries for rolling view
    const timer = setTimeout(() => {
      setLogs(rawLogs.slice(-7));
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshTrigger]);

  // SVG Chart Dimensions
  const width = 450;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Map 1-5 scores to Y coordinates (inverted since SVG 0 is top)
  const getY = (score: number) => {
    // Score ranges 1 to 5. Map 5 to top (paddingY), 1 to bottom (height - paddingY)
    const ratio = (score - 1) / 4;
    return height - paddingY - ratio * chartHeight;
  };

  // Map indexes to X coordinates
  const getX = (index: number, total: number) => {
    if (total <= 1) return paddingX + chartWidth / 2;
    return paddingX + (index / (total - 1)) * chartWidth;
  };

  // Build the path SVG command
  const getLinePath = () => {
    if (logs.length === 0) return '';
    return logs.map((log, idx) => {
      const x = getX(idx, logs.length);
      const y = getY(log.score);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Build the area command (for shading underneath)
  const getAreaPath = () => {
    if (logs.length === 0) return '';
    const linePath = getLinePath();
    const firstX = getX(0, logs.length);
    const lastX = getX(logs.length - 1, logs.length);
    const bottomY = height - paddingY;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const getMoodLabel = (score: number) => {
    if (score === 1) return 'Struggling';
    if (score === 2) return 'Fatigued';
    if (score === 3) return 'Neutral';
    if (score === 4) return 'Good';
    return 'Energized';
  };

  return (
    <article 
      className={`p-6 bg-white rounded-2xl border focus-dimming-card shadow-xs ${
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}
      aria-labelledby="sentiment-trend-title"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-600" />
          <h2 id="sentiment-trend-title" className="text-base font-bold text-neutral-800">
            Sentiment Trend History
          </h2>
        </div>
        <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
          7-Log Rolling View
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-neutral-400">
          No sentiment history available.
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" role="img" aria-label="Sentiment history graph">
            {/* Gridlines */}
            {[1, 2, 3, 4, 5].map((score) => {
              const y = getY(score);
              return (
                <g key={score}>
                  <line 
                    x1={paddingX} 
                    y1={y} 
                    x2={width - paddingX} 
                    y2={y} 
                    stroke={highContrast ? '#000' : '#f1f0ea'} 
                    strokeWidth={1}
                    strokeDasharray={score === 3 ? '0' : '4 4'}
                  />
                  <text 
                    x={paddingX - 10} 
                    y={y + 4} 
                    textAnchor="end" 
                    className="text-[9px] font-bold text-neutral-400 fill-current"
                  >
                    {score}
                  </text>
                </g>
              );
            })}

            {/* Shaded Area underneath */}
            {!highContrast && (
              <path 
                d={getAreaPath()} 
                fill="url(#sentiment-gradient)" 
                className="opacity-40"
              />
            )}

            {/* Line Path */}
            <path 
              d={getLinePath()} 
              fill="none" 
              stroke={highContrast ? '#000' : '#0d9488'} 
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data nodes */}
            {logs.map((log, idx) => {
              const x = getX(idx, logs.length);
              const y = getY(log.score);
              const isHovered = hoveredPoint?.index === idx;

              return (
                <g key={log.id}>
                  {/* Outer circle for hover focus area */}
                  <circle
                    cx={x}
                    cy={y}
                    r={12}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint({ index: idx, score: log.score, label: log.date })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    tabIndex={0}
                    onFocus={() => setHoveredPoint({ index: idx, score: log.score, label: log.date })}
                    onBlur={() => setHoveredPoint(null)}
                    aria-label={`Log ${idx + 1}: score ${log.score} (${getMoodLabel(log.score)}) on ${log.date}`}
                  />
                  {/* Core data node */}
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={isHovered ? 6 : 4} 
                    fill={isHovered ? (highContrast ? '#000' : '#0f766e') : (highContrast ? '#fff' : '#0d9488')} 
                    stroke={highContrast ? '#000' : '#ffffff'} 
                    strokeWidth={1.5}
                    className="pointer-events-none transition-all duration-150"
                  />
                </g>
              );
            })}

            {/* X Axis Labels */}
            {logs.map((log, idx) => {
              const x = getX(idx, logs.length);
              return (
                <text 
                  key={log.id} 
                  x={x} 
                  y={height - 6} 
                  textAnchor="middle" 
                  className="text-[9px] font-bold text-neutral-400 fill-current"
                >
                  {log.date}
                </text>
              );
            })}

            {/* Gradient definitions */}
            <defs>
              <linearGradient id="sentiment-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#faf9f6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Interactive node hover overlays */}
          {hoveredPoint && (
            <div className={`absolute top-0 right-0 py-1 px-2.5 rounded-lg border bg-white shadow-md text-[10px] leading-tight font-bold z-10 text-neutral-700 animate-fade-in ${
              highContrast ? 'border-black' : 'border-neutral-200'
            }`}>
              <span>{hoveredPoint.label}: {hoveredPoint.score} — {getMoodLabel(hoveredPoint.score)}</span>
            </div>
          )}
        </div>
      )}

      {/* Explanatory footer */}
      <div className={`mt-4 p-3 rounded-xl border bg-neutral-50/50 flex items-start gap-1.5 text-[10px] text-neutral-400 ${
        highContrast ? 'border-black text-black font-semibold' : 'border-neutral-100'
      }`}>
        <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
        <p className="leading-snug">
          This rolling sentiment baseline acts as a key feature vector inside the local Burnout Risk calculator, helping contextualize cognitive fatigue thresholds.
        </p>
      </div>
    </article>
  );
}
