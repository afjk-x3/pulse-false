'use client';

import React, { useState, useEffect, useRef, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from '../components/AppShell';
import { useAccessibility } from '../context/AccessibilityContext';
import { Search, Send, ShieldAlert, Clock, Info, UserCircle } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';

interface Contact {
  id: string;
  full_name: string;
  avatar: string | null;
  profile_image: string | null;
  job_title: string | null;
  working_hours_start: string;
  working_hours_end: string;
  timezone: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function InboxPage() {
  const { currentUser } = useContext(AuthContext);
  const { highContrast } = useAccessibility();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [interceptionAlert, setInterceptionAlert] = useState<string | null>(null);

  const [adminConfigs, setAdminConfigs] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set());

  // Fetch contacts and admin configs
  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      const { data: contactsData } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('id', currentUser.id)
        .not('role', 'in', '(admin,it)')
        .order('full_name');
      if (contactsData) setContacts(contactsData);

      const { data: adminData } = await supabase
        .from('admin_configs')
        .select('*')
        .single();
      if (adminData) setAdminConfigs(adminData);
    };
    fetchData();
  }, [currentUser]);

  // Fetch messages for selected contact
  useEffect(() => {
    if (!currentUser || !selectedContact) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase.channel('direct_messages_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${currentUser.id}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id === selectedContact.id) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isOffDuty = (contact: Contact) => {
    try {
      const options = { timeZone: contact.timezone, hour: '2-digit' as const, minute: '2-digit' as const, hour12: false, weekday: 'short' as const };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(new Date());

      let currentHour = 0, currentMinute = 0, currentWeekday = '';
      parts.forEach(p => {
        if (p.type === 'hour') currentHour = parseInt(p.value, 10);
        if (p.type === 'minute') currentMinute = parseInt(p.value, 10);
        if (p.type === 'weekday') currentWeekday = p.value;
      });

      if (currentWeekday === 'Sat' || currentWeekday === 'Sun') return true;

      let startStr = contact.working_hours_start;
      let endStr = contact.working_hours_end;

      // Fallback to org-wide system preferences if the employee is using the raw 09:00 - 17:00 defaults
      if (startStr.startsWith('09:00') && endStr.startsWith('17:00') && adminConfigs) {
        startStr = adminConfigs.standard_workday_start;
        endStr = adminConfigs.standard_workday_end;
      }

      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);

      const currentTotal = currentHour * 60 + currentMinute;
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      return currentTotal < startTotal || currentTotal > endTotal;
    } catch (e) {
      console.error("Timezone parsing error", e);
      return false; // Fail open
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedContact || !currentUser) return;

    setIsSending(true);
    setInterceptionAlert(null);

    const content = messageInput.trim();
    setMessageInput('');

    // RIGHT TO DISCONNECT INTERCEPTOR
    if (isOffDuty(selectedContact)) {
      // Calculate next 9 AM for recipient (simplified for mock purposes to next day 9AM UTC)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const payload = {
        subject: `Direct Message from ${currentUser.full_name}`,
        content: content,
        recipientName: selectedContact.full_name
      };

      const { error } = await supabase.from('outbox_messages').insert({
        sender_id: currentUser.id,
        recipient_id: selectedContact.id,
        deliver_after: tomorrow.toISOString(),
        payload: payload,
        status: 'queued'
      });

      if (error) {
        console.error("Outbox insert error:", error);
      }

      setInterceptionAlert(`Message intercepted! ${selectedContact.full_name.split(' ')[0]} is currently off-duty. Your message has been sent to the Right-to-Disconnect Outbox and will be delivered during their next working shift.`);
      setIsSending(false);
      return;
    }

    // NORMAL SEND
    const newMsg = {
      sender_id: currentUser.id,
      receiver_id: selectedContact.id,
      content: content,
    };

    const { data, error } = await supabase.from('direct_messages').insert(newMsg).select().single();
    if (error) {
      console.error("Direct message insert error:", error);
    }
    if (data) {
      setMessages(prev => [...prev, data]);

      // CREATE NOTIFICATION FOR THE RECEIVER
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: selectedContact.id,
        title: `New Message from ${currentUser.full_name}`,
        message: content.length > 40 ? content.substring(0, 40) + '...' : content,
        type: 'direct_message',
        read: false
      });

      if (notifError) {
        console.error("Notification insert error:", notifError);
      }
    }
    setIsSending(false);
  };

  const filteredContacts = contacts.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={`h-[calc(100vh-120px)] flex gap-6 animate-fade-in ${highContrast ? 'text-black' : ''}`}>

      {/* Sidebar: Contacts List */}
      <Card className={`w-80 flex flex-col glass-card bg-transparent border-transparent shadow-none rounded-2xl overflow-hidden shrink-0 hidden md:flex`}>
        <div className="p-4 border-b border-border-color">
          <h2 className="text-lg font-bold mb-4">Direct Messages</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search colleagues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredContacts.map(contact => (
            <Button
              key={contact.id}
              variant="ghost"
              onClick={() => { setSelectedContact(contact); setInterceptionAlert(null); }}
              className={`w-full h-auto justify-start gap-3 p-3 rounded-xl ${selectedContact?.id === contact.id ? 'bg-teal-50 hover:bg-teal-50 border-teal-100 border' : 'border border-transparent hover:bg-neutral-50'}`}
            >
              <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                {(contact.avatar || contact.profile_image) && !avatarErrors.has(contact.id) ? (
                  <Image
                    src={(contact.avatar || contact.profile_image)!}
                    alt={contact.full_name}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                    onError={() => setAvatarErrors(prev => new Set(prev).add(contact.id))}
                  />
                ) : (
                  <UserCircle className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm truncate">{contact.full_name}</p>
                <p className="text-[11px] text-neutral-500 truncate">{contact.job_title || 'Colleague'}</p>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className={`flex-1 flex flex-col glass-card bg-transparent border-transparent shadow-none rounded-2xl overflow-hidden`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border-color flex items-center justify-between bg-white/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {(selectedContact.avatar || selectedContact.profile_image) && !avatarErrors.has(selectedContact.id) ? (
                    <Image
                      src={(selectedContact.avatar || selectedContact.profile_image)!}
                      alt={selectedContact.full_name}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                      onError={() => setAvatarErrors(prev => new Set(prev).add(selectedContact.id))}
                    />
                  ) : (
                    <UserCircle className="w-6 h-6 text-neutral-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold">{selectedContact.full_name}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                    <span>{selectedContact.timezone}</span>
                    <span>•</span>
                    <span>Working Hours: {selectedContact.working_hours_start.slice(0,5)} - {selectedContact.working_hours_end.slice(0,5)}</span>
                  </div>
                </div>
              </div>

              {isOffDuty(selectedContact) && (
                <div className="px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-lg flex items-center gap-2 text-xs font-bold text-orange-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Off-Duty</span>
                </div>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-600">No messages yet</p>
                    <p className="text-xs max-w-xs mt-1">Start a conversation with {selectedContact.full_name.split(' ')[0]}. Healthy boundary rules apply.</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 px-4 rounded-2xl text-sm ${isMine ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-white border shadow-sm rounded-bl-sm text-neutral-800'}`}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <span className={`text-[9px] mt-1.5 block font-medium ${isMine ? 'text-teal-100' : 'text-neutral-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Interception Alert */}
            {interceptionAlert && (
              <div className="mx-6 mb-2 p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 animate-slide-up">
                <ShieldAlert className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-teal-800">Right-to-Disconnect Active</h4>
                  <p className="text-[11px] text-teal-700 mt-0.5 leading-snug">{interceptionAlert}</p>
                </div>
              </div>
            )}

            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-border-color">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!messageInput.trim() || isSending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400">
            <UserCircle className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-semibold text-neutral-600">Select a conversation</p>
            <p className="text-xs mt-1">Choose a colleague from the sidebar to start messaging.</p>
          </div>
        )}
      </Card>

    </div>
  );
}
