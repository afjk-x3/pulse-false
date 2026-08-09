'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, ShieldAlert, Check, AlertOctagon, Save, Key, Globe, Eye, EyeOff, BarChart3, FileJson, FileSpreadsheet, Video } from 'lucide-react';
import { PulseDB, AdminConfig, SecurityConfig, AuditLogEntry } from '../lib/db';
import { useAccessibility } from '../context/AccessibilityContext';

export default function AdminConsole() {
  const { highContrast } = useAccessibility();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  
  // Settings Form states
  const [startHours, setStartHours] = useState('09:00');
  const [endHours, setEndHours] = useState('18:00');
  const [calendar, setCalendar] = useState('US Federal');
  const [floor, setFloor] = useState(5);
  const [eap, setEap] = useState('');
  
  // States
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Security config states
  const [ssoProvider, setSsoProvider] = useState<'none' | 'okta' | 'entra_id'>('none');
  const [scimEnabled, setScimEnabled] = useState(false);
  const [dataResidency, setDataResidency] = useState<'US' | 'EU' | 'APAC'>('US');
  const [kmsKeyUrl, setKmsKeyUrl] = useState('');
  const [secSaveToast, setSecSaveToast] = useState(false);

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  // Opt-in analytics
  const [optIn, setOptIn] = useState({ webcamCV: 0, messagingSync: 0, supportCircles: 0 });

  // CV global toggle
  const [cvGlobalDisabled, setCvGlobalDisabled] = useState(false);

  useEffect(() => {
    const data = PulseDB.getAdminConfig();
    const sec = PulseDB.getSecurityConfig();
    const timer = setTimeout(() => {
      setConfig(data);
      setStartHours(data.workingHoursStart);
      setEndHours(data.workingHoursEnd);
      setCalendar(data.holidayCalendar);
      setFloor(data.kanonymityFloor);
      setEap(data.eapLink);
      setCvGlobalDisabled(data.webcamCVGlobalDisabled || false);

      setSsoProvider(sec.ssoProvider);
      setScimEnabled(sec.scimEnabled);
      setDataResidency(sec.dataResidency);
      setKmsKeyUrl(sec.kmsKeyUrl);

      setAuditLog(PulseDB.getAuditLog());
      setOptIn(PulseDB.getOptInAnalytics());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setIsSaving(true);
    setTimeout(() => {
      const updated = PulseDB.updateAdminConfig({
        workingHoursStart: startHours,
        workingHoursEnd: endHours,
        holidayCalendar: calendar,
        kanonymityFloor: floor,
        eapLink: eap
      });
      setConfig(updated);
      setIsSaving(false);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
    }, 1000);
  };

  const handleToggleSystemPaused = () => {
    if (!config) return;
    const nextPaused = !config.systemPaused;
    const updated = PulseDB.updateAdminConfig({ systemPaused: nextPaused });
    setConfig(updated);
    PulseDB.addAuditLogEntry('Admin', `System ${nextPaused ? 'paused' : 'resumed'} globally.`);
    setAuditLog(PulseDB.getAuditLog());
    window.dispatchEvent(new Event('pulse-system-paused-change'));
  };

  const handleSaveSecurityConfig = () => {
    PulseDB.updateSecurityConfig({ ssoProvider, scimEnabled, dataResidency, kmsKeyUrl });
    PulseDB.addAuditLogEntry('Admin', `Security config updated: SSO=${ssoProvider}, SCIM=${scimEnabled ? 'on' : 'off'}, Residency=${dataResidency}`);
    setAuditLog(PulseDB.getAuditLog());
    setSecSaveToast(true);
    setTimeout(() => setSecSaveToast(false), 3000);
  };

  const handleToggleCVGlobal = () => {
    const next = !cvGlobalDisabled;
    setCvGlobalDisabled(next);
    PulseDB.updateAdminConfig({ webcamCVGlobalDisabled: next });
    PulseDB.addAuditLogEntry('Admin', `Webcam CV ${next ? 'disabled' : 'enabled'} org-wide.`);
    setAuditLog(PulseDB.getAuditLog());
    window.dispatchEvent(new Event('pulse-cv-global-change'));
  };

  const handleExportAuditLog = (format: 'json' | 'csv') => {
    const log = PulseDB.getAuditLog();
    let content: string;
    let mimeType: string;
    let ext: string;

    if (format === 'json') {
      content = JSON.stringify(log, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      const header = 'id,actor,action,timestamp';
      const rows = log.map(e => `${e.id},"${e.actor}","${e.action}",${new Date(e.timestamp).toISOString()}`);
      content = [header, ...rows].join('\n');
      mimeType = 'text/csv';
      ext = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-audit-log-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!config) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400">
        Loading HR/IT Admin preferences...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className={`p-6 bg-white rounded-2xl border flex flex-col md:flex-row gap-5 items-start justify-between ${
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}>
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2">
            <Sliders className="h-5.5 w-5.5 text-teal-600" />
            <span>HR/IT Admin Console</span>
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-2xl">
            Configure org-wide working hour boundaries, privacy floors for team data aggregation, local EAP referral destinations, and manage emergency system overrides.
          </p>
        </div>

        <span className="px-3 py-1 bg-neutral-900 text-white rounded-full text-[10px] font-bold shrink-0">
          ROLE: HR ADMINISTRATOR
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Data Grid Form (2 cols) */}
        <form 
          onSubmit={handleSaveSettings}
          className={`p-6 bg-white rounded-2xl border lg:col-span-2 space-y-5 flex flex-col justify-between ${
            highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
          }`}
        >
          <div className="space-y-4">
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b pb-2 border-neutral-100">
              Org-Wide System Preferences
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Working hours start */}
              <div>
                <label htmlFor="start-hours-select" className="block text-xs font-bold text-neutral-700 mb-1">
                  Standard Workday Start
                </label>
                <input
                  id="start-hours-select"
                  type="time"
                  required
                  value={startHours}
                  onChange={(e) => setStartHours(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              {/* Working hours end */}
              <div>
                <label htmlFor="end-hours-select" className="block text-xs font-bold text-neutral-700 mb-1">
                  Standard Workday End
                </label>
                <input
                  id="end-hours-select"
                  type="time"
                  required
                  value={endHours}
                  onChange={(e) => setEndHours(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              {/* Holiday Calendar */}
              <div>
                <label htmlFor="calendar-select" className="block text-xs font-bold text-neutral-700 mb-1">
                  Default Holiday Calendar
                </label>
                <select
                  id="calendar-select"
                  value={calendar}
                  onChange={(e) => setCalendar(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                >
                  <option value="US Federal">US Federal Calendar</option>
                  <option value="UK Bank Holidays">UK Bank Holidays</option>
                  <option value="EU Standard">EU Standard Calendar</option>
                  <option value="APAC Standard">APAC Standard Calendar</option>
                </select>
              </div>

              {/* k-anonymity floor */}
              <div>
                <label htmlFor="floor-select" className="block text-xs font-bold text-neutral-700 mb-1">
                  k-Anonymity Privacy Floor
                </label>
                <select
                  id="floor-select"
                  value={floor}
                  onChange={(e) => setFloor(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                >
                  <option value="5">k=5 (Standard recommendation)</option>
                  <option value="8">k=8 (Stricter privacy rules)</option>
                  <option value="10">k=10 (Highly conservative)</option>
                  <option value="12">k=12 (Maximum security)</option>
                </select>
              </div>
            </div>

            {/* EAP counseling link */}
            <div>
              <label htmlFor="eap-link-input" className="block text-xs font-bold text-neutral-700 mb-1">
                Employee Assistance Program (EAP) Referral URL
              </label>
              <input
                id="eap-link-input"
                type="url"
                required
                placeholder="e.g. https://company.intranet/eap-wellbeing"
                value={eap}
                onChange={(e) => setEap(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                  highContrast ? 'border-black' : 'border-neutral-200'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4 mt-6 border-neutral-100">
            {showSaveToast ? (
              <span className="text-[11px] font-bold text-teal-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                <span>Configuration changes saved successfully!</span>
              </span>
            ) : (
              <span className="text-[10px] text-neutral-400">
                * Settings alterations apply to all non-override employee profiles.
              </span>
            )}
            
            <button
              type="submit"
              disabled={isSaving}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                highContrast
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>

        {/* System Paused Red Kill Switch (1 col) */}
        <div className={`p-6 bg-white rounded-2xl border flex flex-col justify-between items-center text-center ${
          highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
        }`}>
          <div className="space-y-4 w-full">
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Emergency Kill Switch
            </span>

            {/* Red Octagon Shield */}
            <div className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto border-2 ${
              config.systemPaused
                ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                : 'bg-neutral-50 text-neutral-400 border-neutral-200'
            }`}>
              <AlertOctagon className="h-10 w-10 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-neutral-800 leading-snug">
                {config.systemPaused ? "System Suspended" : "System Active"}
              </h3>
              <span className="text-[10px] text-neutral-400 font-semibold block mt-0.5">
                {config.systemPaused ? "Data collection disabled org-wide" : "Collecting anonymous telemetry"}
              </span>
            </div>

            <p className="text-[10px] text-neutral-400 max-w-xs mx-auto leading-normal">
              Activating this pauses the sentiment survey popups, suspends CV eye tracking, and locks out telemetry sync databases globally.
            </p>
          </div>

          <button
            onClick={handleToggleSystemPaused}
            className={`w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 mt-6 ${
              config.systemPaused
                ? 'bg-green-600 hover:bg-green-700 text-white border-transparent'
                : 'bg-red-600 hover:bg-red-750 text-white border-transparent shadow-md'
            }`}
          >
            <ShieldAlert className="h-4.5 w-4.5" />
            <span>{config.systemPaused ? "RESUME PULSE PORTAL" : "PAUSE PULSE SYSTEM"}</span>
          </button>
        </div>
      </div>

      {/* ===== Webcam CV Global Kill Switch ===== */}
      <div className={`p-6 bg-white rounded-2xl border ${highContrast ? 'border-black' : 'border-[#f1f0ea]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${cvGlobalDisabled ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
              {cvGlobalDisabled ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-800">Org-Wide Webcam CV Enforcement</h3>
              <p className="text-[10px] text-neutral-400 mt-0.5">{cvGlobalDisabled ? 'Computer vision disabled for all employees' : 'Employees may individually opt in to webcam CV'}</p>
            </div>
          </div>
          <button
            onClick={handleToggleCVGlobal}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${cvGlobalDisabled ? 'bg-red-500' : 'bg-emerald-500'}`}
            role="switch"
            aria-checked={!cvGlobalDisabled}
            aria-label="Toggle org-wide webcam CV"
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${cvGlobalDisabled ? 'translate-x-1' : 'translate-x-6'}`} />
          </button>
        </div>
      </div>



      {/* ===== Module Opt-in Analytics ===== */}
      <div className={`p-6 bg-white rounded-2xl border space-y-5 ${highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'}`}>
        <div className="flex items-center gap-2 border-b pb-3 border-neutral-100">
          <BarChart3 className="h-5 w-5 text-teal-600" />
          <h3 className="text-base font-bold text-neutral-800">Module Opt-in Analytics</h3>
        </div>
        <p className="text-xs text-neutral-500">Org-wide adoption rates for optional well-being modules.</p>

        <div className="space-y-4">
          {[
            { label: 'Webcam Computer Vision', value: optIn.webcamCV, icon: <Video className="h-4 w-4" />, color: 'bg-teal-600' },
            { label: 'Messaging Sync & Analysis', value: optIn.messagingSync, icon: <Globe className="h-4 w-4" />, color: 'bg-blue-600' },
            { label: 'Support Circles', value: optIn.supportCircles, icon: <Eye className="h-4 w-4" />, color: 'bg-amber-600' }
          ].map(mod => (
            <div key={mod.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-700 flex items-center gap-1.5">{mod.icon} {mod.label}</span>
                <span className="font-extrabold text-neutral-400">{mod.value}% opted in</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${mod.color} transition-all duration-700`} style={{ width: `${mod.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Compliance Audit Log ===== */}
      <div className={`p-6 bg-white rounded-2xl border space-y-5 ${highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'}`}>
        <div className="flex items-center justify-between border-b pb-3 border-neutral-100">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-teal-600" />
            <h3 className="text-base font-bold text-neutral-800">Compliance Audit Log</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportAuditLog('json')}
              className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <FileJson className="h-3.5 w-3.5" /> Export JSON
            </button>
            <button
              onClick={() => handleExportAuditLog('csv')}
              className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {auditLog.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-4">No audit events recorded yet. Actions are logged when settings are changed.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            <div className="grid grid-cols-[80px_1fr_140px] text-[9px] font-bold text-neutral-400 uppercase tracking-wider px-3 py-2 border-b border-neutral-100">
              <span>Actor</span>
              <span>Action</span>
              <span className="text-right">Timestamp</span>
            </div>
            {[...auditLog].reverse().map(entry => (
              <div key={entry.id} className="grid grid-cols-[80px_1fr_140px] text-[11px] px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition">
                <span className="font-bold text-neutral-700">{entry.actor}</span>
                <span className="text-neutral-600 truncate pr-2">{entry.action}</span>
                <span className="text-neutral-400 text-right text-[10px]">{new Date(entry.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
