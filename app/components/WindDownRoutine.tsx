'use client';

import React, { useState } from 'react';
import { 
  Moon, 
  Sun, 
  Calendar, 
  MessageSquare, 
  ArrowRight, 
  X, 
  CheckCircle,
  AlertTriangle,
  BatteryWarning,
  BatteryFull,
  BatteryMedium,
  BatteryLow
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface WindDownRoutineProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  outboxCount: number;
}

const MOOD_OPTIONS = [
  { level: 5, label: 'Energized', icon: <BatteryFull className="h-6 w-6 text-emerald-500" /> },
  { level: 4, label: 'Good', icon: <BatteryMedium className="h-6 w-6 text-teal-500" /> },
  { level: 3, label: 'Neutral', icon: <BatteryMedium className="h-6 w-6 text-neutral-500" /> },
  { level: 2, label: 'Struggling', icon: <BatteryLow className="h-6 w-6 text-orange-500" /> },
  { level: 1, label: 'Burned Out', icon: <BatteryWarning className="h-6 w-6 text-rose-500" /> },
];

export default function WindDownRoutine({ isOpen, onClose, userProfile, outboxCount }: WindDownRoutineProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);


  if (!isOpen) return null;

  // Mock schedule data for tomorrow
  const mockTomorrowSchedule = [
    { title: 'APAC Team Sync', time: '07:30 AM', duration: '45m', isEarly: true },
    { title: 'Project Kickoff', time: '10:00 AM', duration: '1h', isEarly: false },
    { title: '1:1 with Manager', time: '02:00 PM', duration: '30m', isEarly: false }
  ];

  const handleMoodSelect = async (level: number) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('mood_logs').insert({
          user_id: session.user.id,
          mood_score: level,
          energy_level: level
        });
      }
    } catch (e) {
      console.error('Failed to log final mood:', e);
    } finally {
      setIsSubmitting(false);
      setStep(4); // Go to final step
    }
  };

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-neutral-200">
        
        {/* Header */}
        <div className="bg-black/5 border-b border-white/20 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-teal-800">
            <Moon className="h-5 w-5" />
            <h2 className="font-semibold text-sm">End-of-Day Wind-Down</h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-black/10 rounded-full transition-colors text-neutral-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8">
          
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="mx-auto w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                <Sun className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-semibold text-neutral-800">Time to wrap up!</h3>
              <p className="text-neutral-600">
                You&apos;re nearing the end of your working hours. Let&apos;s do a quick routine to help you disconnect properly and prepare for tomorrow.
              </p>
              <button 
                onClick={() => setStep(1)}
                className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Start Routine <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1: Outbox Check */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 text-neutral-800 font-semibold mb-2">
                <MessageSquare className="h-5 w-5 text-teal-600" />
                <h3>Pending Messages</h3>
              </div>
              <div className="p-5 bg-black/5 rounded-xl border border-white/20">
                {outboxCount > 0 ? (
                  <div className="space-y-4">
                    <p className="text-neutral-700">
                      You have <strong className="text-teal-700">{outboxCount}</strong> messages in your Right-to-Disconnect Outbox.
                    </p>
                    <p className="text-sm text-neutral-500">
                      They are safely scheduled to deliver tomorrow morning at {userProfile?.working_hours_start || '09:00 AM'}. You don&apos;t need to do anything.
                    </p>
                  </div>
                ) : (
                  <p className="text-neutral-700 text-center py-4">
                    Your outbox is clear. No pending messages to worry about!
                  </p>
                )}
              </div>
              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800 font-medium">Back</button>
                <button 
                  onClick={() => setStep(2)}
                  className="bg-neutral-800 hover:bg-black text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Schedule Review */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 text-neutral-800 font-semibold mb-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                <h3>Tomorrow&apos;s Schedule</h3>
              </div>
              
              <div className="space-y-3">
                {mockTomorrowSchedule.map((meeting, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${meeting.isEarly ? 'bg-orange-50 border-orange-200' : 'bg-card-bg border-neutral-200'}`}>
                    <div>
                      <h4 className={`font-medium ${meeting.isEarly ? 'text-orange-900' : 'text-neutral-800'}`}>{meeting.title}</h4>
                      <p className={`text-sm ${meeting.isEarly ? 'text-orange-700' : 'text-neutral-500'}`}>{meeting.time} • {meeting.duration}</p>
                    </div>
                    {meeting.isEarly && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-md">
                        <AlertTriangle className="h-3 w-3" /> Early Start
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg text-sm text-teal-800">
                <strong>Tip:</strong> You have an early meeting tomorrow before your standard start time ({userProfile?.working_hours_start || '09:00 AM'}). Consider logging off early today to preserve your balance.
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800 font-medium">Back</button>
                <button 
                  onClick={() => setStep(3)}
                  className="bg-neutral-800 hover:bg-black text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Final Check-in */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in text-center">
              <h3 className="text-xl font-semibold text-neutral-800">Final Check-in</h3>
              <p className="text-neutral-600 mb-6">How are you feeling as you close out the day?</p>
              
              <div className="flex flex-col gap-3">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.level}
                    disabled={isSubmitting}
                    onClick={() => handleMoodSelect(mood.level)}
                    className="flex items-center gap-4 p-4 bg-card-bg hover:bg-neutral-50 border border-neutral-200 rounded-xl transition-all hover:shadow-sm disabled:opacity-50"
                  >
                    {mood.icon}
                    <span className="font-medium text-neutral-800">{mood.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-start mt-4">
                <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800 font-medium">Back</button>
              </div>
            </div>
          )}

          {/* Step 4: Completion */}
          {step === 4 && (
            <div className="text-center space-y-6 animate-fade-in py-6">
              <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-semibold text-neutral-800">You&apos;re all set!</h3>
              <p className="text-neutral-600">
                You&apos;ve cleared your inbox, reviewed your schedule, and logged your mood. Now it&apos;s time to fully disconnect. Have a great evening!
              </p>
              <button 
                onClick={handleClose}
                className="w-full mt-4 bg-neutral-800 hover:bg-black text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Close Dashboard
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
