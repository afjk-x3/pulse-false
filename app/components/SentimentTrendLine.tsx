'use client';

import React, { useState, useEffect} from'react';
import { supabase} from'../lib/supabaseClient';
import { Database} from'../lib/database.types';
import { useAccessibility} from'../context/AccessibilityContext';
import { TrendingUp, Info} from'lucide-react';

type MoodLog = Database['public']['Tables']['mood_logs']['Row'];

// Local display shape — enriches MoodLog with a formatted day label
type MoodLogDisplay = MoodLog & { dayLabel: string};

interface SentimentTrendLineProps {
 refreshTrigger: number;
}

// Static mock records shown when the user has fewer than 5 real logs
const MOCK_HISTORICAL: MoodLogDisplay[] = [
 { id:'m-h1', user_id:'', dayLabel:'Mon', mood_score: 4, energy_level: null, created_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString()},
 { id:'m-h2', user_id:'', dayLabel:'Tue', mood_score: 3, energy_level: null, created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()},
 { id:'m-h3', user_id:'', dayLabel:'Wed', mood_score: 5, energy_level: null, created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString()},
 { id:'m-h4', user_id:'', dayLabel:'Thu', mood_score: 2, energy_level: null, created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()},
 { id:'m-h5', user_id:'', dayLabel:'Fri', mood_score: 4, energy_level: null, created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()},
 { id:'m-h6', user_id:'', dayLabel:'Sat', mood_score: 4, energy_level: null, created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString()},
];

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function SentimentTrendLine({ refreshTrigger}: SentimentTrendLineProps) {
 const { highContrast} = useAccessibility();
 const [logs, setLogs] = useState<MoodLogDisplay[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [hoveredPoint, setHoveredPoint] = useState<{ index: number; score: number; label: string} | null>(null);

 useEffect(() => {
 const fetchLogs = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) {
 setLogs(MOCK_HISTORICAL.slice(-7));
 return;
}

 const { data, error: fetchError} = await supabase
 .from('mood_logs')
 .select('*')
 .eq('user_id', user.id)
 .order('created_at', { ascending: false})
 .limit(7);

 if (fetchError) throw fetchError;

 // Enrich with a day label for the X axis
 let realLogs: MoodLogDisplay[] = (data ?? [])
 .reverse()
 .map((log) => ({
 ...log,
 dayLabel: DAY_LABELS[new Date(log.created_at).getDay()],
}));

 // Seed with mock historical data when fewer than 5 real logs exist
 if (realLogs.length < 5) {
 realLogs = [...MOCK_HISTORICAL, ...realLogs];
}

 setLogs(realLogs.slice(-7));
} catch (err) {
 setError('Could not load sentiment history.');
 console.error(err);
} finally {
 setIsLoading(false);
}
};

 fetchLogs();
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
 if (logs.length === 0) return'';
 return logs.map((log, idx) => {
 const x = getX(idx, logs.length);
 const y = getY(log.mood_score);
 return `${idx === 0 ?'M' :'L'} ${x} ${y}`;
}).join('');
};

 // Build the area command (for shading underneath)
 const getAreaPath = () => {
 if (logs.length === 0) return'';
 const linePath = getLinePath();
 const firstX = getX(0, logs.length);
 const lastX = getX(logs.length - 1, logs.length);
 const bottomY = height - paddingY;
 return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
};

 const getMoodLabel = (score: number) => {
 if (score === 1) return'Struggling';
 if (score === 2) return'Fatigued';
 if (score === 3) return'Neutral';
 if (score === 4) return'Good';
 return'Energized';
};

 return (
 <article
 className={`p-6 glass-card rounded-2xl border focus-dimming-card shadow-xs ${
 highContrast ?'border-black text-black' :'border-border-color'
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

 {isLoading ? (
 <div className="h-44 flex items-center justify-center">
 <div className="flex gap-1.5">
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'0ms'}} />
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'150ms'}} />
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'300ms'}} />
 </div>
 </div>
 ) : error ? (
 <div className="h-44 flex items-center justify-center text-xs text-red-500">
 {error}
 </div>
 ) : logs.length === 0 ? (
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
 stroke={highContrast ?'#000' :'#f1f0ea'}
 strokeWidth={1}
 strokeDasharray={score === 3 ?'0' :'4 4'}
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
 stroke={highContrast ?'#000' :'#0d9488'}
 strokeWidth={2.5}
 strokeLinecap="round"
 strokeLinejoin="round"
 />

 {/* Data nodes */}
 {logs.map((log, idx) => {
 const x = getX(idx, logs.length);
 const y = getY(log.mood_score);
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
 onMouseEnter={() => setHoveredPoint({ index: idx, score: log.mood_score, label: log.dayLabel})}
 onMouseLeave={() => setHoveredPoint(null)}
 tabIndex={0}
 onFocus={() => setHoveredPoint({ index: idx, score: log.mood_score, label: log.dayLabel})}
 onBlur={() => setHoveredPoint(null)}
 aria-label={`Log ${idx + 1}: score ${log.mood_score} (${getMoodLabel(log.mood_score)}) on ${log.dayLabel}`}
 />
 {/* Core data node */}
 <circle
 cx={x}
 cy={y}
 r={isHovered ? 6 : 4}
 fill={isHovered ? (highContrast ?'#000' :'#0f766e') : (highContrast ?'#fff' :'#0d9488')}
 stroke={highContrast ?'#000' :'#ffffff'}
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
 {log.dayLabel}
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
 highContrast ?'border-black' :'border-border-color'
}`}>
 <span>{hoveredPoint.label}: {hoveredPoint.score} — {getMoodLabel(hoveredPoint.score)}</span>
 </div>
 )}
 </div>
 )}

 {/* Explanatory footer */}
 <div className={`mt-4 p-3 rounded-xl border bg-neutral-50/50 flex items-start gap-1.5 text-[10px] text-neutral-400 ${
 highContrast ?'border-black text-black font-semibold' :'border-neutral-100'
}`}>
 <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
 <p className="leading-snug">
 This rolling sentiment baseline acts as a key feature vector inside the local Burnout Risk calculator, helping contextualize cognitive fatigue thresholds.
 </p>
 </div>
 </article>
 );
}
