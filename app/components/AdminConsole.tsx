'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, ShieldAlert, Check, AlertOctagon, Save, Key, Globe, Eye, EyeOff, BarChart3, FileJson, FileSpreadsheet, Video } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../lib/database.types';
import { useAccessibility } from '../context/AccessibilityContext';

type AdminConfig = Database['public']['Tables']['admin_configs']['Row'];
type SecurityConfig = Database['public']['Tables']['security_configs']['Row'];
type AuditLogEntry = Database['public']['Tables']['audit_logs']['Row'];

// Extended Audit log type for UI rendering
interface UIAuditLogEntry extends AuditLogEntry {
  actorName: string;
}

export default function AdminConsole() {
  const { highContrast } = useAccessibility();
  
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [secConfigRowId, setSecConfigRowId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

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
  const [auditLog, setAuditLog] = useState<UIAuditLogEntry[]>([]);

  // Opt-in analytics
  const [optIn, setOptIn] = useState({ webcamCV: 0, messagingSync: 0, supportCircles: 0 });

  // CV global toggle
  const [cvGlobalDisabled, setCvGlobalDisabled] = useState(false);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated.');
      }

      // Check role (simplified for frontend migration; normally done via JWT/backend)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!profile || (profile.role !== 'Admin' && profile.role !== 'IT')) {
        throw new Error('Access Denied: You do not have the required Administrator permissions.');
      }

      setCurrentUser(user);

      // Fetch admin_configs
      const { data: adminCfg, error: adminErr } = await supabase
        .from('admin_configs')
        .select('*')
        .limit(1)
        .single();

      if (adminErr && adminErr.code !== 'PGRST116') throw adminErr;

      if (adminCfg) {
        setConfig(adminCfg);
        setStartHours(adminCfg.standard_workday_start);
        setEndHours(adminCfg.standard_workday_end);
        setCalendar(adminCfg.default_holiday_calendar);
        setFloor(adminCfg.privacy_floor);
        setEap(adminCfg.eap_referral_url || '');
        setCvGlobalDisabled(adminCfg.webcam_cv_global_disabled);
      }

      // Fetch security_configs
      const { data: secCfg, error: secErr } = await supabase
        .from('security_configs')
        .select('*')
        .limit(1)
        .single();

      if (secErr && secErr.code !== 'PGRST116') throw secErr;

      if (secCfg) {
        setSecConfigRowId(secCfg.id);
        setSsoProvider(secCfg.sso_provider as any || 'none');
        setScimEnabled(secCfg.scim_enabled);
        setDataResidency(secCfg.data_residency_region as any || 'US');
        setKmsKeyUrl(secCfg.kms_key_url || '');
      }

      // Fetch Audit Logs and join with user profiles
      await refreshAuditLogs();

      // Derive Opt-in Analytics dynamically
      const { data: profilesData } = await supabase.from('user_profiles').select('camera_telemetry_consented');
      if (profilesData && profilesData.length > 0) {
        const total = profilesData.length;
        const cvCount = profilesData.filter(p => p.camera_telemetry_consented).length;
        
        setOptIn({
          webcamCV: Math.round((cvCount / total) * 100),
          messagingSync: 0,
          supportCircles: 0
        });
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load configuration.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refreshAuditLogs = async () => {
    const { data: logsData } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (logsData) {
      // Fetch corresponding user names
      const actorIds = [...new Set(logsData.map(l => l.actor_id))];
      const { data: actorsData } = await supabase.from('user_profiles').select('id, full_name').in('id', actorIds);
      
      const actorMap: Record<string, string> = {};
      if (actorsData) {
        actorsData.forEach(a => { actorMap[a.id] = a.full_name; });
      }

      const uiLogs = logsData.map(l => ({
        ...l,
        actorName: actorMap[l.actor_id] || 'System/Unknown'
      }));
      setAuditLog(uiLogs);
    }
  };

  const logAuditAction = async (action: string, target: string) => {
    if (!currentUser) return;
    try {
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action,
        target
      });
      await refreshAuditLogs();
    } catch (e) {
      console.error('Failed to write audit log', e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setIsSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from('admin_configs')
        .update({
          standard_workday_start: startHours,
          standard_workday_end: endHours,
          default_holiday_calendar: calendar,
          privacy_floor: floor,
          eap_referral_url: eap
        })
        .eq('id', config.id)
        .select()
        .single();
      
      if (error) throw error;
      
      if (updated) {
        setConfig(updated);
        await logAuditAction('Updated Org-Wide System Preferences', 'admin_configs');
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSystemPaused = async () => {
    if (!config) return;
    const nextPaused = !config.emergency_kill_switch;
    try {
      const { data: updated, error } = await supabase
        .from('admin_configs')
        .update({ emergency_kill_switch: nextPaused })
        .eq('id', config.id)
        .select()
        .single();
      
      if (error) throw error;

      if (updated) {
        setConfig(updated);
        await logAuditAction(`System ${nextPaused ? 'paused' : 'resumed'} globally.`, 'admin_configs.emergency_kill_switch');
        window.dispatchEvent(new Event('pulse-system-paused-change'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to toggle emergency kill switch.');
    }
  };

  const handleSaveSecurityConfig = async () => {
    if (!secConfigRowId) return;
    try {
      const { error } = await supabase
        .from('security_configs')
        .update({
          sso_provider: ssoProvider === 'none' ? null : ssoProvider,
          scim_enabled: scimEnabled,
          data_residency_region: dataResidency,
          kms_key_url: kmsKeyUrl
        })
        .eq('id', secConfigRowId);
      
      if (error) throw error;

      await logAuditAction(`Security config updated: SSO=${ssoProvider}, SCIM=${scimEnabled ? 'on' : 'off'}, Residency=${dataResidency}`, 'security_configs');
      setSecSaveToast(true);
      setTimeout(() => setSecSaveToast(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save security configuration.');
    }
  };

  const handleToggleCVGlobal = async () => {
    if (!config) return;
    const next = !cvGlobalDisabled;
    setCvGlobalDisabled(next); // Optimistic UI update
    
    try {
      const { error } = await supabase
        .from('admin_configs')
        .update({ webcam_cv_global_disabled: next })
        .eq('id', config.id);
      
      if (error) throw error;
      
      await logAuditAction(`Webcam CV ${next ? 'disabled' : 'enabled'} org-wide.`, 'admin_configs.webcam_cv_global_disabled');
      window.dispatchEvent(new Event('pulse-cv-global-change'));
    } catch (err) {
      console.error(err);
      setCvGlobalDisabled(!next); // Revert on failure
      alert('Failed to toggle CV setting.');
    }
  };

  const handleExportAuditLog = (format: 'json' | 'csv') => {
    const log = auditLog;
    let content: string;
    let mimeType: string;
    let ext: string;

    if (format === 'json') {
      content = JSON.stringify(log, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      const header = 'id,actor,action,target,timestamp';
      const rows = log.map(e => `${e.id},"${e.actorName}","${e.action}","${e.target || ''}",${new Date(e.created_at).toISOString()}`);
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

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center items-center h-full">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center text-xs text-red-500 bg-red-50 rounded-2xl border border-red-200">
        <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="font-bold">{error}</p>
      </div>
    );
  }

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
      <div className={`p-6 bg-white rounded-2xl border flex flex-col md:flex-row gap-5 items-start justify-between ${highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
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
          className={`p-6 bg-white rounded-2xl border lg:col-span-2 space-y-5 flex flex-col justify-between ${highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
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
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-neutral-200'
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
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-neutral-200'
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
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-neutral-200'
                    }`}
                >
                  <option value="US Federal">US Federal Calendar</option>
                  <option value="UK Bank Holidays">UK Bank Holidays</option>
                  <option value="EU Standard">EU Standard Calendar</option>
                  <option value="APAC Standard">APAC Standard Calendar</option>
                  <option value="PH Standard">PH Standard Calendar</option>
                </select>
              </div>

              {/* k-anonymity floor */}
              <div>
                <label htmlFor="floor-select" className="block text-xs font-bold text-neutral-700 mb-1">
                  Minimum Team Privacy Threshold
                </label>
                <select
                  id="floor-select"
                  value={floor}
                  onChange={(e) => setFloor(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-neutral-200'
                    }`}
                >
                  <option value="5">Minimum 5 team members required (Standard)</option>
                  <option value="8">Minimum 8 team members required (Strict)</option>
                  <option value="10">Minimum 10 team members required (Highly conservative)</option>
                  <option value="12">Minimum 12 team members required (Maximum security)</option>
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
                className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-neutral-200'
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
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${highContrast
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
        <div className={`p-6 bg-white rounded-2xl border flex flex-col justify-between items-center text-center ${highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
          }`}>
          <div className="space-y-4 w-full">
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Emergency Kill Switch
            </span>

            {/* Red Octagon Shield */}
            <div className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto border-2 ${config.emergency_kill_switch
                ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                : 'bg-neutral-50 text-neutral-400 border-neutral-200'
              }`}>
              <AlertOctagon className="h-10 w-10 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-neutral-800 leading-snug">
                {config.emergency_kill_switch ? "System Suspended" : "System Active"}
              </h3>
              <span className="text-[10px] text-neutral-400 font-semibold block mt-0.5">
                {config.emergency_kill_switch ? "Data collection disabled org-wide" : "Collecting anonymous telemetry"}
              </span>
            </div>

            <p className="text-[10px] text-neutral-400 max-w-xs mx-auto leading-normal">
              Activating this pauses the sentiment survey popups, suspends CV eye tracking, and locks out telemetry sync databases globally.
            </p>
          </div>

          <button
            onClick={handleToggleSystemPaused}
            className={`w-full py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 mt-6 ${config.emergency_kill_switch
                ? 'bg-green-600 hover:bg-green-700 text-white border-transparent'
                : 'bg-red-600 hover:bg-red-750 text-white border-transparent shadow-md'
              }`}
          >
            <ShieldAlert className="h-4.5 w-4.5" />
            <span>{config.emergency_kill_switch ? "RESUME PULSE PORTAL" : "PAUSE PULSE SYSTEM"}</span>
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



      {/* ===== Security Configuration ===== */}
      <div className={`p-6 bg-white rounded-2xl border space-y-5 ${highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'}`}>
        <div className="flex items-center gap-2 border-b pb-3 border-neutral-100">
          <ShieldAlert className="h-5 w-5 text-teal-600" />
          <h3 className="text-base font-bold text-neutral-800">Security &amp; Compliance Configuration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SSO Provider */}
          <div>
            <label htmlFor="sso-provider-select" className="block text-xs font-bold text-neutral-700 mb-1">SSO Provider</label>
            <select
              id="sso-provider-select"
              value={ssoProvider}
              onChange={(e) => setSsoProvider(e.target.value as 'none' | 'okta' | 'entra_id')}
              className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-neutral-200'}`}
            >
              <option value="none">None (Password Auth)</option>
              <option value="okta">Okta</option>
              <option value="entra_id">Microsoft Entra ID</option>
            </select>
          </div>

          {/* Data Residency */}
          <div>
            <label htmlFor="data-residency-select" className="block text-xs font-bold text-neutral-700 mb-1">Data Residency Region</label>
            <select
              id="data-residency-select"
              value={dataResidency}
              onChange={(e) => setDataResidency(e.target.value as 'US' | 'EU' | 'APAC')}
              className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-neutral-200'}`}
            >
              <option value="US">United States</option>
              <option value="EU">European Union</option>
              <option value="APAC">Asia-Pacific</option>
            </select>
          </div>

          {/* KMS Key URL */}
          <div className="md:col-span-2">
            <label htmlFor="kms-key-input" className="block text-xs font-bold text-neutral-700 mb-1">KMS Encryption Key URL</label>
            <input
              id="kms-key-input"
              type="text"
              placeholder="e.g. https://kms.company.com/keys/pulse-prod"
              value={kmsKeyUrl}
              onChange={(e) => setKmsKeyUrl(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-neutral-200'}`}
            />
          </div>
        </div>

        {/* SCIM Toggle */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-bold text-neutral-700">SCIM 2.0 Directory Sync</span>
            <p className="text-[10px] text-neutral-400 mt-0.5">Auto-provision / de-provision users from your Identity Provider.</p>
          </div>
          <button
            onClick={() => setScimEnabled(!scimEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${scimEnabled ? 'bg-teal-500' : 'bg-neutral-300'}`}
            role="switch"
            aria-checked={scimEnabled}
            aria-label="Toggle SCIM sync"
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${scimEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between border-t pt-4 border-neutral-100">
          {secSaveToast ? (
            <span className="text-[11px] font-bold text-teal-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              <span>Security configuration saved!</span>
            </span>
          ) : (
            <span className="text-[10px] text-neutral-400">Changes are audited and logged in the compliance trail.</span>
          )}
          <button
            onClick={handleSaveSecurityConfig}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              highContrast ? 'bg-black text-white hover:bg-neutral-800' : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>Save Security Config</span>
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
            <div className="grid grid-cols-[120px_1fr_140px] text-[9px] font-bold text-neutral-400 uppercase tracking-wider px-3 py-2 border-b border-neutral-100">
              <span>Actor</span>
              <span>Action</span>
              <span className="text-right">Timestamp</span>
            </div>
            {auditLog.map(entry => (
              <div key={entry.id} className="grid grid-cols-[120px_1fr_140px] text-[11px] px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition">
                <span className="font-bold text-neutral-700 truncate pr-2">{entry.actorName}</span>
                <span className="text-neutral-600 truncate pr-2">{entry.action}</span>
                <span className="text-neutral-400 text-right text-[10px]">{new Date(entry.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
