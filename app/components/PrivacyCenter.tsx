'use client';

import React, { useState, useEffect} from'react';
import {
 ShieldCheck,
 Download,
 Trash2,
 EyeOff,
 Lock,
 Database,
 Info,
 AlertTriangle,
 Check
} from'lucide-react';
import { supabase} from'../lib/supabaseClient';
import { useAccessibility} from'../context/AccessibilityContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

export default function PrivacyCenter() {
 const { highContrast} = useAccessibility();
 const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
 const [purgeSuccess, setPurgeSuccess] = useState(false);
 const [cvGlobalDisabled, setCvGlobalDisabled] = useState(false);
 const [isExporting, setIsExporting] = useState(false);
 const [isPurging, setIsPurging] = useState(false);
 const [exportError, setExportError] = useState<string | null>(null);

 // Load org-wide camera telemetry status from Supabase admin_configs
 useEffect(() => {
 const fetchCvStatus = async () => {
 const { data} = await supabase
 .from('admin_configs')
 .select('webcam_cv_global_disabled')
 .single();
 if (data) {
 setCvGlobalDisabled(data.webcam_cv_global_disabled);
}
};

 fetchCvStatus();

 // Subscribe to real-time changes on admin_configs so the CV banner
 // updates immediately if an admin toggles the org-wide control
 const channel = supabase
 .channel('admin-cv-changes')
 .on(
'postgres_changes',
 { event:'UPDATE', schema:'public', table:'admin_configs'},
 (payload) => {
 const newConfig = payload.new as { webcam_cv_global_disabled: boolean};
 if (typeof newConfig.webcam_cv_global_disabled ==='boolean') {
 setCvGlobalDisabled(newConfig.webcam_cv_global_disabled);
}
}
 )
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
};
}, []);

 const handleExportData = async () => {
 setIsExporting(true);
 setExportError(null);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) throw new Error('Not authenticated.');

 // Fetch all private-plane data for the current user in parallel
 const [
 { data: moodLogs},
 { data: outboxMessages},
 { data: kudosPosts},
 { data: supportMessages},
 { data: briShiftRecords},
 { data: profile},
 ] = await Promise.all([
 supabase.from('mood_logs').select('*').eq('user_id', user.id),
 supabase.from('outbox_messages').select('*').eq('sender_id', user.id),
 supabase.from('kudos_posts').select('*').eq('sender_id', user.id),
 supabase.from('support_circle_messages').select('*').eq('user_id', user.id),
 supabase.from('bri_shift_records').select('*').eq('user_id', user.id),
 supabase.from('user_profiles').select('reading_ruler_enabled, dyslexic_font_enabled, high_contrast_enabled, share_bri_with_manager, camera_telemetry_consented').eq('id', user.id).single(),
 ]);

 const exportPayload = {
 moodLogs: moodLogs ?? [],
 outboxMessages: outboxMessages ?? [],
 kudosPosts: kudosPosts ?? [],
 supportMessages: supportMessages ?? [],
 briShiftRecords: briShiftRecords ?? [],
 accessibilityPreferences: profile ?? {},
 exportTimestamp: new Date().toISOString(),
};

 const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
 JSON.stringify(exportPayload, null, 2)
 )}`;
 const downloadAnchor = document.createElement('a');
 downloadAnchor.setAttribute('href', jsonString);
 downloadAnchor.setAttribute('download', `pulse-wbg-telemetry-export-${Date.now()}.json`);
 document.body.appendChild(downloadAnchor);
 downloadAnchor.click();
 downloadAnchor.remove();
} catch (err: unknown) {
 const message = err instanceof Error ? err.message :'Export failed. Please try again.';
 setExportError(message);
} finally {
 setIsExporting(false);
}
};

 const handlePurgeData = async () => {
 setIsPurging(true);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) throw new Error('Not authenticated.');

 // Mark the account as pending deletion approval — HR will review the request
 // per PRD v3.0 §5.16 (Deletion Request Review Queue)
 const { error} = await supabase
 .from('user_profiles')
 .update({ status:'pending_deletion_approval'})
 .eq('id', user.id);

 if (error) throw error;

 setPurgeSuccess(true);
} catch (err: unknown) {
 console.error('Purge request failed:', err);
} finally {
 setIsPurging(false);
}
};

 return (
 <div className="space-y-6">
 {/* Introduction Card */}
 <Card className={`p-6 glass-card bg-transparent border-transparent shadow-none rounded-2xl flex flex-col sm:flex-row gap-5 items-start justify-between ${
 highContrast ? 'text-black' : ''
}`}>
 <div className="space-y-2">
 <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2">
 <ShieldCheck className="h-5.5 w-5.5 text-teal-600" />
 <span>Your Well-Being Privacy Agreement</span>
 </h2>
 <p className="text-xs text-neutral-500 leading-relaxed max-w-2xl">
 Pulse is built to protect your privacy. All calculations happen directly on your own device—never on a company server. Our goal is to support your health without watching or tracking you. We guarantee your details remain 100% private.
 </p>
 </div>
 <span className="px-3 py-1 bg-[#EAEFE9] text-[#2F4F2F] border border-[#C3D2C1] rounded-full text-[10px] font-bold shrink-0">
 PRIVACY GUARANTEED
 </span>
 </Card>

 {/* Protocol Explanation Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* k-Anonymity card */}
 <Card className={`p-6 glass-card bg-transparent border-transparent shadow-none rounded-2xl space-y-4 ${
 highContrast ? 'text-black' : ''
}`}>
 <div className="flex items-center gap-2 border-b pb-3 border-neutral-100">
 <Lock className="h-5 w-5 text-teal-600" />
 <h3 className="text-xs font-bold text-neutral-800">Group-Only Sharing (Privacy Protection)</h3>
 </div>
 <p className="text-xs text-neutral-500 leading-relaxed">
 To make sure managers can never guess who submitted what answer, we never show scores for teams with fewer than <strong>5 active people</strong>. Your answers are completely hidden inside a group average.
 </p>
 <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-[10px] leading-relaxed text-neutral-400 space-y-1">
 <strong className="text-neutral-600 block">How it works:</strong>
 <p>If your team has fewer than 5 members, or if fewer than 5 people log their mood, all group charts are automatically blurred out. Team summaries only display when there is a large enough group to keep you anonymous.</p>
 </div>
 </Card>

 {/* Local CV processing card */}
 <Card className={`p-6 glass-card bg-transparent border-transparent shadow-none rounded-2xl space-y-4 ${
 highContrast ? 'text-black' : ''
} ${cvGlobalDisabled ?'opacity-60' :''}`}>
 {cvGlobalDisabled && (
 <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
 <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
 <span>Webcam CV has been disabled org-wide by your administrator. Individual preferences are overridden.</span>
 </div>
 )}
 <div className="flex items-center gap-2 border-b pb-3 border-neutral-100">
 <EyeOff className="h-5 w-5 text-teal-600" />
 <h3 className="text-xs font-bold text-neutral-800">On-Device Camera Analysis</h3>
 </div>
 <p className="text-xs text-neutral-500 leading-relaxed">
 If you turn it on, the system uses your webcam to look at posture and eye blinks to guess if you are tired. It never records your face, takes photos, or saves video.
 </p>
 <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-[10px] leading-relaxed text-neutral-400 space-y-1">
 <strong className="text-neutral-600 block">Data Safety Guarantee:</strong>
 <p>All camera calculations happen directly inside your browser. No video, images, or facial recognition profiles are ever saved, stored, or sent over the internet. Your webcam stream never leaves your computer.</p>
 </div>
 </Card>
 </div>

 {/* Data Management Center */}
 <Card className={`p-6 glass-card bg-transparent border-transparent shadow-none rounded-2xl space-y-5 ${
 highContrast ? 'text-black' : ''
}`}>
 <div className="flex items-center gap-2 border-b pb-3 border-neutral-100">
 <Database className="h-5 w-5 text-teal-600" />
 <h3 className="text-xs font-bold text-neutral-800">Download &amp; Delete Your Data</h3>
 </div>

 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="space-y-1">
 <span className="block text-xs font-bold text-neutral-700">Export &amp; Purge Controls</span>
 <p className="text-[11px] text-neutral-400 leading-relaxed max-w-xl">
 You own your information. You can download a copy of all your check-ins and settings as a file, or permanently wipe your profile from this computer.
 </p>
 {exportError && (
 <p className="text-[11px] text-red-500 font-semibold mt-1">{exportError}</p>
 )}
 </div>

 {/* Action buttons */}
 <div className="flex flex-wrap gap-2.5">
 <Button onClick={handleExportData} disabled={isExporting} className="gap-1.5">
 <Download className="h-4.5 w-4.5" />
 <span>{isExporting ? 'Exporting...' : 'Download My Data (JSON File)'}</span>
 </Button>

 <Button
 variant="ghost"
 onClick={() => setShowPurgeConfirm(true)}
 className="gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 focus:ring-2 focus:ring-red-500"
 >
 <Trash2 className="h-4.5 w-4.5" />
 <span>Delete My Profile</span>
 </Button>
 </div>
 </div>
 </Card>

 {/* Purge Profile Warning dialog */}
 <Dialog open={showPurgeConfirm} onOpenChange={setShowPurgeConfirm}>
 <DialogContent className={`sm:max-w-md space-y-4 ${highContrast ? 'text-black' : ''}`}>
 <DialogHeader>
 <div className="flex items-start gap-3">
 <div className="h-10 w-10 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
 <AlertTriangle className="h-5 w-5" />
 </div>
 <div>
 <DialogTitle className="text-sm font-bold text-neutral-800">
 Confirm Profile Deletion?
 </DialogTitle>
 <span className="text-[10px] font-semibold text-red-600 block mt-0.5">This cannot be undone</span>
 </div>
 </div>
 </DialogHeader>

 <div className="text-xs text-neutral-500 leading-relaxed space-y-2">
 {purgeSuccess ? (
 <div className="py-4 text-center space-y-3">
 <div className="h-12 w-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
 <Check className="h-6 w-6 stroke-[3.0]" />
 </div>
 <p className="font-bold text-neutral-800">Deletion Request Submitted</p>
 <p className="text-[10px] text-neutral-400">Your request has been forwarded to HR for review. Your account will be permanently deleted after the approval and grace period.</p>
 </div>
 ) : (
 <>
 <p>
 You are requesting to permanently delete your mood logs, saved kudos, and settings from this platform.
 </p>
 <div className="p-3 rounded-lg bg-red-50/50 border border-red-100/50 text-[10px] text-neutral-600 flex items-start gap-2">
 <Info className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
 <p>
 Deleting your data will reset your Burnout Risk Index, clear any pending messages scheduled for after-hours, and erase your account data. Your request will be reviewed by HR before permanent deletion is executed.
 </p>
 </div>
 <p className="pt-2">Click below to confirm deletion request.</p>
 </>
 )}
 </div>

 {!purgeSuccess && (
 <DialogFooter>
 <Button variant="secondary" size="sm" onClick={() => setShowPurgeConfirm(false)}>
 Cancel
 </Button>
 <Button
 variant="destructive"
 size="sm"
 onClick={handlePurgeData}
 disabled={isPurging}
 className="gap-1.5"
 >
 <Trash2 className="h-4 w-4" />
 <span>{isPurging ? 'Submitting...' : 'Delete All Data'}</span>
 </Button>
 </DialogFooter>
 )}
 </DialogContent>
 </Dialog>
 </div>
 );
}
