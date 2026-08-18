'use client';

import React, { useState, useEffect, useCallback} from'react';
import { Mail, Clock, Send, Trash2, Edit2, AlertTriangle, Check, ShieldAlert} from'lucide-react';
import { supabase} from'../lib/supabaseClient';
import { Database} from'../lib/database.types';
import { useAccessibility} from'../context/AccessibilityContext';

type OutboxMessage = Database['public']['Tables']['outbox_messages']['Row'];

// The JSONB payload shape stored inside each outbox_messages row
interface OutboxPayload {
 subject: string;
 content: string;
 recipientName: string;
}

interface RightToDisconnectOutboxProps {
 onRefreshStats: () => void;
 refreshTrigger: number;
}

export default function RightToDisconnectOutbox({ onRefreshStats, refreshTrigger}: RightToDisconnectOutboxProps) {
 const { highContrast} = useAccessibility();
 const [messages, setMessages] = useState<OutboxMessage[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // Selection states for modal/edit
 const [selectedMessage, setSelectedMessage] = useState<OutboxMessage | null>(null);
 const [isConfirmOpen, setIsConfirmOpen] = useState(false);
 const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

 // Editing form states
 const [editSubject, setEditSubject] = useState('');
 const [editContent, setEditContent] = useState('');

 // Helper to extract typed payload from the JSONB field
 const getPayload = (msg: OutboxMessage): OutboxPayload => {
 const p = msg.payload as Record<string, unknown>;
 return {
 subject: typeof p?.subject ==='string' ? p.subject :'(No subject)',
 content: typeof p?.content ==='string' ? p.content :'',
 recipientName: typeof p?.recipientName ==='string' ? p.recipientName : msg.recipient_id,
};
};

 const fetchMessages = useCallback(async () => {
 setIsLoading(true);
 setError(null);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (!user) return;

 const { data, error: fetchError} = await supabase
 .from('outbox_messages')
 .select('*')
 .eq('sender_id', user.id)
 .eq('status','queued')
 .order('deliver_after', { ascending: true});

 if (fetchError) throw fetchError;
 setMessages(data ?? []);
} catch (err: unknown) {
 setError('Could not load outbox messages.');
 console.error(err);
} finally {
 setIsLoading(false);
}
}, []);

 // Initial load and refresh-trigger reload
 useEffect(() => {
 fetchMessages();
}, [fetchMessages, refreshTrigger]);

 // Realtime subscription — reflect delivery and status changes instantly
 useEffect(() => {
 const channel = supabase
 .channel('outbox-changes')
 .on(
'postgres_changes',
 { event:'*', schema:'public', table:'outbox_messages'},
 () => { fetchMessages();}
 )
 .subscribe();

 return () => { supabase.removeChannel(channel);};
}, [fetchMessages]);

 const handleCancelMessage = async (id: string) => {
 const { error: updateError} = await supabase
 .from('outbox_messages')
 .update({ status:'canceled'})
 .eq('id', id);

 if (!updateError) {
 setMessages(prev => prev.filter(m => m.id !== id));
 onRefreshStats();
}
};

 const handleEditClick = (msg: OutboxMessage) => {
 const payload = getPayload(msg);
 setEditingMessageId(msg.id);
 setEditSubject(payload.subject);
 setEditContent(payload.content);
};

 const handleSaveEdit = async (msg: OutboxMessage) => {
 if (!editSubject.trim() || !editContent.trim()) return;

 const existingPayload = msg.payload as Record<string, unknown>;
 const updatedPayload = {
 ...existingPayload,
 subject: editSubject.trim(),
 content: editContent.trim(),
};

 const { error: updateError} = await supabase
 .from('outbox_messages')
 .update({ payload: updatedPayload})
 .eq('id', msg.id);

 if (!updateError) {
 setMessages(prev =>
 prev.map(m => m.id === msg.id ? { ...m, payload: updatedPayload} : m)
 );
 setEditingMessageId(null);
}
};

 const triggerSendAnyway = (msg: OutboxMessage) => {
 setSelectedMessage(msg);
 setIsConfirmOpen(true);
};

 const confirmSendAnyway = async () => {
 if (!selectedMessage) return;

 const { error: updateError} = await supabase
 .from('outbox_messages')
 .update({ status:'delivered'})
 .eq('id', selectedMessage.id);

 if (!updateError) {
 setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
 setIsConfirmOpen(false);
 setSelectedMessage(null);
 onRefreshStats();
}
};

 return (
 <section
 className={`p-4 sm:p-6 glass-card rounded-2xl border focus-dimming-card shadow-xs flex flex-col justify-between h-full ${
 highContrast ?'border-black text-black' :'border-border-color'
}`}
 aria-labelledby="disconnect-title"
 >
 <div>
 {/* Title */}
 <div className="flex items-center justify-between mb-4 border-b pb-3 border-neutral-100">
 <div>
 <h2 id="disconnect-title" className="text-base font-bold text-neutral-800 flex items-center gap-2">
 <Clock className="h-5 w-5 text-teal-600" />
 <span>Right-to-Disconnect Outbox</span>
 </h2>
 <p className="text-[11px] text-neutral-400">Scheduled for Delivery (Active working hours safety guard)</p>
 </div>
 <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-teal-50 text-teal-700 border border-teal-100 uppercase tracking-wider">
 {messages.length} Queue{messages.length !== 1 ?'s' :''}
 </span>
 </div>

 {/* Message List */}
 {isLoading ? (
 <div className="py-10 flex items-center justify-center">
 <div className="flex gap-1.5">
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'0ms'}} />
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'150ms'}} />
 <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'300ms'}} />
 </div>
 </div>
 ) : error ? (
 <div className="py-10 text-center text-xs text-red-500">{error}</div>
 ) : messages.length === 0 ? (
 <div className="py-10 text-center flex flex-col items-center justify-center">
 <div className="h-10 w-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-3">
 <Check className="h-5 w-5 text-teal-600" />
 </div>
 <p className="text-xs font-semibold text-neutral-700">Outbox is clear</p>
 <p className="text-[10px] text-neutral-400 mt-1 max-w-[200px] leading-normal">
 No communications are queued for release. Well done staying disconnected!
 </p>
 </div>
 ) : (
 <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
 {messages.map((msg) => {
 const payload = getPayload(msg);
 return (
 <div
 key={msg.id}
 className={`p-4 rounded-xl border bg-neutral-50/40 text-xs flex flex-col gap-2.5 transition-all ${
 highContrast ?'border-black' :'border-neutral-100 hover:bg-neutral-50'
}`}
 >
 {editingMessageId === msg.id ? (
 /* Inline Editor Mode */
 <div className="space-y-2">
 <div>
 <label className="block text-[10px] font-bold text-neutral-400 mb-0.5">Subject</label>
 <input
 type="text"
 value={editSubject}
 onChange={(e) => setEditSubject(e.target.value)}
 className={`w-full p-2 rounded-md border glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>
 <div>
 <label className="block text-[10px] font-bold text-neutral-400 mb-0.5">Content</label>
 <textarea
 value={editContent}
 rows={2}
 onChange={(e) => setEditContent(e.target.value)}
 className={`w-full p-2 rounded-md border glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>
 <div className="flex justify-end gap-1.5 pt-1">
 <button
 onClick={() => setEditingMessageId(null)}
 className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-semibold transition"
 >
 Cancel
 </button>
 <button
 onClick={() => handleSaveEdit(msg)}
 className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold transition"
 >
 Save
 </button>
 </div>
 </div>
 ) : (
 /* Display Mode */
 <>
 <div className="flex items-start justify-between gap-3">
 <div className="space-y-0.5">
 <span className="block font-bold text-neutral-700 leading-snug">{payload.subject}</span>
 <div className="flex items-center gap-1.5 text-neutral-400 font-medium text-[10px]">
 <Mail className="h-3.5 w-3.5 shrink-0" />
 <span>To: {payload.recipientName}</span>
 </div>
 </div>
 <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 flex items-center gap-1 shrink-0">
 <Clock className="h-3 w-3" />
 <span>Workday Lock</span>
 </span>
 </div>

 <p className="text-neutral-500 leading-normal line-clamp-2 italic glass-card/50 p-2 rounded border border-neutral-100/50">
 &ldquo;{payload.content}&rdquo;
 </p>

 {/* Action Row */}
 <div className="flex items-center justify-between border-t pt-2.5 mt-0.5 border-neutral-100">
 <span className="text-[9px] font-medium text-neutral-400 shrink-0">
 Auto-release: {new Date(msg.deliver_after).toLocaleString()}
 </span>

 <div className="flex items-center gap-1">
 <button
 onClick={() => handleEditClick(msg)}
 className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
 title="Edit message content"
 aria-label="Edit message"
 >
 <Edit2 className="h-3.5 w-3.5" />
 </button>
 <button
 onClick={() => handleCancelMessage(msg.id)}
 className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
 title="Cancel scheduled delivery"
 aria-label="Cancel message"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 <button
 onClick={() => triggerSendAnyway(msg)}
 className={`ml-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
 highContrast
 ?'bg-black text-white hover:bg-neutral-800'
 :'bg-neutral-100 text-neutral-800 border-border-color hover:bg-neutral-200 shadow-sm'
}`}
 >
 <Send className="h-2.5 w-2.5" />
 <span>Send Anyway</span>
 </button>
 </div>
 </div>
 </>
 )}
 </div>
 );
})}
 </div>
 )}
 </div>

 {/* Warning Tip at bottom */}
 <div className={`mt-4 p-3 rounded-xl border bg-neutral-50 text-[10px] text-neutral-500 leading-normal flex items-start gap-1.5 shrink-0 ${
 highContrast ?'border-black text-black' :'border-neutral-100'
}`}>
 <AlertTriangle className="h-4 w-4 text-teal-600 shrink-0" />
 <p>
 Messages composed outside of recipient workday hours are locked by default to protect mental health boundaries and prevent overtime notifications.
 </p>
 </div>

 {/* Send Anyway / Urgent Delivery Confirmation Modal Dialog */}
 {isConfirmOpen && selectedMessage && (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-fade-in"
 role="dialog"
 aria-modal="true"
 aria-labelledby="modal-title"
 aria-describedby="modal-desc"
 >
 <div className={`w-full max-w-md p-6 bg-white rounded-2xl border shadow-2xl space-y-4 animate-scale-up ${
 highContrast ?'border-black text-black' :'border-neutral-100'
}`}>
 {/* Modal Header */}
 <div className="flex items-start gap-3">
 <div className="h-10 w-10 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
 <ShieldAlert className="h-5 w-5" />
 </div>
 <div>
 <h3 id="modal-title" className="text-sm font-bold text-neutral-800">
 Override Right-to-Disconnect?
 </h3>
 <span className="text-[10px] font-semibold text-neutral-400 block mt-0.5">Ugent Delivery Confirmation</span>
 </div>
 </div>

 {/* Modal Body */}
 <div id="modal-desc" className="text-xs text-neutral-500 leading-relaxed space-y-2">
 <p>
 The recipient (<strong>{getPayload(selectedMessage).recipientName}</strong>) is currently off-duty based on local working hour calendars.
 </p>
 <div className={`p-3 rounded-lg bg-orange-50/50 border border-orange-100/50 text-[10px] text-neutral-600 flex items-start gap-2 ${
 highContrast ?'border-black text-black' :''
}`}>
 <AlertTriangle className="h-4.5 w-4.5 text-orange-600 shrink-0 mt-0.5" />
 <p>
 Sending non-urgent emails after-hours can induce stress, increase digital cognitive burden, and interrupt restorative downtime.
 </p>
 </div>
 <p>Are you sure this communication requires immediate attention and cannot wait for tomorrow morning?</p>
 </div>

 {/* Modal Footer Actions */}
 <div className="flex items-center justify-end gap-2 border-t pt-3.5 border-neutral-100">
 <button
 onClick={() => {
 setIsConfirmOpen(false);
 setSelectedMessage(null);
}}
 className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-150 hover:bg-neutral-200 text-neutral-700 transition"
 >
 No, Keep Locked
 </button>
 <button
 onClick={confirmSendAnyway}
 className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition flex items-center gap-1"
 >
 <span>Yes, Send Urgent</span>
 </button>
 </div>
 </div>
 </div>
 )}
 </section>
 );
}
