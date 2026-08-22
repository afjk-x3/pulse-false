'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../lib/database.types';

type ScheduledMeeting = Database['public']['Tables']['scheduled_meetings']['Row'];

export default function MeetingTimeline() {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMeetings = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('scheduled_meetings')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(6);

        if (error) throw error;
        if (isMounted) setMeetings(data || []);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to fetch upcoming meetings');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMeetings();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-teal-600" />
          <h2 className="text-base font-bold text-neutral-800">Upcoming Meetings</h2>
        </div>
        <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[9px] font-bold uppercase tracking-wider">
          Timeline
        </span>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-xs text-red-500 font-semibold">{error}</div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-500 italic">
            No upcoming meetings scheduled.
          </div>
        ) : (
          <div className="relative border-l-2 border-neutral-100 ml-2 space-y-6">
            {meetings.map((m) => {
              const start = new Date(m.start_time);
              const end = new Date(m.end_time);
              const dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
              
              return (
                <div key={m.id} className="relative pl-4">
                  <div className="absolute w-2.5 h-2.5 bg-teal-400 rounded-full -left-[6px] top-1.5 ring-4 ring-white" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-neutral-800 leading-tight">{m.title}</p>
                      <p className="text-xs font-semibold text-neutral-500">
                        {dateStr} <span className="mx-1">•</span> {timeStr}
                      </p>
                    </div>
                    {!m.is_compliant && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-bold uppercase tracking-wide shrink-0">
                        Override
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
