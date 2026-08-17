'use client';

import React, { useState, useEffect} from'react';
import { Calendar, Clock, AlertTriangle, Check, ChevronRight, ChevronLeft, Zap} from'lucide-react';
import { supabase} from'../lib/supabaseClient';
import { Database} from'../lib/database.types';
import { useAccessibility} from'../context/AccessibilityContext';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type ScheduledMeeting = Database['public']['Tables']['scheduled_meetings']['Row'];

interface InviteeStatus {
 profile: UserProfile;
 localTime: string;
 isOutside: boolean;
 warning: string;
}

// Simplified static UTC offset map for client-side timezone math
const TZ_OFFSETS: Record<string, number> = {
'America/New_York': -4,
'America/Chicago': -5,
'America/Los_Angeles': -7,
'Europe/London': 1,
'Europe/Berlin': 2,
'Asia/Tokyo': 9,
'Asia/Singapore': 8,
'Asia/Manila': 8,
'Australia/Sydney': 10,
};

export default function CalendarGuard() {
 const { highContrast} = useAccessibility();

 const [meetingTitle, setMeetingTitle] = useState('');
 const [meetingDate, setMeetingDate] = useState('');
 const [meetingStart, setMeetingStart] = useState('10:00');
 const [meetingEnd, setMeetingEnd] = useState('11:00');
 const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
 const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
 const [inviteeStatuses, setInviteeStatuses] = useState<InviteeStatus[]>([]);
 const [altSlots, setAltSlots] = useState<{ start: string; end: string}[]>([]);
 const [showAltSlots, setShowAltSlots] = useState(false);
 const [overrideConfirm, setOverrideConfirm] = useState(false);
 const [scheduled, setScheduled] = useState(false);
 const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Calendar state (defaults to Aug 2026)
 const [currentYear, setCurrentYear] = useState(2026);
 const [currentMonth, setCurrentMonth] = useState(7); // August (0-indexed)
 const [selectedDay, setSelectedDay] = useState<number | null>(10);

 // Load all user profiles (for invitee selector) and meetings
 useEffect(() => {
 const fetchData = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const [{ data: profiles, error: profileErr}, { data: mtgs, error: mtgErr}] = await Promise.all([
 supabase.from('user_profiles').select('*').eq('status','active'),
 supabase.from('scheduled_meetings').select('*').order('start_time', { ascending: true}),
 ]);

 if (profileErr) throw profileErr;
 if (mtgErr) throw mtgErr;

 setAllProfiles(profiles ?? []);
 setMeetings(mtgs ?? []);
} catch (err) {
 setError('Could not load calendar data.');
 console.error(err);
} finally {
 setIsLoading(false);
}
};

 fetchData();
}, [scheduled]);

 const hasConflict = inviteeStatuses.some(s => s.isOutside);

 // Compute invitee timezone status when inputs change
 useEffect(() => {
 if (selectedInvitees.length === 0 || !meetingStart) {
 setInviteeStatuses([]);
 setShowAltSlots(false);
 return;
}

 const statuses: InviteeStatus[] = selectedInvitees.map(profileId => {
 const profile = allProfiles.find(p => p.id === profileId);
 if (!profile || !profile.timezone || !profile.working_hours_start || !profile.working_hours_end) {
 return {
 profile: profile ?? ({ id: profileId, full_name: profileId} as UserProfile),
 localTime: meetingStart,
 isOutside: false,
 warning:'',
};
}

 const localOffset = new Date().getTimezoneOffset() / -60;
 const inviteeOffset = TZ_OFFSETS[profile.timezone] ?? 0;
 const diff = inviteeOffset - localOffset;

 const [startH, startM] = meetingStart.split(':').map(Number);
 const inviteeH = startH + diff;
 const inviteeMinutes = inviteeH * 60 + startM;

 const [whStart, whEnd] = [profile.working_hours_start, profile.working_hours_end].map(t => {
 const [h, m] = t.split(':').map(Number);
 return h * 60 + m;
});

 const normalizedH = ((inviteeH % 24) + 24) % 24;
 const inviteeTimeStr = `${String(normalizedH).padStart(2,'0')}:${String(startM).padStart(2,'0')}`;
 const isOutside = inviteeMinutes < whStart || inviteeMinutes >= whEnd;

 return {
 profile,
 localTime: inviteeTimeStr,
 isOutside,
 warning: isOutside
 ? `${inviteeTimeStr} for ${profile.full_name.split('')[0]} in ${profile.timezone.split('/')[1]?.replace('_','')} — outside working hours`
 :'',
};
});

 setInviteeStatuses(statuses);
}, [selectedInvitees, meetingStart, allProfiles]);

 const generateAlternates = () => {
 const slots: { start: string; end: string}[] = [];
 const [endH, endM] = meetingEnd.split(':').map(Number);
 const duration = (endH * 60 + endM) - (parseInt(meetingStart.split(':')[0]) * 60 + parseInt(meetingStart.split(':')[1]));

 for (let hour = 9; hour <= 16; hour++) {
 const slotStart = `${String(hour).padStart(2,'0')}:00`;
 const slotEndMinutes = hour * 60 + duration;
 const slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2,'0')}:${String(slotEndMinutes % 60).padStart(2,'0')}`;

 let allClear = true;
 for (const profileId of selectedInvitees) {
 const profile = allProfiles.find(p => p.id === profileId);
 if (!profile?.timezone || !profile?.working_hours_start || !profile?.working_hours_end) continue;

 const localOffset = new Date().getTimezoneOffset() / -60;
 const inviteeOffset = TZ_OFFSETS[profile.timezone] ?? 0;
 const diff = inviteeOffset - localOffset;
 const inviteeStartMinutes = (hour + diff) * 60;
 const inviteeEndMinutes = inviteeStartMinutes + duration;

 const [whStart, whEnd] = [profile.working_hours_start, profile.working_hours_end].map(t => {
 const [h, m] = t.split(':').map(Number);
 return h * 60 + m;
});

 if (inviteeStartMinutes < whStart || inviteeEndMinutes > whEnd) {
 allClear = false;
 break;
}
}

 if (allClear && slotStart !== meetingStart) {
 slots.push({ start: slotStart, end: slotEnd});
}
 if (slots.length >= 3) break;
}

 setAltSlots(slots);
 setShowAltSlots(true);
};

 const handleScheduleAnyway = async () => {
 setIsSaving(true);
 setOverrideConfirm(true);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) return;

 const startISO = meetingDate
 ? new Date(`${meetingDate}T${meetingStart}:00`).toISOString()
 : new Date().toISOString();
 const endISO = meetingDate
 ? new Date(`${meetingDate}T${meetingEnd}:00`).toISOString()
 : new Date().toISOString();

 // Insert the meeting with is_compliant = false (override)
 const { data: newMeeting, error: meetingErr} = await supabase
 .from('scheduled_meetings')
 .insert({
 organizer_id: user.id,
 title: meetingTitle ||'Untitled Meeting',
 start_time: startISO,
 end_time: endISO,
 attendees: selectedInvitees,
 is_compliant: false,
})
 .select()
 .single();

 if (meetingErr) throw meetingErr;

 // Write a calendar_overrides audit row
 await supabase.from('calendar_overrides').insert({
 organizer_id: user.id,
 meeting_id: newMeeting.id,
 override_reason:'User scheduled outside invitee working hours via Calendar Guard.',
});

 setTimeout(() => {
 setScheduled(true);
 setOverrideConfirm(false);
}, 1000);
} catch (err) {
 console.error(err);
 setOverrideConfirm(false);
} finally {
 setIsSaving(false);
}
};

 const handleSchedule = async () => {
 setIsSaving(true);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) return;

 const startISO = meetingDate
 ? new Date(`${meetingDate}T${meetingStart}:00`).toISOString()
 : new Date().toISOString();
 const endISO = meetingDate
 ? new Date(`${meetingDate}T${meetingEnd}:00`).toISOString()
 : new Date().toISOString();

 const { error: meetingErr} = await supabase.from('scheduled_meetings').insert({
 organizer_id: user.id,
 title: meetingTitle ||'Untitled Meeting',
 start_time: startISO,
 end_time: endISO,
 attendees: selectedInvitees,
 is_compliant: true,
});

 if (meetingErr) throw meetingErr;
 setScheduled(true);
} catch (err) {
 console.error(err);
} finally {
 setIsSaving(false);
}
};

 const handleReset = () => {
 setMeetingTitle('');
 setMeetingDate('');
 setMeetingStart('10:00');
 setMeetingEnd('11:00');
 setSelectedInvitees([]);
 setInviteeStatuses([]);
 setAltSlots([]);
 setShowAltSlots(false);
 setScheduled(false);
 setOverrideConfirm(false);
};

 const toggleInvitee = (profileId: string) => {
 setSelectedInvitees(prev =>
 prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
 );
 setScheduled(false);
 setShowAltSlots(false);
};

 // Calendar rendering helpers
 const monthsList = [
'January','February','March','April','May','June',
'July','August','September','October','November','December',
 ];

 const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
 const getFirstDayIndex = (year: number, month: number) => new Date(year, month, 1).getDay();

 const handlePrevMonth = () => {
 if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(prev => prev - 1);}
 else { setCurrentMonth(prev => prev - 1);}
 setSelectedDay(null);
};

 const handleNextMonth = () => {
 if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(prev => prev + 1);}
 else { setCurrentMonth(prev => prev + 1);}
 setSelectedDay(null);
};

 const daysInMonth = getDaysInMonth(currentYear, currentMonth);
 const firstDayIndex = getFirstDayIndex(currentYear, currentMonth);

 const calendarCells: (number | null)[] = [];
 for (let i = 0; i < firstDayIndex; i++) calendarCells.push(null);
 for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

 const getFormattedDate = (day: number) => {
 const mStr = String(currentMonth + 1).padStart(2,'0');
 const dStr = String(day).padStart(2,'0');
 return `${currentYear}-${mStr}-${dStr}`;
};

 // Filter meetings for the selected day using the ISO start_time field
 const meetingsForSelectedDate = selectedDay
 ? meetings.filter(m => {
 const meetingDateStr = new Date(m.start_time).toLocaleDateString('en-CA'); // YYYY-MM-DD
 return meetingDateStr === getFormattedDate(selectedDay);
})
 : [];

 // Helper to extract HH:MM from ISO timestamp for display
 const toTimeStr = (iso: string) =>
 new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12: false});

 return (
 <section
 className={`p-6 glass-card rounded-2xl border shadow-xs ${
 highContrast ?'border-black text-black' :'border-border-color'
}`}
 aria-labelledby="calendar-guard-title"
 >
 {isLoading ? (
 <div className="py-16 flex items-center justify-center">
 <div className="flex gap-1.5">
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'0ms'}} />
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'150ms'}} />
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'300ms'}} />
 </div>
 </div>
 ) : error ? (
 <div className="py-16 text-center text-xs text-red-500">{error}</div>
 ) : (
 /* Main Grid Wrapper */
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

 {/* Left Side: Meeting Scheduler Form */}
 <div className="lg:col-span-7 space-y-4">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <Calendar className="h-5 w-5 text-teal-600" />
 <h2 id="calendar-guard-title" className="text-base font-bold text-neutral-800">
 Calendar Guard
 </h2>
 </div>
 <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[9px] font-bold uppercase tracking-wider">
 Right-to-Disconnect
 </span>
 </div>

 <p className="text-xs text-neutral-500 leading-relaxed">
 Schedule meetings safely across time zones. Calendar Guard checks invitee working-hour boundaries to protect personal time.
 </p>

 {scheduled ? (
 <div className="py-8 text-center space-y-3 animate-fade-in">
 <div className="h-14 w-14 rounded-full bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mx-auto">
 <Check className="h-7 w-7 stroke-[2.5]" />
 </div>
 <p className="text-sm font-bold text-neutral-800">Meeting Scheduled</p>
 <p className="text-xs text-neutral-400">Invites dispatched to {selectedInvitees.length} recipient(s).</p>
 <button
 onClick={handleReset}
 className="mt-2 px-4 py-2 text-xs font-bold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition"
 >
 Schedule Another
 </button>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="sm:col-span-2">
 <label htmlFor="cg-title" className="block text-xs font-bold text-neutral-700 mb-1">Meeting Title</label>
 <input
 id="cg-title"
 type="text"
 value={meetingTitle}
 onChange={e => setMeetingTitle(e.target.value)}
 placeholder="e.g. Q3 Sprint Planning"
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>
 <div>
 <label htmlFor="cg-date" className="block text-xs font-bold text-neutral-700 mb-1">Date</label>
 <input
 id="cg-date"
 type="date"
 value={meetingDate}
 onChange={e => {
 setMeetingDate(e.target.value);
 const dObj = new Date(e.target.value);
 if (!isNaN(dObj.getTime())) {
 setCurrentYear(dObj.getFullYear());
 setCurrentMonth(dObj.getMonth());
 setSelectedDay(dObj.getDate());
}
}}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label htmlFor="cg-start" className="block text-xs font-bold text-neutral-700 mb-1">Start</label>
 <input
 id="cg-start"
 type="time"
 value={meetingStart}
 onChange={e => setMeetingStart(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>
 <div>
 <label htmlFor="cg-end" className="block text-xs font-bold text-neutral-700 mb-1">End</label>
 <input
 id="cg-end"
 type="time"
 value={meetingEnd}
 onChange={e => setMeetingEnd(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>
 </div>
 </div>

 <div>
 <label className="block text-xs font-bold text-neutral-700 mb-2">Invitees</label>
 <div className="flex flex-wrap gap-2">
 {allProfiles.map(profile => (
 <button
 key={profile.id}
 onClick={() => toggleInvitee(profile.id)}
 className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
 selectedInvitees.includes(profile.id)
 ?'bg-teal-50 border-teal-300 text-teal-800'
 :'glass-card border-border-color text-neutral-600 hover:bg-neutral-50'
}`}
 >
 <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 text-[9px] font-bold mr-1.5 overflow-hidden">
 {(profile.avatar?.startsWith('data:image') || profile.avatar?.startsWith('http')) ? (
 <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
 ) : (
 profile.avatar ?? profile.full_name.substring(0, 2).toUpperCase()
 )}
 </span>
 {profile.full_name}
 </button>
 ))}
 </div>
 </div>

 {inviteeStatuses.length > 0 && (
 <div className="space-y-2">
 <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Time Zone Adherence</span>
 {inviteeStatuses.map(status => (
 <div
 key={status.profile.id}
 className={`flex items-center gap-3 p-3 rounded-xl text-xs border ${
 status.isOutside
 ?'bg-amber-50/60 border-amber-200 text-amber-800'
 :'bg-emerald-50/60 border-emerald-200 text-emerald-800'
}`}
 >
 {status.isOutside
 ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
 : <Check className="h-4 w-4 text-emerald-600 shrink-0" />
}
 <div className="flex-1">
 <span className="font-bold">{status.profile.full_name}</span>
 <span className="mx-1 text-neutral-300">·</span>
 <Clock className="inline h-3 w-3 -mt-0.5 mr-0.5" />
 <span>{status.localTime} ({status.profile.timezone?.split('/')[1]?.replace('_','')})</span>
 </div>
 {status.isOutside && (
 <span className="text-[8px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Outside Hours</span>
 )}
 </div>
 ))}
 </div>
 )}

 {hasConflict && (
 <div className="space-y-3 pt-2">
 {!showAltSlots && (
 <button
 onClick={generateAlternates}
 className="w-full py-2.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
 >
 <Zap className="h-4 w-4" />
 Suggest Alternatives
 </button>
 )}

 {showAltSlots && altSlots.length > 0 && (
 <div className="space-y-2">
 <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Overlap Slots</span>
 <div className="flex flex-wrap gap-2">
 {altSlots.map((slot, i) => (
 <button
 key={i}
 onClick={() => { setMeetingStart(slot.start); setMeetingEnd(slot.end); setShowAltSlots(false);}}
 className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition focus:outline-none"
 >
 {slot.start} – {slot.end}
 </button>
 ))}
 </div>
 </div>
 )}

 <button
 onClick={handleScheduleAnyway}
 disabled={overrideConfirm || isSaving}
 className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
 >
 {overrideConfirm ?'Logging override...' :'Schedule Anyway (Override Logged)'}
 </button>
 </div>
 )}

 {!hasConflict && selectedInvitees.length > 0 && meetingTitle.trim() && (
 <button
 onClick={handleSchedule}
 disabled={isSaving}
 className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
 highContrast ?'bg-black text-white hover:bg-neutral-800' :'bg-teal-600 text-white hover:bg-teal-700 shadow-xs'
}`}
 >
 <ChevronRight className="h-4 w-4" />
 {isSaving ?'Scheduling...' :'Schedule Meeting'}
 </button>
 )}
 </div>
 )}
 </div>

 {/* Right Side: Interactive Calendar Panel */}
 <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-neutral-100 lg:pl-6 pt-6 lg:pt-0">
 <div className="flex items-center justify-between mb-4">
 <span className="text-sm font-bold text-neutral-800">
 {monthsList[currentMonth]} {currentYear}
 </span>
 <div className="flex gap-1">
 <button onClick={handlePrevMonth} className="p-1 rounded-lg border border-border-color hover:bg-neutral-50">
 <ChevronLeft className="h-3.5 w-3.5 text-neutral-500" />
 </button>
 <button onClick={handleNextMonth} className="p-1 rounded-lg border border-border-color hover:bg-neutral-50">
 <ChevronRight className="h-3.5 w-3.5 text-neutral-500" />
 </button>
 </div>
 </div>

 {/* Calendar Grid */}
 <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-neutral-400 mb-2">
 {['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => (
 <span key={day} className="py-1">{day}</span>
 ))}
 </div>

 <div className="grid grid-cols-7 gap-1 text-center text-xs">
 {calendarCells.map((day, idx) => {
 if (day === null) {
 return <div key={`empty-${idx}`} className="p-2 text-neutral-200">—</div>;
}

 const dateStr = getFormattedDate(day);
 const isSelected = selectedDay === day;
 const dayMeetings = meetings.filter(m => {
 const dStr = new Date(m.start_time).toLocaleDateString('en-CA');
 return dStr === dateStr;
});
 const hasMeeting = dayMeetings.length > 0;
 const hasOverride = dayMeetings.some(m => !m.is_compliant);

 let cellStyle ='hover:bg-neutral-100 rounded-lg text-neutral-800 cursor-pointer';
 if (isSelected) cellStyle ='bg-teal-500 text-white rounded-lg font-bold cursor-pointer';

 return (
 <div
 key={`day-${day}`}
 onClick={() => { setSelectedDay(day); setMeetingDate(dateStr);}}
 className={`p-2 transition relative flex flex-col items-center justify-center ${cellStyle}`}
 >
 <span>{day}</span>
 {hasMeeting && !isSelected && (
 <span className={`absolute bottom-1 block h-1 w-1 rounded-full ${
 hasOverride ?'bg-amber-500' :'bg-teal-500'
}`} />
 )}
 </div>
 );
})}
 </div>

 {/* Date Selected Details */}
 {selectedDay && (
 <div className="mt-5 p-4 rounded-xl bg-neutral-50/70 border border-neutral-100 space-y-3">
 <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
 Meetings on {monthsList[currentMonth]} {selectedDay}, {currentYear}
 </span>

 {meetingsForSelectedDate.length === 0 ? (
 <p className="text-[11px] text-neutral-400 italic">No meetings scheduled for this date.</p>
 ) : (
 <div className="space-y-2">
 {meetingsForSelectedDate.map(meeting => (
 <div key={meeting.id} className="p-2.5 glass-card rounded-lg border border-neutral-150 text-xs shadow-xs space-y-1">
 <div className="flex justify-between items-start gap-2">
 <span className="font-bold text-neutral-800 leading-snug">{meeting.title}</span>
 {!meeting.is_compliant && (
 <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-bold uppercase tracking-wide shrink-0">
 Override
 </span>
 )}
 </div>
 <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
 <Clock className="h-3 w-3" />
 <span>{toTimeStr(meeting.start_time)} – {toTimeStr(meeting.end_time)}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )}
 </section>
 );
}
