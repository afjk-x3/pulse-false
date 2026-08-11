'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, ShieldCheck, User, Compass, Plus, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../lib/database.types';
import { useAccessibility } from '../context/AccessibilityContext';

type SupportCircleMessage = Database['public']['Tables']['support_circle_messages']['Row'];

interface Circle {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  members: number;
}

// Extended message for UI
interface UIMessage extends SupportCircleMessage {
  displayAuthor: string;
  isAnonymous: boolean;
  isCurrentUser: boolean;
}

export default function SupportCircles() {
  const { highContrast } = useAccessibility();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCircleId, setActiveCircleId] = useState('stress');
  const [inputText, setInputText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [activeCircles, setActiveCircles] = useState<Circle[]>([
    { id: 'stress', name: 'Stress Reduction', desc: 'Sharing meditation, boundaries, & screen breaks', emoji: '🧘', members: 42 },
    { id: 'parenting', name: 'Parental Support', desc: 'Balancing school runs, family obligations, and sprints', emoji: '🍼', members: 29 },
    { id: 'neurodiversity', name: 'Neurodiversity Hub', desc: 'Safe sharing for ADHD, dyslexia, sensory needs, etc.', emoji: '🧠', members: 18 },
  ]);

  const [discoverableCircles, setDiscoverableCircles] = useState<Circle[]>([
    { id: 'sleep', name: 'Sleep & Recovery', desc: 'Circadian rhythms, off-screen sleep prep, and fatigue tracking', emoji: '💤', members: 35 },
    { id: 'inclusivity', name: 'Workplace Inclusivity', desc: 'Safe sharing for LGBTQ+, underrepresented groups, and allies', emoji: '🌈', members: 22 },
    { id: 'fitness', name: 'Physical Fitness', desc: 'Posture stretch prompts, home workouts, and walking syncs', emoji: '🏃‍♀️', members: 51 },
    { id: 'mindful-eating', name: 'Mindful Eating', desc: 'Balanced meal preps, hydration reminders, and screen-free lunch tips', emoji: '🥑', members: 14 },
  ]);

  useEffect(() => {
    let channel: any;

    const initFetch = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);

        // Fetch all profiles for non-anonymous name mapping
        const { data: profileData } = await supabase.from('user_profiles').select('id, full_name');
        const profileMap: Record<string, string> = {};
        if (profileData) {
          profileData.forEach(p => {
            profileMap[p.id] = p.full_name;
          });
        }
        setProfiles(profileMap);

        await fetchMessages(profileMap, user?.id);

        channel = supabase
          .channel(`support-circles-${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'support_circle_messages' }, () => {
            fetchMessages(profileMap, user?.id);
          })
          .subscribe();
      } catch (err) {
        console.error(err);
        setError('Failed to load support circles messages.');
      } finally {
        setIsLoading(false);
      }
    };

    initFetch();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async (profileMap: Record<string, string>, currentUserId: string | undefined) => {
    const { data, error: fetchErr } = await supabase
      .from('support_circle_messages')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (fetchErr) throw fetchErr;

    const mapped = (data || []).map(m => {
      const isAnon = !!m.pseudonym_alias;
      return {
        ...m,
        isAnonymous: isAnon,
        displayAuthor: isAnon ? m.pseudonym_alias! : (profileMap[m.user_id] || 'Unknown User'),
        isCurrentUser: m.user_id === currentUserId
      };
    });

    setMessages(mapped);
  };

  const handleJoinCircle = (circle: Circle) => {
    setActiveCircles([...activeCircles, circle]);
    setDiscoverableCircles(discoverableCircles.filter(c => c.id !== circle.id));
    setActiveCircleId(circle.id);
  };

  const filteredDiscoverable = discoverableCircles.filter(circle => 
    circle.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    circle.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    // Scroll chat window to bottom on circle switch or new message
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCircleId, messages]);

  const generatePseudonym = () => {
    const adjs = ['Quiet', 'Brave', 'Gentle', 'Thoughtful', 'Resilient'];
    const nouns = ['Panda', 'Oak', 'River', 'Sparrow', 'Echo'];
    return `${adjs[Math.floor(Math.random() * adjs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    try {
      await supabase.from('support_circle_messages').insert({
        user_id: currentUser.id,
        topic_channel: activeCircleId,
        message: inputText.trim(),
        pseudonym_alias: isAnonymous ? generatePseudonym() : null
      });
      setInputText('');
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
    }
  };

  const activeCircle = activeCircles.find(c => c.id === activeCircleId) || activeCircles[0];
  const activeCircleMessages = messages.filter(m => m.topic_channel === activeCircleId);

  return (
    <>
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 h-[550px] bg-white rounded-2xl border overflow-hidden ${
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}>
      {/* Channels Sidebar List */}
      <div className={`p-4 border-r overflow-y-auto space-y-3.5 flex flex-col justify-between ${
        highContrast ? 'border-black' : 'border-[#f1f0ea] bg-neutral-50/20'
      }`}>
        <div className="space-y-3">
          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Available Circles
          </span>
          <div className="space-y-1.5" role="listbox" aria-label="Support circles list">
            {activeCircles.map((circle) => {
              const isActive = activeCircleId === circle.id;
              
              let circleStyle = '';
              if (isActive) {
                circleStyle = highContrast
                  ? 'bg-black text-white border-2 border-black font-bold'
                  : 'bg-teal-50 border-teal-200 text-teal-900 border font-semibold';
              } else {
                circleStyle = 'bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-100/70';
              }

              return (
                <button
                  key={circle.id}
                  onClick={() => setActiveCircleId(circle.id)}
                  role="option"
                  aria-selected={isActive}
                  className={`w-full text-left p-3.5 rounded-xl transition flex gap-3 focus:outline-none focus:ring-2 focus:ring-teal-500 ${circleStyle}`}
                >
                  <span className="text-2xl shrink-0 select-none">{circle.emoji}</span>
                  <div>
                    <span className="block text-xs font-bold leading-none">{circle.name}</span>
                    <span className="block text-[10px] text-neutral-400 mt-1 leading-normal line-clamp-2">
                      {circle.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Discover More Circles Button */}
          <button
            type="button"
            onClick={() => setIsDiscoverModalOpen(true)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 mt-3.5 ${
              highContrast
                ? 'border-black hover:bg-neutral-100 text-black bg-white'
                : 'border-dashed border-teal-300 hover:border-teal-500 text-teal-700 bg-teal-50/20 hover:bg-teal-50'
            }`}
          >
            <Compass className="h-4.5 w-4.5" />
            <span>Discover More Circles</span>
          </button>
        </div>

        {/* Info Box */}
        <div className={`p-3 rounded-lg bg-neutral-50 border text-[10px] text-neutral-400 leading-normal flex items-start gap-1.5 ${
          highContrast ? 'border-black text-black font-semibold' : 'border-neutral-100'
        }`}>
          <ShieldCheck className="h-4.5 w-4.5 text-teal-600 shrink-0 mt-0.5" />
          <p>
            Circles are completely managed in-browser. Pseudonymous tags prevent linking posts to your enterprise directory identity.
          </p>
        </div>
      </div>

      {/* Main Circle Chat Channel Area */}
      <div className="lg:col-span-2 flex flex-col justify-between h-full bg-white relative">
        {/* Chat Header */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          highContrast ? 'border-black' : 'border-[#f1f0ea]'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl select-none">{activeCircle.emoji}</span>
            <div>
              <h2 className="text-xs font-bold text-neutral-800 leading-none">{activeCircle.name} Channel</h2>
              <span className="text-[10px] text-neutral-400 mt-1 block">Active members: {activeCircle.members}</span>
            </div>
          </div>
          <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            <span>End-to-End Private</span>
          </span>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-0 bg-neutral-50/20">
          {isLoading ? (
            <div className="py-20 flex items-center justify-center">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 text-xs">{error}</div>
          ) : activeCircleMessages.length === 0 ? (
            <div className={`py-16 px-6 text-center bg-white rounded-2xl border ${
              highContrast ? 'border-black' : 'border-[#f1f0ea]'
            }`}>
              <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4 border border-teal-100">
                <span className="text-2xl select-none">{activeCircle.emoji}</span>
              </div>
              <p className="text-xs font-bold text-neutral-700">This space is waiting for your voice.</p>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Share your thoughts, challenges, or wins. Your perspective might be exactly what someone else in the <span className="font-semibold text-neutral-600">{activeCircle.name}</span> circle needs to hear today.
              </p>
            </div>
          ) : (
            activeCircleMessages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-3 text-xs max-w-[85%] ${
                  msg.isCurrentUser ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Author Avatar */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${
                  msg.isAnonymous 
                    ? 'bg-neutral-100 text-neutral-500 border-neutral-200' 
                    : 'bg-teal-50 text-teal-700 border-teal-200'
                }`}>
                  {msg.isAnonymous ? <ShieldCheck className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1">
                  <div className={`flex items-center gap-1.5 ${
                    msg.isCurrentUser ? 'justify-end' : ''
                  }`}>
                    <span className="font-bold text-neutral-700 text-[10px]">{msg.displayAuthor}</span>
                    {msg.isAnonymous && (
                      <span className="px-1 bg-neutral-200 text-neutral-600 rounded-[3px] text-[8px] font-extrabold uppercase">
                        Shielded
                      </span>
                    )}
                  </div>
                  <div className={`p-3 rounded-2xl border text-neutral-600 leading-normal ${
                    msg.isCurrentUser
                      ? (highContrast ? 'bg-black text-white border-black rounded-tr-none' : 'bg-teal-50 text-teal-900 border-teal-100 rounded-tr-none')
                      : (highContrast ? 'bg-white text-black border-black rounded-tl-none' : 'bg-white border-neutral-100 rounded-tl-none')
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))
          )}
          {/* Scroll target marker */}
          <div ref={chatBottomRef} />
        </div>

        {/* Message Inputs Form */}
        <form 
          onSubmit={handleSendMessage} 
          className={`p-4 border-t space-y-3 shrink-0 ${
            highContrast ? 'border-black' : 'border-[#f1f0ea] bg-white'
          }`}
        >
          {/* Identity Privacy controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="anon-post-toggle" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Post anonymously:
              </label>
              <button
                type="button"
                id="anon-post-toggle"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isAnonymous ? 'bg-teal-600' : 'bg-neutral-200'
                }`}
                aria-checked={isAnonymous}
                role="switch"
              >
                <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isAnonymous ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
            
            <span className="text-[9px] text-neutral-400">
              {isAnonymous ? "Your identity is hidden behind a protective firewall" : "Your name will be visible to members"}
            </span>
          </div>

          {/* Typing Area */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Send message to #${activeCircle.name.toLowerCase()}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className={`flex-1 p-2.5 rounded-xl border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                highContrast ? 'border-black' : 'border-neutral-200'
              }`}
            />
            <button
              type="submit"
              className={`p-2.5 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                highContrast
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
              }`}
              aria-label="Send message"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>
      </div>
    </div>

      {/* Discover Support Circles Modal Overlay */}
      {isDiscoverModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discover-modal-title"
          aria-describedby="discover-modal-desc"
        >
          <div className={`w-full max-w-2xl p-6 bg-white rounded-2xl border shadow-2xl space-y-4.5 animate-scale-up ${
            highContrast ? 'border-black text-black' : 'border-neutral-100'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-teal-600" />
                <h3 id="discover-modal-title" className="text-sm font-bold text-neutral-800">
                  Discover Support Circles
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsDiscoverModalOpen(false);
                  setSearchQuery('');
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-100 focus:ring-2 focus:ring-teal-500 transition"
                aria-label="Close discovery modal"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Description */}
            <p id="discover-modal-desc" className="text-xs text-neutral-500 leading-normal">
              Explore other private, pseudonymous support communities within WBG. Joining adds the circle to your sidebar and connects you with peer resources.
            </p>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search support circles by name, description, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                  highContrast ? 'border-black text-black' : 'border-neutral-250'
                }`}
              />
            </div>

            {/* Discoverable Grid */}
            <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
              {filteredDiscoverable.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400 font-semibold space-y-1.5">
                  <span className="text-2xl block">🔍</span>
                  <p>
                    {discoverableCircles.length === 0 
                      ? "You have joined all available support circles!"
                      : "No support circles match your search query."}
                  </p>
                </div>
              ) : (
                filteredDiscoverable.map((circle) => (
                  <div 
                    key={circle.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition hover:bg-neutral-50/40 ${
                      highContrast ? 'border-black bg-white' : 'border-neutral-100 bg-neutral-50/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl select-none shrink-0">{circle.emoji}</span>
                      <div className="space-y-0.5">
                        <span className="block text-xs font-bold text-neutral-800">{circle.name}</span>
                        <span className="block text-[10px] text-neutral-500 leading-normal">{circle.desc}</span>
                        <span className="block text-[9px] font-bold text-teal-600 mt-1 uppercase tracking-wide">
                          {circle.members} active members
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinCircle(circle)}
                      className={`px-3.5 py-2 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0 ${
                        highContrast
                          ? 'bg-black text-white hover:bg-neutral-800'
                          : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Join Circle</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end border-t pt-3.5 border-neutral-100">
              <button
                onClick={() => {
                  setIsDiscoverModalOpen(false);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
