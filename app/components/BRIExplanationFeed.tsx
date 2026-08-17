'use client';

import React, { useState, useEffect} from'react';
import { Bell, ArrowRight, ChevronRight, X, TrendingUp, TrendingDown} from'lucide-react';
import { supabase} from'../lib/supabaseClient';
import { Database} from'../lib/database.types';
import { useAccessibility} from'../context/AccessibilityContext';

type BRIShiftRecord = Database['public']['Tables']['bri_shift_records']['Row'];

// Shape of each factor stored inside the feature_weights JSONB column
interface FeatureFactor {
 name: string;
 weight: number;
 details: string;
}

interface BRIExplanationFeedProps {
 refreshTrigger: number;
}

export default function BRIExplanationFeed({ refreshTrigger}: BRIExplanationFeedProps) {
 const { highContrast} = useAccessibility();
 const [shifts, setShifts] = useState<BRIShiftRecord[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [selectedShift, setSelectedShift] = useState<BRIShiftRecord | null>(null);

 useEffect(() => {
 const fetchShifts = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) return;

 const { data, error: fetchError} = await supabase
 .from('bri_shift_records')
 .select('*')
 .eq('user_id', user.id)
 .order('created_at', { ascending: true});

 if (fetchError) throw fetchError;
 setShifts(data ?? []);
} catch (err) {
 setError('Could not load BRI shift history.');
 console.error(err);
} finally {
 setIsLoading(false);
}
};

 fetchShifts();
}, [refreshTrigger]);

 const getBandColor = (band: string) => {
 if (band ==='Low') return'text-emerald-700 bg-emerald-50 border-emerald-200';
 if (band ==='Moderate') return'text-blue-700 bg-blue-50 border-blue-200';
 return'text-red-700 bg-red-50 border-red-200';
};

 const getBandDotColor = (band: string) => {
 if (band ==='Low') return'bg-emerald-500';
 if (band ==='Moderate') return'bg-blue-500';
 return'bg-red-500';
};

 const isEscalation = (from: string, to: string) => {
 const order = ['Low','Moderate','Elevated'];
 return order.indexOf(to) > order.indexOf(from);
};

 const formatTime = (iso: string) => {
 const d = new Date(iso);
 return d.toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
};

 // Safely extract the factors array from the JSONB feature_weights column
 const getFactors = (shift: BRIShiftRecord): FeatureFactor[] => {
 const fw = shift.feature_weights;
 if (!fw || typeof fw !=='object') return [];

 // feature_weights stored as { factors: FeatureFactor[]}
 const raw = (fw as Record<string, unknown>).factors;
 if (!Array.isArray(raw)) return [];

 return raw as FeatureFactor[];
};

 return (
 <>
 <section
 className={`p-6 glass-card rounded-2xl border shadow-xs ${
 highContrast ?'border-black text-black' :'border-border-color'
}`}
 aria-labelledby="bri-feed-title"
 >
 {/* Header */}
 <div className="flex items-center justify-between mb-5">
 <div className="flex items-center gap-2">
 <Bell className="h-5 w-5 text-teal-600" />
 <h2 id="bri-feed-title" className="text-base font-bold text-neutral-800">
 Burnout Risk Change Log
 </h2>
 </div>
 {shifts.length > 0 && (
 <span className="px-2.5 py-1 bg-neutral-100 text-neutral-500 rounded-full text-[9px] font-bold">
 {shifts.length} event{shifts.length !== 1 ?'s' :''}
 </span>
 )}
 </div>

 {isLoading ? (
 <div className="py-8 flex items-center justify-center">
 <div className="flex gap-1.5">
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'0ms'}} />
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'150ms'}} />
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'300ms'}} />
 </div>
 </div>
 ) : error ? (
 <div className="py-8 text-center text-xs text-red-500">{error}</div>
 ) : shifts.length === 0 ? (
 <div className="py-8 text-center space-y-2">
 <div className="h-12 w-12 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center mx-auto">
 <TrendingUp className="h-5 w-5 text-neutral-300" />
 </div>
 <p className="text-xs font-semibold text-neutral-500">No category shifts recorded yet.</p>
 <p className="text-[10px] text-neutral-400">Your Burnout Risk Index has been stable. Shifts are logged when your band changes (e.g. Low → Elevated).</p>
 </div>
 ) : (
 <div className="space-y-2">
 {[...shifts].reverse().map(shift => (
 <button
 key={shift.id}
 onClick={() => setSelectedShift(shift)}
 className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
 highContrast ?'border-black hover:bg-neutral-100' :'border-neutral-100 hover:border-border-color glass-card'
}`}
 >
 {/* Direction indicator */}
 <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
 isEscalation(shift.previous_band, shift.new_band) ?'bg-red-50 text-red-600' :'bg-emerald-50 text-emerald-600'
}`}>
 {isEscalation(shift.previous_band, shift.new_band) ? (
 <TrendingUp className="h-4 w-4" />
 ) : (
 <TrendingDown className="h-4 w-4" />
 )}
 </div>

 {/* Labels */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getBandColor(shift.previous_band)}`}>{shift.previous_band}</span>
 <ArrowRight className="h-3 w-3 text-neutral-300 shrink-0" />
 <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getBandColor(shift.new_band)}`}>{shift.new_band}</span>
 </div>
 <span className="block text-[10px] text-neutral-400 mt-1">{formatTime(shift.created_at)}</span>
 </div>

 <ChevronRight className="h-4 w-4 text-neutral-300 shrink-0" />
 </button>
 ))}
 </div>
 )}
 </section>

 {/* Attribution Drawer (Slide-out overlay) */}
 {selectedShift && (
 <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
 {/* Backdrop */}
 <div
 className="absolute inset-0 bg-neutral-900/20 backdrop-blur-xs"
 onClick={() => setSelectedShift(null)}
 aria-hidden="true"
 />

 {/* Drawer */}
 <div className="relative w-full max-w-md glass-card shadow-2xl border-l border-neutral-100 overflow-y-auto animate-slide-left">
 <div className="p-6 space-y-6">
 {/* Drawer header */}
 <div className="flex items-start justify-between">
 <div className="space-y-1">
 <h3 id="drawer-title" className="text-sm font-bold text-neutral-800">Category Shift Details</h3>
 <p className="text-[10px] text-neutral-400">{formatTime(selectedShift.created_at)}</p>
 </div>
 <button
 onClick={() => setSelectedShift(null)}
 className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
 aria-label="Close drawer"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* Shift direction */}
 <div className="flex items-center justify-center gap-4 py-4">
 <div className="text-center">
 <div className={`h-3 w-3 rounded-full mx-auto mb-1.5 ${getBandDotColor(selectedShift.previous_band)}`} />
 <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getBandColor(selectedShift.previous_band)}`}>{selectedShift.previous_band}</span>
 </div>
 <ArrowRight className="h-5 w-5 text-neutral-300" />
 <div className="text-center">
 <div className={`h-3 w-3 rounded-full mx-auto mb-1.5 ${getBandDotColor(selectedShift.new_band)}`} />
 <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getBandColor(selectedShift.new_band)}`}>{selectedShift.new_band}</span>
 </div>
 </div>

 {/* Top 3 factors */}
 <div className="space-y-1.5">
 <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
 Top 3 Contributing Factors at Time of Shift
 </span>
 <div className="space-y-3 mt-3">
 {getFactors(selectedShift).length === 0 ? (
 <p className="text-xs text-neutral-400 italic">No factor breakdown available for this shift.</p>
 ) : (
 getFactors(selectedShift).map((factor, i) => (
 <div key={i} className="space-y-1.5">
 <div className="flex items-center justify-between text-xs">
 <span className="font-bold text-neutral-700">{factor.name}</span>
 <span className="font-extrabold text-neutral-400">{factor.weight}%</span>
 </div>
 <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all duration-500 ${
 i === 0 ?'bg-orange-500' : i === 1 ?'bg-teal-600' :'bg-neutral-500'
}`}
 style={{ width: `${factor.weight}%`}}
 />
 </div>
 <p className="text-[10px] text-neutral-400 leading-snug">{factor.details}</p>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Disclaimer */}
 <div className="pt-4 border-t border-neutral-100">
 <p className="text-[10px] text-neutral-400 leading-relaxed">
 These factors are derived from your local GBDT decision model at the time of the category shift. Attribution weights are approximate and never leave your browser sandbox.
 </p>
 </div>
 </div>
 </div>
 </div>
 )}
 </>
 );
}
