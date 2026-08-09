'use client';

import React, { useState } from 'react';
import { EyeOff, Info, Users } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

export default function KAnonymityEmptyState() {
  const { highContrast } = useAccessibility();
  // Simulate team responses count. If >= 5, k-anonymity threshold is met and chart is revealed.
  const [responseCount, setResponseCount] = useState(3);

  // Mock team workload analytics data
  const mockWorkload = [
    { department: 'Engineering', stress: 62, count: 8 },
    { department: 'Product Management', stress: 45, count: 4 },
    { department: 'Design & UX', stress: 50, count: 3 },
    { department: 'Marketing & Ops', stress: 58, count: 6 },
  ];

  return (
    <section 
      className={`p-6 bg-white rounded-2xl border focus-dimming-card shadow-xs relative overflow-hidden flex flex-col justify-between ${
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}
      aria-labelledby="kanon-title"
    >
      {/* Widget Header with simulation toggler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b pb-3 border-neutral-100">
        <div>
          <h2 id="kanon-title" className="text-base font-bold text-neutral-800 flex items-center gap-1.5">
            <Users className="h-5 w-5 text-teal-600" />
            <span>Team Workload & Energy Analysis</span>
          </h2>
          <p className="text-[11px] text-neutral-400">Aggregate team stress telemetry indicators</p>
        </div>
        
        {/* Interactive simulation controls */}
        <div className="flex items-center gap-2">
          <label htmlFor="cohort-select" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            Cohort Responses:
          </label>
          <div className="inline-flex rounded-lg p-0.5 bg-neutral-100 border border-neutral-200">
            <button
              onClick={() => setResponseCount(3)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                responseCount === 3
                  ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Small (3)
            </button>
            <button
              onClick={() => setResponseCount(7)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                responseCount === 7
                  ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Large (7)
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Chart Area (Blurred if responseCount < 5) */}
      <div className="relative min-h-[220px] w-full rounded-xl p-4 bg-neutral-50/50 flex flex-col justify-end">
        {/* Render simulated bar chart */}
        <div className={`space-y-4 w-full transition-all duration-500 ${
          responseCount < 5 ? 'blur-md select-none pointer-events-none opacity-50' : 'blur-none opacity-100'
        }`}>
          {mockWorkload.map((dept) => (
            <div key={dept.department} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-neutral-700">
                <span>{dept.department}</span>
                <span>Workload Index: {dept.stress}%</span>
              </div>
              <div className="w-full h-3 bg-neutral-200/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-600 rounded-full transition-all duration-1000"
                  style={{ width: `${dept.stress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* k-Anonymity privacy veil */}
        {responseCount < 5 && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md bg-white/70 animate-fade-in"
            role="alert"
            aria-live="polite"
          >
            <div className="h-12 w-12 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-500 flex items-center justify-center mb-3.5 shadow-sm">
              <EyeOff className="h-6 w-6" />
            </div>
            
            <h3 className="text-sm font-bold text-neutral-800 mb-1.5">
              Insufficient data for this group to protect team privacy
            </h3>
            
            <p className="text-xs text-neutral-500 max-w-xs leading-normal">
              AxionHR mandates a privacy threshold (k &ge; 5). A minimum of 5 team members must submit logs to display collective analytics.
            </p>

            <div className="mt-3.5 px-3 py-1.5 bg-neutral-50 rounded-lg border border-neutral-100 text-[10px] text-neutral-400 font-medium">
              Current submissions: <span className="text-neutral-700 font-bold">{responseCount} / 5</span> required
            </div>
          </div>
        )}
      </div>

      {/* Explanatory Footer */}
      <div className={`mt-4 p-3 rounded-xl border bg-neutral-50 text-[11px] text-neutral-500 leading-relaxed ${
        highContrast ? 'border-black text-black' : 'border-neutral-100'
      }`}>
        <div className="flex gap-2">
          <Info className="h-4.5 w-4.5 text-teal-600 shrink-0 mt-0.5" />
          <p>
            <strong>k-Anonymity Compliance:</strong> To shield individuals from profile reconstruction by supervisors, group metrics remain strictly locked until the active cohort has sufficient aggregate answers.
          </p>
        </div>
      </div>
    </section>
  );
}
