'use client';

import React, { useState, useEffect, useRef} from'react';
import { Send, ShieldCheck, User, Compass, Plus, Search, ChevronLeft} from'lucide-react';
import { supabase} from'../lib/supabaseClient';
import { Database} from'../lib/database.types';
import { useAccessibility} from'../context/AccessibilityContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

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
 const { highContrast} = useAccessibility();
 const [messages, setMessages] = useState<UIMessage[]>([]);

 const [currentUser, setCurrentUser] = useState<any>(null);

 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const [activeCircleId, setActiveCircleId] = useState('stress');
 const [inputText, setInputText] = useState('');
 const [isAnonymous, setIsAnonymous] = useState(true);
 const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [newCircleName, setNewCircleName] = useState('');
 const [newCircleDesc, setNewCircleDesc] = useState('');
 const [newCircleEmoji, setNewCircleEmoji] = useState('💬');
 const [searchQuery, setSearchQuery] = useState('');
 const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

 const chatBottomRef = useRef<HTMLDivElement>(null);

 const [activeCircles, setActiveCircles] = useState<Circle[]>([
 { id:'stress', name:'Stress Reduction', desc:'Sharing meditation, boundaries, & screen breaks', emoji:'🧘', members: 42},
 { id:'working-moms', name:'Working Moms of Engineering', desc:'Balancing school runs, code reviews, and sprints', emoji:'👩‍💻', members: 29},
 { id:'marathon', name:'Marathon Trainers', desc:'Pre-work running groups, nutrition, and injury prevention', emoji:'🏃‍♂️', members: 18},
 ]);

 const [discoverableCircles, setDiscoverableCircles] = useState<Circle[]>([
 { id:'corporate', name:'Corporate Announcements', desc:'Official company-wide health and wellness directives', emoji:'🏢', members: 1042},
 { id:'sleep', name:'Sleep & Recovery', desc:'Circadian rhythms, off-screen sleep prep, and fatigue tracking', emoji:'💤', members: 35},
 { id:'inclusivity', name:'Workplace Inclusivity', desc:'Safe sharing for LGBTQ+, underrepresented groups, and allies', emoji:'🌈', members: 22},
 ]);

 useEffect(() => {
 let channel: any;

 const initFetch = async () => {
 setIsLoading(true);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (user) setCurrentUser(user);

 await fetchMessages(user?.id);

 channel = supabase
 .channel(`support-circles-${Date.now()}`)
 .on('postgres_changes', { event:'*', schema:'public', table:'support_circle_messages'}, () => {
 fetchMessages(user?.id);
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

 async function fetchMessages(currentUserId: string | undefined) {
 // Fetch profiles fresh so we always have the latest names
 const { data: profileData} = await supabase.from('user_profiles').select('id, full_name');
 const profileMap: Record<string, string> = {};
 if (profileData) {
 profileData.forEach(p => {
 profileMap[p.id] = p.full_name;
});
}

 const { data, error: fetchErr} = await supabase
 .from('support_circle_messages')
 .select('*')
 .order('created_at', { ascending: true});

 if (fetchErr) throw fetchErr;

 const mapped = (data || []).map(m => {
 const rawAlias = m.pseudonym_alias;
 const isActuallyRealName = rawAlias && rawAlias.startsWith('REALNAME:');
 const isAnon = rawAlias && !isActuallyRealName;

 let displayAuthor ='Unknown User';
 if (isAnon) {
 displayAuthor = rawAlias;
} else if (isActuallyRealName) {
 displayAuthor = rawAlias.replace('REALNAME:','');
} else {
 displayAuthor = profileMap[m.user_id] ||'Unknown User';
}

 return {
 ...m,
 isAnonymous: !!isAnon,
 displayAuthor,
 isCurrentUser: m.user_id === currentUserId
};
});

 setMessages(mapped);
};

 const handleJoinCircle = (circle: Circle) => {
 setActiveCircles([...activeCircles, circle]);
 setDiscoverableCircles(discoverableCircles.filter(c => c.id !== circle.id));
 setActiveCircleId(circle.id);
 setMobileView('chat');
 };

 const filteredDiscoverable = discoverableCircles.filter(circle =>
 circle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 circle.desc.toLowerCase().includes(searchQuery.toLowerCase())
 );

 useEffect(() => {
 // Scroll chat window to bottom on circle switch or new message
 chatBottomRef.current?.scrollIntoView({ behavior:'smooth'});
}, [activeCircleId, messages]);

 const generatePseudonym = () => {
 const adjs = ['Quiet','Brave','Gentle','Thoughtful','Resilient'];
 const nouns = ['Panda','Oak','River','Sparrow','Echo'];
 return `${adjs[Math.floor(Math.random() * adjs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
};

 const handleSendMessage = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!inputText.trim() || !currentUser) return;

 // Fetch the current user's profile to get their real name just in case
 const { data: profileData} = await supabase.from('user_profiles').select('full_name').eq('id', currentUser.id).single();
 const realName = profileData?.full_name ||'Unknown User';

 try {
 await supabase.from('support_circle_messages').insert({
 user_id: currentUser.id,
 topic_channel: activeCircleId,
 message: inputText.trim(),
 pseudonym_alias: isAnonymous ? generatePseudonym() : `REALNAME:${realName}`
});
 setInputText('');
 await fetchMessages(currentUser.id);
} catch (err) {
 console.error(err);
 alert('Failed to send message.');
}
};

 const activeCircle = activeCircles.find(c => c.id === activeCircleId) || activeCircles[0];
 const activeCircleMessages = messages.filter(m => m.topic_channel === activeCircleId);

 return (
 <>
 <Card className={`grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] lg:h-[550px] glass-card bg-transparent border-transparent shadow-none rounded-2xl overflow-hidden ${highContrast ? 'text-black' : ''}`}>
 {/* Channels Sidebar List */}
 <div className={`p-4 border-r overflow-y-auto space-y-3.5 flex-col ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'} ${highContrast ?'border-black' :'border-border-color bg-neutral-50/20'
}`}>
 <div className="space-y-4">
 {/* Action Buttons */}
 <div className="space-y-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsDiscoverModalOpen(true)}
 className={`w-full gap-1.5 ${highContrast
 ?'border-black hover:bg-neutral-100 text-black glass-card'
 :'border-dashed border-teal-300 hover:border-teal-500 text-teal-700 bg-teal-50/20 hover:bg-teal-50'
}`}
 >
 <Compass className="h-4.5 w-4.5" />
 <span>Discover More Circles</span>
 </Button>

 <Button
 type="button"
 onClick={() => setIsCreateModalOpen(true)}
 className="w-full gap-1.5"
 >
 <Plus className="h-4.5 w-4.5" />
 <span>Create New Circle</span>
 </Button>
 </div>

 <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
 Available Circles
 </span>
 <div className="space-y-1.5" role="listbox" aria-label="Support circles list">
 {activeCircles.map((circle) => {
 const isActive = activeCircleId === circle.id;

 let circleStyle ='';
 if (isActive) {
 circleStyle = highContrast
 ?'bg-black hover:bg-black text-white border-2 border-black font-bold'
 :'bg-teal-50 hover:bg-teal-50 border-teal-200 text-teal-900 border font-semibold';
} else {
 circleStyle ='glass-card hover:bg-neutral-50 text-neutral-600 border-neutral-100/70';
}

 return (
 <Button
 key={circle.id}
 variant="ghost"
 onClick={() => { setActiveCircleId(circle.id); setMobileView('chat'); }}
 role="option"
 aria-selected={isActive}
 className={`w-full h-auto justify-start text-left p-3.5 gap-3 rounded-xl border ${circleStyle}`}
 >
 <span className="text-2xl shrink-0 select-none">{circle.emoji}</span>
 <div>
 <span className="block text-xs font-bold leading-none">{circle.name}</span>
 <span className="block text-[10px] text-neutral-400 mt-1 leading-normal line-clamp-2">
 {circle.desc}
 </span>
 </div>
 </Button>
 );
})}
 </div>
 </div>

 {/* Info Box */}
 <div className={`p-3 rounded-lg bg-neutral-50 border text-[10px] text-neutral-400 leading-normal flex items-start gap-1.5 ${highContrast ?'border-black text-black font-semibold' :'border-neutral-100'
}`}>
 <ShieldCheck className="h-4.5 w-4.5 text-teal-600 shrink-0 mt-0.5" />
 <p>
 Circles are completely managed in-browser. Pseudonymous tags prevent linking posts to your enterprise directory identity.
 </p>
 </div>
 </div>

 {/* Main Circle Chat Channel Area */}
 <div className={`lg:col-span-2 flex-col justify-between h-full glass-card relative min-h-0 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
 {/* Chat Header */}
 <div className={`p-4 border-b flex items-center justify-between shrink-0 ${highContrast ?'border-black' :'border-border-color'
}`}>
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setMobileView('list')}
 className="lg:hidden mr-1 size-7 text-neutral-500 hover:text-neutral-700 bg-neutral-100 rounded-full"
 aria-label="Back to circles"
 >
 <ChevronLeft className="h-5 w-5" />
 </Button>
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
 <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'0ms'}} />
 <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'150ms'}} />
 <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'300ms'}} />
 </div>
 </div>
 ) : error ? (
 <div className="py-20 text-center text-red-500 text-xs">{error}</div>
 ) : activeCircleMessages.length === 0 ? (
 <Card className="py-16 px-6 text-center glass-card bg-transparent border-transparent shadow-none rounded-2xl">
 <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4 border border-teal-100">
 <span className="text-2xl select-none">{activeCircle.emoji}</span>
 </div>
 <p className="text-xs font-bold text-neutral-700">This space is waiting for your voice.</p>
 <p className="text-[11px] text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
 Share your thoughts, challenges, or wins. Your perspective might be exactly what someone else in the <span className="font-semibold text-neutral-600">{activeCircle.name}</span> circle needs to hear today.
 </p>
 </Card>
 ) : (
 activeCircleMessages.map((msg) => (
 <div
 key={msg.id}
 className={`flex gap-3 text-xs max-w-[85%] ${msg.isCurrentUser ?'ml-auto flex-row-reverse' :''
}`}
 >
 {/* Author Avatar */}
 <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${msg.isAnonymous
 ?'bg-neutral-100 text-neutral-500 border-border-color'
 :'bg-teal-50 text-teal-700 border-teal-200'
}`}>
 {msg.isAnonymous ? <ShieldCheck className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
 </div>

 {/* Message Bubble */}
 <div className="space-y-1">
 <div className={`flex items-center gap-1.5 ${msg.isCurrentUser ?'justify-end' :''
}`}>
 <span className="font-bold text-neutral-700 text-[10px]">{msg.displayAuthor}</span>
 {msg.isAnonymous && (
 <span className="px-1 bg-neutral-200 text-neutral-600 rounded-[3px] text-[8px] font-extrabold uppercase">
 Shielded
 </span>
 )}
 </div>
 <div className={`p-3 rounded-2xl border text-neutral-600 leading-normal ${msg.isCurrentUser
 ? (highContrast ?'bg-black text-white border-black rounded-tr-none' :'bg-teal-50 text-teal-900 border-teal-100 rounded-tr-none')
 : (highContrast ?'glass-card text-black border-black rounded-tl-none' :'glass-card border-neutral-100 rounded-tl-none')
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
 className={`p-4 border-t space-y-3 shrink-0 ${highContrast ?'border-black' :'border-border-color glass-card'
}`}
 >
 {/* Identity Privacy controls */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <label htmlFor="anon-post-toggle" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
 Post anonymously:
 </label>
 <Switch
 id="anon-post-toggle"
 checked={isAnonymous}
 onCheckedChange={setIsAnonymous}
 />
 </div>

 <span className="text-[9px] text-neutral-400 leading-tight">
 {isAnonymous ?"Your identity is hidden behind a protective firewall" :"Your name will be visible to members"}
 </span>
 </div>

 {/* Typing Area */}
 <div className="flex gap-2">
 <Input
 type="text"
 placeholder={`Send message to #${activeCircle.name.toLowerCase()}...`}
 value={inputText}
 onChange={(e) => setInputText(e.target.value)}
 className="flex-1 text-xs font-semibold"
 />
 <Button
 type="submit"
 size="icon"
 aria-label="Send message"
 >
 <Send className="h-4.5 w-4.5" />
 </Button>
 </div>
 </form>
 </div>
 </Card>

 {/* Discover Support Circles Modal */}
 <Dialog open={isDiscoverModalOpen} onOpenChange={(open) => { setIsDiscoverModalOpen(open); if (!open) setSearchQuery(''); }}>
 <DialogContent className={`sm:max-w-2xl ${highContrast ? 'text-black' : ''}`}>
 <DialogHeader>
 <div className="flex items-center gap-2">
 <Compass className="h-5 w-5 text-teal-600" />
 <DialogTitle className="text-sm text-neutral-800">
 Discover Support Circles
 </DialogTitle>
 </div>
 </DialogHeader>

 <p className="text-xs text-neutral-500 leading-normal">
 Explore other private, pseudonymous support communities within WBG. Joining adds the circle to your sidebar and connects you with peer resources.
 </p>

 {/* Search Input Bar */}
 <div className="relative">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 z-10" />
 <Input
 type="text"
 placeholder="Search support circles by name, description, or keyword..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-10 text-xs font-semibold"
 />
 </div>

 {/* Discoverable Grid */}
 <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
 {filteredDiscoverable.length === 0 ? (
 <div className="py-12 text-center text-xs text-neutral-400 font-semibold space-y-1.5">
 <span className="text-2xl block">🔍</span>
 <p>
 {discoverableCircles.length === 0
 ?"You have joined all available support circles!"
 :"No support circles match your search query."}
 </p>
 </div>
 ) : (
 filteredDiscoverable.map((circle) => (
 <div
 key={circle.id}
 className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition hover:bg-neutral-50/40 ${highContrast ?'border-black glass-card' :'border-neutral-100 bg-neutral-50/20'
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

 <Button
 size="sm"
 onClick={() => handleJoinCircle(circle)}
 className="gap-1 shrink-0"
 >
 <Plus className="h-3.5 w-3.5" />
 <span>Join Circle</span>
 </Button>
 </div>
 ))
 )}
 </div>

 <DialogFooter>
 <Button
 variant="secondary"
 size="sm"
 onClick={() => {
 setIsDiscoverModalOpen(false);
 setSearchQuery('');
}}
 >
 Done
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Create Circle Modal */}
 <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
 <DialogContent className={`sm:max-w-md ${highContrast ? 'text-black' : ''}`}>
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-neutral-800">
 <Plus className="w-5 h-5 text-teal-600" />
 Create Employee Circle
 </DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-bold text-neutral-600 mb-1.5">Circle Name</label>
 <Input
 type="text"
 value={newCircleName}
 onChange={e => setNewCircleName(e.target.value)}
 placeholder="e.g. Remote Developers"
 className="text-sm font-semibold"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-neutral-600 mb-1.5">Description</label>
 <Input
 type="text"
 value={newCircleDesc}
 onChange={e => setNewCircleDesc(e.target.value)}
 placeholder="What is this circle about?"
 className="text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-neutral-600 mb-1.5">Emoji</label>
 <div className="flex gap-4 items-start">
 <Input
 type="text"
 value={newCircleEmoji}
 onChange={e => setNewCircleEmoji(e.target.value)}
 maxLength={2}
 className="w-16 text-center text-xl shrink-0"
 />
 <div className="flex flex-wrap gap-1.5 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
 {['💬','🧘','👩‍💻','🏃‍♂️','🏢','💤','🌈','🥑','🧠','🍼','☕','🌟','💡','🎉','🤝','🔥','❤️','🪴'].map((emoji) => (
 <button
 key={emoji}
 onClick={() => setNewCircleEmoji(emoji)}
 className={`w-7 h-7 flex items-center justify-center rounded text-base transition-all ${
 newCircleEmoji === emoji
 ?'glass-card shadow-sm scale-110 border border-border-color'
 :'hover:bg-neutral-200/50 hover:scale-110 border border-transparent'
}`}
 type="button"
 aria-label={`Select ${emoji} emoji`}
 >
 {emoji}
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>
 <DialogFooter>
 <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
 Cancel
 </Button>
 <Button
 onClick={() => {
 if (!newCircleName.trim()) return;
 const newId = newCircleName.toLowerCase().replace(/\s+/g,'-');
 setActiveCircles([...activeCircles, {
 id: newId,
 name: newCircleName,
 desc: newCircleDesc ||'Employee driven circle',
 emoji: newCircleEmoji ||'💬',
 members: 1
}]);
 setActiveCircleId(newId);
 setIsCreateModalOpen(false);
 setNewCircleName('');
 setNewCircleDesc('');
}}
 >
 Create Circle
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>
 );
}
