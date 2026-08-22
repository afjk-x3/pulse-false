'use client';

import React, { useState, useEffect} from'react';
import { Calendar, Clock, AlertTriangle, Check, ChevronRight, ChevronLeft, Zap, X } from 'lucide-react';
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
 doubleBookingWarning?: string;
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
 const [inviteeSearch, setInviteeSearch] = useState('');
 const [showInviteeDropdown, setShowInviteeDropdown] = useState(false);
 const [inviteeStatuses, setInviteeStatuses] = useState<InviteeStatus[]>([]);
 const [altSlots, setAltSlots] = useState<{ start: string; end: string}[]>([]);
 const [showAltSlots, setShowAltSlots] = useState(false);
 const [overrideConfirm, setOverrideConfirm] = useState(false);
 const [scheduled, setScheduled] = useState(false);
 const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const [currentUser, setCurrentUser] = useState<any>(null);
 const [organizerConflictWarning, setOrganizerConflictWarning] = useState<string | null>(null);

 const [selectedMeeting, setSelectedMeeting] = useState<ScheduledMeeting | null>(null);
 const [isEditMode, setIsEditMode] = useState(false);
 const [editTitle, setEditTitle] = useState('');
 const [editDescription, setEditDescription] = useState('');
 const [editInvitees, setEditInvitees] = useState<string[]>([]);
 const [editInviteeSearch, setEditInviteeSearch] = useState('');
 const [showEditInviteeDropdown, setShowEditInviteeDropdown] = useState(false);
 const [isSavingEdit, setIsSavingEdit] = useState(false);


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
 supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
}, [scheduled]);

 const hasConflict = inviteeStatuses.some(s => s.isOutside || !!s.doubleBookingWarning) || !!organizerConflictWarning;

 // Compute invitee timezone status and double bookings when inputs change
 useEffect(() => {
 if (selectedInvitees.length === 0 || !meetingStart || !meetingDate) {
  const timer = setTimeout(() => {
   setInviteeStatuses([]);
   setOrganizerConflictWarning(null);
   setShowAltSlots(false);
  }, 0);
  return () => clearTimeout(timer);
 }

 const proposedStart = new Date(`${meetingDate}T${meetingStart}:00`).getTime();
 const proposedEnd = new Date(`${meetingDate}T${meetingEnd}:00`).getTime();

 const checkOverlap = (m: ScheduledMeeting) => {
   const mStart = new Date(m.start_time).getTime();
   const mEnd = new Date(m.end_time).getTime();
   return proposedStart < mEnd && proposedEnd > mStart;
 };

 let orgWarning: string | null = null;
 if (currentUser) {
   const orgConflicts = meetings.filter(m => 
     checkOverlap(m) && 
     (m.organizer_id === currentUser.id || (Array.isArray(m.attendees) && m.attendees.includes(currentUser.id)))
   );
   if (orgConflicts.length > 0) {
     const c = orgConflicts[0];
     const cStart = new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
     const cEnd = new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
     orgWarning = `You are already booked for "${c.title}" from ${cStart}–${cEnd} that day.`;
   }
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

 const inviteeConflicts = meetings.filter(m => 
   checkOverlap(m) && 
   (m.organizer_id === profile.id || (Array.isArray(m.attendees) && m.attendees.includes(profile.id)))
 );
 let doubleBookingWarning = undefined;
 if (inviteeConflicts.length > 0) {
   const c = inviteeConflicts[0];
   const cStart = new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
   const cEnd = new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
   doubleBookingWarning = `already booked ${cStart}–${cEnd} that day`;
 }

 return {
 profile,
 localTime: inviteeTimeStr,
 isOutside,
 warning: isOutside
 ? `${inviteeTimeStr} for ${profile.full_name.split('')[0]} in ${profile.timezone.split('/')[1]?.replace('_','')} — outside working hours`
 :'',
 doubleBookingWarning
};
});

 const timer = setTimeout(() => {
   setInviteeStatuses(statuses);
   setOrganizerConflictWarning(orgWarning);
 }, 0);
 return () => clearTimeout(timer);
}, [selectedInvitees, meetingStart, meetingEnd, meetingDate, allProfiles, currentUser, meetings]);


 const openMeetingDetails = (m: ScheduledMeeting) => {
   setSelectedMeeting(m);
   setIsEditMode(false);
   setEditTitle(m.title);
   setEditDescription(m.description || '');
   setEditInvitees(Array.isArray(m.attendees) ? (m.attendees as string[]) : []);
   setEditInviteeSearch('');
   setShowEditInviteeDropdown(false);
 };

 const closeModal = () => {
   setSelectedMeeting(null);
   setIsEditMode(false);
 };

 const handleSaveMeeting = async () => {
   if (!selectedMeeting) return;
   setIsSavingEdit(true);
   try {
     const { error } = await supabase
       .from('scheduled_meetings')
       .update({
         title: editTitle,
         description: editDescription,
         attendees: editInvitees
       })
       .eq('id', selectedMeeting.id);
     
     if (error) throw error;
     
     // Update locally
     setMeetings(meetings.map(m => m.id === selectedMeeting.id ? {
       ...m,
       title: editTitle,
       description: editDescription,
       attendees: editInvitees
     } : m));
     setIsEditMode(false);
   } catch (err) {
     console.error(err);
   } finally {
     setIsSavingEdit(false);
   }
 };

 const toggleEditInvitee = (id: string) => {
   setEditInvitees(prev =>
     prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
   );
   setEditInviteeSearch('');
   setShowEditInviteeDropdown(false);
 };

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
 className={`p-4 sm:p-6 glass-card rounded-2xl border shadow-xs ${
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
 <label htmlFor="cg-invitee-search" className="block text-xs font-bold text-neutral-700 mb-2">Invitees</label>
 <div className="relative">
 <input
 id="cg-invitee-search"
 type="text"
 placeholder="Search to add invitees..."
 value={inviteeSearch}
 onChange={(e) => {
 setInviteeSearch(e.target.value);
 setShowInviteeDropdown(true);
 }}
 onFocus={() => setShowInviteeDropdown(true)}
 onBlur={() => setTimeout(() => setShowInviteeDropdown(false), 200)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ? 'border-black' : 'border-border-color'
 }`}
 />
 {showInviteeDropdown && (
 <ul className="absolute z-10 w-full mt-1 bg-white border border-border-color rounded-lg shadow-lg max-h-48 overflow-y-auto">
 {(() => {
 const matches = allProfiles.filter(p => 
 !selectedInvitees.includes(p.id) && 
 p.full_name.toLowerCase().includes(inviteeSearch.toLowerCase())
 );
 
 if (matches.length === 0) {
 return <li className="px-4 py-2 text-xs text-neutral-500 italic">No employees found</li>;
 }
 
 return matches.map(profile => (
 <li
 key={profile.id}
 className="px-4 py-2 text-xs font-semibold hover:bg-teal-50 cursor-pointer"
 onMouseDown={() => {
 toggleInvitee(profile.id);
 setInviteeSearch('');
 setShowInviteeDropdown(false);
 }}
 >
 {profile.full_name}
 </li>
 ));
 })()}
 </ul>
 )}
 </div>

 {selectedInvitees.length > 0 && (
 <div className="flex flex-wrap gap-2 mt-3">
 {selectedInvitees.map(profileId => {
 const profile = allProfiles.find(p => p.id === profileId);
 if (!profile) return null;
 
 return (
 <button
 key={profile.id}
 onClick={() => toggleInvitee(profile.id)}
 className="group flex items-center px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50 border-teal-300 text-teal-800 hover:bg-red-50 hover:border-red-300 hover:text-red-800"
 title="Click to remove"
 >
 <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 text-[9px] font-bold mr-1.5 overflow-hidden">
 {(profile.avatar?.startsWith('data:image') || profile.avatar?.startsWith('http')) ? (
 <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
 ) : (
 profile.avatar ?? profile.full_name.substring(0, 2).toUpperCase()
 )}
 </span>
 <span>{profile.full_name}</span>
 <X className="h-3 w-3 ml-1.5 opacity-50 group-hover:opacity-100" />
 </button>
 );
 })}
 </div>
 )}
 </div>

 {organizerConflictWarning && (
 <div className="space-y-2 mt-4">
 <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Organizer Schedule</span>
 <div className="flex items-center gap-3 p-3 rounded-xl text-xs border bg-red-50/60 border-red-200 text-red-800">
 <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
 <div className="flex-1">
 <span className="font-bold">Schedule Conflict</span>
 <span className="mx-1 text-neutral-300">·</span>
 <span>{organizerConflictWarning}</span>
 </div>
 </div>
 </div>
 )}

 {inviteeStatuses.length > 0 && (
 <div className="space-y-2 mt-4">
 <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Invitee Status</span>
 {inviteeStatuses.map(status => {
   const hasAnyWarning = status.isOutside || !!status.doubleBookingWarning;
   return (
 <div
 key={status.profile.id}
 className={`flex flex-col p-3 rounded-xl text-xs border ${
 hasAnyWarning
 ?'bg-amber-50/60 border-amber-200 text-amber-800'
 :'bg-emerald-50/60 border-emerald-200 text-emerald-800'
 }`}
 >
 <div className="flex items-center gap-3">
 {hasAnyWarning
 ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
 : <Check className="h-4 w-4 text-emerald-600 shrink-0" />
 }
 <div className="flex-1 flex items-center">
 <span className="font-bold">{status.profile.full_name}</span>
 <span className="mx-1 text-neutral-300">·</span>
 <Clock className="inline h-3 w-3 -mt-0.5 mr-0.5" />
 <span>{status.localTime} ({status.profile.timezone?.split('/')[1]?.replace('_','')})</span>
 </div>
 {status.isOutside && (
 <span className="text-[8px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Outside Hours</span>
 )}
 </div>
 {status.doubleBookingWarning && (
 <div className="mt-2 ml-7 text-[11px] text-amber-700 italic">
 {status.doubleBookingWarning}
 </div>
 )}
 </div>
 );
 })}
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
 <div key={meeting.id} onClick={() => openMeetingDetails(meeting)} className="p-2.5 glass-card rounded-lg border border-neutral-150 text-xs shadow-xs space-y-1 cursor-pointer hover:bg-neutral-50/50 transition">
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
      {/* Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-800">
                {isEditMode ? 'Edit Meeting' : 'Meeting Details'}
              </h3>
              <div className="flex items-center gap-2">
                {!isEditMode && currentUser?.id === selectedMeeting.organizer_id && (
                  <button onClick={() => setIsEditMode(true)} className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition">
                    Edit
                  </button>
                )}
                <button onClick={closeModal} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {isEditMode ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-600">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-600">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                    />
                  </div>
                  
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-bold text-neutral-600">Invitees</label>
                    <input
                       type="text"
                       value={editInviteeSearch}
                       onChange={e => setEditInviteeSearch(e.target.value)}
                       onFocus={() => setShowEditInviteeDropdown(true)}
                       onBlur={() => setTimeout(() => setShowEditInviteeDropdown(false), 200)}
                       placeholder="Search to add invitees..."
                       className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                     />
                     {showEditInviteeDropdown && editInviteeSearch && (
                       <ul className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto py-1">
                         {allProfiles
                           .filter(p => !editInvitees.includes(p.id) && p.full_name.toLowerCase().includes(editInviteeSearch.toLowerCase()))
                           .map(profile => (
                             <li
                               key={profile.id}
                               onMouseDown={() => toggleEditInvitee(profile.id)}
                               className="px-3 py-2 text-xs flex items-center gap-2 hover:bg-neutral-50 cursor-pointer"
                             >
                               <span className="inline-flex h-5 w-5 rounded-full bg-neutral-100 items-center justify-center text-[9px] font-bold overflow-hidden shrink-0">
                                 {(profile.avatar?.startsWith('data:image') || profile.avatar?.startsWith('http')) ? (
                                   <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                                 ) : (
                                   profile.avatar ?? profile.full_name.substring(0, 2).toUpperCase()
                                 )}
                               </span>
                               <span>{profile.full_name}</span>
                             </li>
                           ))}
                         {allProfiles.filter(p => !editInvitees.includes(p.id) && p.full_name.toLowerCase().includes(editInviteeSearch.toLowerCase())).length === 0 && (
                           <li className="px-3 py-2 text-xs text-neutral-500 italic">No employees found</li>
                         )}
                       </ul>
                     )}
                     
                     {editInvitees.length > 0 && (
                       <div className="flex flex-wrap gap-1.5 pt-2">
                         {editInvitees.map(id => {
                           const profile = allProfiles.find(p => p.id === id);
                           if (!profile) return null;
                           return (
                             <button
                               key={profile.id}
                               onClick={() => toggleEditInvitee(profile.id)}
                               className="group flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold border bg-teal-50 border-teal-200 text-teal-800 hover:bg-red-50 hover:border-red-200 hover:text-red-800 transition"
                               title="Click to remove"
                             >
                               <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-white text-[8px] mr-1 overflow-hidden shrink-0">
                                 {(profile.avatar?.startsWith('data:image') || profile.avatar?.startsWith('http')) ? (
                                   <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                                 ) : (
                                   profile.avatar ?? profile.full_name.substring(0, 2).toUpperCase()
                                 )}
                               </span>
                               {profile.full_name}
                               <X className="h-2.5 w-2.5 ml-1 opacity-50 group-hover:opacity-100" />
                             </button>
                           );
                         })}
                       </div>
                     )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4 className="text-sm font-bold text-neutral-900 leading-snug">{selectedMeeting.title}</h4>
                      {!selectedMeeting.is_compliant && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold uppercase tracking-wide shrink-0">
                          Override
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-neutral-500">
                      <span>{new Date(selectedMeeting.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(selectedMeeting.start_time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })} – {new Date(selectedMeeting.end_time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedMeeting.description && (
                    <div className="text-sm text-neutral-700 bg-neutral-50/50 p-3 rounded-xl border border-neutral-100 whitespace-pre-wrap">
                      {selectedMeeting.description}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Invitees</span>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(selectedMeeting.attendees) && selectedMeeting.attendees.map(id => {
                        const profile = allProfiles.find(p => p.id === id);
                        if (!profile) return null;
                        return (
                          <div key={id as string} className="flex items-center gap-1.5 bg-white border border-neutral-150 px-2.5 py-1.5 rounded-xl shadow-xs">
                             <span className="inline-flex h-5 w-5 rounded-full bg-neutral-100 items-center justify-center text-[9px] font-bold overflow-hidden shrink-0 text-neutral-600">
                               {(profile.avatar?.startsWith('data:image') || profile.avatar?.startsWith('http')) ? (
                                 <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
                               ) : (
                                 profile.avatar ?? profile.full_name.substring(0, 2).toUpperCase()
                               )}
                             </span>
                             <span className="text-xs font-semibold text-neutral-700">{profile.full_name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Footer */}
            {isEditMode && (
              <div className="p-4 border-t border-neutral-100 flex justify-end gap-2 bg-neutral-50">
                <button
                  onClick={() => setIsEditMode(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition"
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMeeting}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-xs transition"
                  disabled={isSavingEdit || !editTitle.trim() || editInvitees.length === 0}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
 </section>
 );
}
