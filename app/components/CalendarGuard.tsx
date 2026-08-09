'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, Check, Users, ChevronRight, Shield, Zap } from 'lucide-react';
import { PulseDB, UserAccount } from '../lib/db';
import { useAccessibility } from '../context/AccessibilityContext';

interface InviteeStatus {
  account: UserAccount;
  localTime: string;
  isOutside: boolean;
  warning: string;
}

export default function CalendarGuard() {
  const { highContrast } = useAccessibility();

  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingStart, setMeetingStart] = useState('10:00');
  const [meetingEnd, setMeetingEnd] = useState('11:00');
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [allAccounts, setAllAccounts] = useState<UserAccount[]>([]);
  const [inviteeStatuses, setInviteeStatuses] = useState<InviteeStatus[]>([]);
  const [altSlots, setAltSlots] = useState<{ start: string; end: string }[]>([]);
  const [showAltSlots, setShowAltSlots] = useState(false);
  const [overrideConfirm, setOverrideConfirm] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAllAccounts(PulseDB.getUserAccounts());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const hasConflict = inviteeStatuses.some(s => s.isOutside);

  // Compute invitee time status when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedInvitees.length === 0 || !meetingStart) {
        setInviteeStatuses([]);
        setShowAltSlots(false);
        return;
      }

      const statuses: InviteeStatus[] = selectedInvitees.map(username => {
        const account = allAccounts.find(a => a.username === username);
        if (!account || !account.timezone || !account.workingHoursStart || !account.workingHoursEnd) {
          return {
            account: account || { username, name: username, role: 'employee', roleName: 'Employee', avatar: '??', title: '', email: '' },
            localTime: meetingStart,
            isOutside: false,
            warning: ''
          };
        }

        // Compute the invitee's local time offset (simplified timezone approach)
        const tzOffsets: Record<string, number> = {
          'America/New_York': -4,
          'America/Chicago': -5,
          'America/Los_Angeles': -7,
          'Europe/London': 1,
          'Europe/Berlin': 2,
          'Asia/Tokyo': 9,
          'Asia/Singapore': 8,
          'Australia/Sydney': 10
        };

        const localOffset = new Date().getTimezoneOffset() / -60;
        const inviteeOffset = tzOffsets[account.timezone] ?? 0;
        const diff = inviteeOffset - localOffset;

        const [startH, startM] = meetingStart.split(':').map(Number);
        const inviteeH = startH + diff;
        const inviteeMinutes = inviteeH * 60 + startM;

        const [whStart, whEnd] = [account.workingHoursStart, account.workingHoursEnd].map(t => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        });

        const normalizedH = ((inviteeH % 24) + 24) % 24;
        const inviteeTimeStr = `${String(normalizedH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
        const isOutside = inviteeMinutes < whStart || inviteeMinutes >= whEnd;

        return {
          account,
          localTime: inviteeTimeStr,
          isOutside,
          warning: isOutside ? `${inviteeTimeStr} for ${account.name.split(' ')[0]} in ${account.timezone.split('/')[1].replace('_', ' ')} — outside working hours` : ''
        };
      });

      setInviteeStatuses(statuses);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedInvitees, meetingStart, allAccounts]);

  // Generate alternate timeslots
  const generateAlternates = () => {
    const slots: { start: string; end: string }[] = [];
    const [endH, endM] = meetingEnd.split(':').map(Number);
    const duration = (endH * 60 + endM) - (parseInt(meetingStart.split(':')[0]) * 60 + parseInt(meetingStart.split(':')[1]));

    for (let hour = 9; hour <= 16; hour++) {
      const slotStart = `${String(hour).padStart(2, '0')}:00`;
      const slotEndMinutes = hour * 60 + duration;
      const slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, '0')}:${String(slotEndMinutes % 60).padStart(2, '0')}`;

      // Check if this slot works for everyone
      let allClear = true;
      for (const username of selectedInvitees) {
        const account = allAccounts.find(a => a.username === username);
        if (!account?.timezone || !account?.workingHoursStart || !account?.workingHoursEnd) continue;

        const tzOffsets: Record<string, number> = {
          'America/New_York': -4, 'America/Chicago': -5, 'America/Los_Angeles': -7,
          'Europe/London': 1, 'Europe/Berlin': 2, 'Asia/Tokyo': 9, 'Asia/Singapore': 8, 'Australia/Sydney': 10
        };
        const localOffset = new Date().getTimezoneOffset() / -60;
        const inviteeOffset = tzOffsets[account.timezone] ?? 0;
        const diff = inviteeOffset - localOffset;
        const inviteeStartMinutes = (hour + diff) * 60;
        const inviteeEndMinutes = inviteeStartMinutes + duration;

        const [whStart, whEnd] = [account.workingHoursStart, account.workingHoursEnd].map(t => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        });

        if (inviteeStartMinutes < whStart || inviteeEndMinutes > whEnd) {
          allClear = false;
          break;
        }
      }

      if (allClear && slotStart !== meetingStart) {
        slots.push({ start: slotStart, end: slotEnd });
      }
      if (slots.length >= 3) break;
    }

    setAltSlots(slots);
    setShowAltSlots(true);
  };

  const handleScheduleAnyway = () => {
    const currentUser = localStorage.getItem('pulse-current-user') || 'anonymous';
    const actorHash = btoa(currentUser).substring(0, 8);
    PulseDB.addCalendarOverride(actorHash, selectedInvitees.length);
    setOverrideConfirm(true);
    setTimeout(() => {
      setScheduled(true);
      setOverrideConfirm(false);
    }, 1500);
  };

  const handleSchedule = () => {
    setScheduled(true);
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

  const toggleInvitee = (username: string) => {
    setSelectedInvitees(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
    setScheduled(false);
    setShowAltSlots(false);
  };

  return (
    <section
      className={`p-6 bg-white rounded-2xl border shadow-xs ${ 
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}
      aria-labelledby="calendar-guard-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
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

      <p className="text-xs text-neutral-500 leading-relaxed mb-5">
        Schedule meetings safely across time zones. The Calendar Guard inspects invitee working-hour boundaries and warns you before sending invites that land outside their configured hours.
      </p>

      {scheduled ? (
        <div className="py-8 text-center space-y-3 animate-fade-in">
          <div className="h-14 w-14 rounded-full bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mx-auto">
            <Check className="h-7 w-7 stroke-[2.5]" />
          </div>
          <p className="text-sm font-bold text-neutral-800">Meeting Scheduled</p>
          <p className="text-xs text-neutral-400">Calendar invites dispatched to {selectedInvitees.length} invitee(s).</p>
          <button
            onClick={handleReset}
            className="mt-2 px-4 py-2 text-xs font-bold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition"
          >
            Schedule Another
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Meeting details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="cg-title" className="block text-xs font-bold text-neutral-700 mb-1">Meeting Title</label>
              <input
                id="cg-title"
                type="text"
                value={meetingTitle}
                onChange={e => setMeetingTitle(e.target.value)}
                placeholder="e.g. Q3 Sprint Planning"
                className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                  highContrast ? 'border-black' : 'border-neutral-200'
                }`}
              />
            </div>
            <div>
              <label htmlFor="cg-date" className="block text-xs font-bold text-neutral-700 mb-1">Date</label>
              <input
                id="cg-date"
                type="date"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                  highContrast ? 'border-black' : 'border-neutral-200'
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
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
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
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Invitee picker */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-2">
              <Users className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Invitees
            </label>
            <div className="flex flex-wrap gap-2">
              {allAccounts.map(account => (
                <button
                  key={account.username}
                  onClick={() => toggleInvitee(account.username)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    selectedInvitees.includes(account.username)
                      ? 'bg-teal-50 border-teal-300 text-teal-800'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 text-[9px] font-bold mr-1.5">{account.avatar}</span>
                  {account.name}
                  {account.timezone && (
                    <span className="ml-1 text-[9px] text-neutral-400">({account.timezone.split('/')[1]?.replace('_', ' ')})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Invitee status warnings */}
          {inviteeStatuses.length > 0 && (
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Invitee Time Zones</span>
              {inviteeStatuses.map(status => (
                <div
                  key={status.account.username}
                  className={`flex items-center gap-3 p-3 rounded-xl text-xs border ${
                    status.isOutside
                      ? 'bg-amber-50/60 border-amber-200 text-amber-800'
                      : 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {status.isOutside ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  ) : (
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold">{status.account.name}</span>
                    <span className="mx-1.5 text-neutral-300">·</span>
                    <Clock className="inline h-3 w-3 -mt-0.5 mr-0.5" />
                    <span className="font-semibold">{status.localTime}</span>
                    <span className="ml-1 text-[10px] text-neutral-400">({status.account.timezone?.split('/')[1]?.replace('_', ' ')})</span>
                  </div>
                  {status.isOutside && (
                    <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Outside Hours</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Conflict actions */}
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

              {showAltSlots && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mutually Available Slots</span>
                  {altSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {altSlots.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setMeetingStart(slot.start);
                            setMeetingEnd(slot.end);
                            setShowAltSlots(false);
                          }}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center gap-1.5"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {slot.start} – {slot.end}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-400 italic">No fully overlapping slots found in the 9 AM–5 PM window. Consider rescheduling for another day.</p>
                  )}
                </div>
              )}

              {/* Schedule Anyway (Override) */}
              <button
                onClick={handleScheduleAnyway}
                disabled={overrideConfirm}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {overrideConfirm ? (
                  <>
                    <Shield className="h-4 w-4 animate-pulse" />
                    Logging override & scheduling...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Schedule Anyway (Override Logged)
                  </>
                )}
              </button>
            </div>
          )}

          {/* Schedule button (no conflict) */}
          {!hasConflict && selectedInvitees.length > 0 && meetingTitle.trim() && (
            <button
              onClick={handleSchedule}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                highContrast
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-teal-600 text-white hover:bg-teal-700 shadow-xs'
              }`}
            >
              <ChevronRight className="h-4 w-4" />
              Schedule Meeting
            </button>
          )}
        </div>
      )}
    </section>
  );
}
