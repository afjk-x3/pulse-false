'use client';

import React, { useState, useEffect, useCallback} from'react';
import { Heart, X, Check, Smile} from'lucide-react';
import { supabase} from'../lib/supabaseClient';
import { Database} from'../lib/database.types';
import { useAccessibility} from'../context/AccessibilityContext';

type AdminConfig = Database['public']['Tables']['admin_configs']['Row'];

interface SentimentWidgetProps {
 onLogSaved: () => void;
}

export default function SentimentWidget({ onLogSaved}: SentimentWidgetProps) {
 const { highContrast} = useAccessibility();
 const [isExpanded, setIsExpanded] = useState(true);
 const [isHidden, setIsHidden] = useState(false);
 const [lastLoggedTime, setLastLoggedTime] = useState<string | null>(null);
 const [showSuccess, setShowSuccess] = useState(false);
 const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);

 // Swipe to dismiss states
 const [swipeOffset, setSwipeOffset] = useState(0);
 const [touchStart, setTouchStart] = useState<number | null>(null);

 const moods = [
 { score: 1, emoji:'😢', label:'Struggling', color:'hover:bg-red-50 text-red-600'},
 { score: 2, emoji:'😕', label:'Fatigued', color:'hover:bg-orange-50 text-orange-600'},
 { score: 3, emoji:'😐', label:'Neutral', color:'hover:bg-amber-50 text-amber-600'},
 { score: 4, emoji:'🙂', label:'Good', color:'hover:bg-blue-50 text-blue-600'},
 { score: 5, emoji:'😄', label:'Energized', color:'hover:bg-green-50 text-green-600'},
 ];

 // Load admin config for working hours calculation
 useEffect(() => {
 const fetchAdminConfig = async () => {
 const { data} = await supabase
 .from('admin_configs')
 .select('*')
 .single();
 if (data) setAdminConfig(data);
};
 fetchAdminConfig();
}, []);

 const isNearEndOfWorkingHours = useCallback(() => {
 try {
 if (!adminConfig || !adminConfig.standard_workday_end) return false;

 const [endHour, endMin] = adminConfig.standard_workday_end.split(':').map(Number);
 const now = new Date();
 const nowMinutes = now.getHours() * 60 + now.getMinutes();
 const endMinutes = endHour * 60 + endMin;

 // Near end is defined as within 60 minutes before workingHoursEnd or anytime after
 return nowMinutes >= (endMinutes - 60);
} catch (e) {
 console.error('Error calculating working hours end:', e);
 return false;
}
}, [adminConfig]);

 // Periodic Launch Trigger (Automated, every 4 hours)
 useEffect(() => {
 const timer = setTimeout(async () => {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) return;

 const todayStart = new Date();
 todayStart.setHours(0, 0, 0, 0);

 const { data: logs} = await supabase
 .from('mood_logs')
 .select('created_at')
 .eq('user_id', user.id)
 .gte('created_at', todayStart.toISOString())
 .order('created_at', { ascending: false})
 .limit(1);

 const hasLoggedToday = logs && logs.length > 0;
 let hasLoggedRecently = false;
 const fourHoursMs = 4 * 60 * 60 * 1000;

 if (hasLoggedToday && logs[0]) {
 const logDate = new Date(logs[0].created_at);
 setLastLoggedTime(
 logDate.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})
 );
 
 if (Date.now() - logDate.getTime() < fourHoursMs) {
 hasLoggedRecently = true;
 }
 }

 const lastTriggeredStr = localStorage.getItem('pulse-last-triggered-timestamp');
 const lastTriggered = lastTriggeredStr ? parseInt(lastTriggeredStr, 10) : 0;
 const timeSinceLastTrigger = Date.now() - lastTriggered;

 if (!hasLoggedRecently) {
 if (timeSinceLastTrigger > fourHoursMs) {
 setIsExpanded(true);
 localStorage.setItem('pulse-last-triggered-timestamp', Date.now().toString());
 } else {
 setIsExpanded(false);
 }
 } else {
 setIsExpanded(false);
 }
}, 0);

 return () => clearTimeout(timer);
}, []);

 // End-of-Day Exit Trigger (Automated, capped at 1/day)
 useEffect(() => {
 const handleVisibilityChange = async () => {
 if (document.visibilityState ==='hidden') {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) return;

 const todayStr = new Date().toDateString();
 const todayStart = new Date();
 todayStart.setHours(0, 0, 0, 0);

 const { data: logs} = await supabase
 .from('mood_logs')
 .select('id')
 .eq('user_id', user.id)
 .gte('created_at', todayStart.toISOString())
 .limit(1);

 const hasLoggedToday = logs && logs.length > 0;
 const exitTriggeredDate = localStorage.getItem('pulse-exit-checkin-triggered-date');
 const alreadyExitTriggeredToday = exitTriggeredDate === todayStr;

 if (!hasLoggedToday && !alreadyExitTriggeredToday && isNearEndOfWorkingHours()) {
 localStorage.setItem('pulse-exit-checkin-triggered-date', todayStr);
 setIsExpanded(true);
}
}
};

 document.addEventListener('visibilitychange', handleVisibilityChange);
 return () => {
 document.removeEventListener('visibilitychange', handleVisibilityChange);
};
}, [isNearEndOfWorkingHours]);

 const handleMoodSelect = async (score: number) => {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) return;

 const { error} = await supabase.from('mood_logs').insert({
 user_id: user.id,
 mood_score: score,
});

 if (!error) {
 const nowStr = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'});
 setLastLoggedTime(nowStr);
 setShowSuccess(true);
 onLogSaved();

 // Transition from success to minimized state
 setTimeout(() => {
 setShowSuccess(false);
 setIsExpanded(false);
}, 2500);
}
};

 if (isHidden) return null;

 const handleTouchStart = (e: React.TouchEvent) => {
 setTouchStart(e.targetTouches[0].clientX);
 };

 const handleTouchMove = (e: React.TouchEvent) => {
 if (touchStart === null) return;
 const currentTouch = e.targetTouches[0].clientX;
 const diff = currentTouch - touchStart;
 
 // Allow swiping right to dismiss
 if (diff > 0) {
 setSwipeOffset(diff);
 }
 };

 const handleTouchEnd = () => {
 if (swipeOffset > 50) {
 // Swiped far enough to dismiss
 setIsHidden(true);
 }
 // Reset offset
 setSwipeOffset(0);
 setTouchStart(null);
 };

 if (!isExpanded) {
 return (
 <div 
 className="fixed bottom-6 right-6 z-40 group"
 onTouchStart={handleTouchStart}
 onTouchMove={handleTouchMove}
 onTouchEnd={handleTouchEnd}
 style={{ 
 transform: `translateX(${swipeOffset}px)`,
 opacity: swipeOffset > 0 ? Math.max(0, 1 - swipeOffset / 100) : 1,
 transition: touchStart === null ? 'transform 0.2s ease-out, opacity 0.2s ease-out' : 'none'
 }}
 >
 <div className="relative">
 <button
 onClick={() => setIsExpanded(true)}
 className={`flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-xl hover:bg-teal-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
 highContrast ?'bg-black text-white border-2 border-white' :''
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
 <button
 onClick={(e) => { e.stopPropagation(); setIsHidden(true); }}
 className="hidden lg:flex absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-full p-1 shadow-md border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-teal-500 z-10"
 aria-label="Dismiss widget completely"
 title="Dismiss"
 >
 <X className="h-3 w-3" />
 </button>
 </div>
 </div>
 );
 }

 return (
 <div
 className={`fixed bottom-6 right-6 z-40 w-80 p-5 rounded-2xl bg-white shadow-2xl border transition-all duration-300 ${
 highContrast ?'border-black text-black' :'border-neutral-100'
}`}
 role="complementary"
 aria-label="Daily mood survey card"
 >
 {/* Header */}
 <div className="flex items-center justify-between mb-3.5">
 <div className="flex items-center gap-1.5 text-teal-700 font-bold text-sm">
 <Heart className={`h-4.5 w-4.5 fill-teal-600 text-teal-600 ${highContrast ?'text-black fill-black' :''}`} />
 <span className={highContrast ?'text-black' :''}>Pulse Check</span>
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
 onClick={() => handleMoodSelect(mood.score)}
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
