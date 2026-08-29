'use client';

import React, { useState, useEffect} from'react';
import { Award, Search, Heart, Plus, Send, ChevronsUpDown} from'lucide-react';
import { supabase} from'../lib/supabaseClient';
import { Database} from'../lib/database.types';
import { useAccessibility} from'../context/AccessibilityContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command';

type KudosPost = Database['public']['Tables']['kudos_posts']['Row'];


// Extended type for rendering
interface KudosWithProfiles extends KudosPost {
 sender_name: string;
 recipient_name: string;
}

const RESTRICTED_WORDS = [
'fuck','shit','bitch','asshole','dick','cunt','bastard',
'slut','whore','faggot','nigger','crap','piss'
];

function containsVulgarity(text: string) {
 if (!text) return false;
 const lowerText = text.toLowerCase();
 return RESTRICTED_WORDS.some(word => {
 const regex = new RegExp(`\\b${word}\\b`,'i');
 return regex.test(lowerText);
});
}

export default function KudosFeed() {
 const { highContrast} = useAccessibility();
 const [kudosList, setKudosList] = useState<KudosWithProfiles[]>([]);
 const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
 const [profiles, setProfiles] = useState<Record<string, { name: string, role: string}>>({});
 const [searchQuery, setSearchQuery] = useState('');
 const [activeFilter, setActiveFilter] = useState<string>('All');

 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // Composers state
 const [isComposerOpen, setIsComposerOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [recipient, setRecipient] = useState(''); // UUID or name fallback
 const [recipientSearch, setRecipientSearch] = useState('');
 const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
 const [category, setCategory] = useState<string>('Gratitude');
 const [customCategory, setCustomCategory] = useState('');
 const [message, setMessage] = useState('');
 const [senderName, setSenderName] = useState('');
 const [currentUser, setCurrentUser] = useState<any>(null);
 const [successNotification, setSuccessNotification] = useState(false);
 const [composerError, setComposerError] = useState<string | null>(null);

 useEffect(() => {
 let channel: any;

 const initFetch = async () => {
 setIsLoading(true);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (user) setCurrentUser(user);

 // Fetch all active profiles to map UUIDs to names and roles
 const { data: profileData} = await supabase.from('user_profiles').select('id, full_name, role');
 const profileMap: Record<string, { name: string, role: string}> = {};
 if (profileData) {
 profileData.forEach(p => {
 profileMap[p.id] = { name: p.full_name, role: p.role};
});
}
 setProfiles(profileMap);

 // Fetch kudos posts
 await fetchKudos(profileMap);

 channel = supabase
 .channel(`kudos-feed-${Date.now()}`)
 .on('postgres_changes', { event:'*', schema:'public', table:'kudos_posts'}, () => {
 fetchKudos(profileMap); // Re-fetch all to ensure profiles map correctly
})
 .subscribe();
} catch (err) {
 console.error(err);
 setError('Failed to load Kudos feed.');
} finally {
 setIsLoading(false);
}
};

 initFetch();

 return () => {
 if (channel) supabase.removeChannel(channel);
};
}, []);

 async function fetchKudos(profileMap: Record<string, { name: string, role: string}>) {
 const { data: kudosData, error: fetchErr} = await supabase
 .from('kudos_posts')
 .select('*')
 .order('created_at', { ascending: false});

 if (fetchErr) throw fetchErr;

 const mapped = (kudosData || []).map(k => {
 let displaySender = profileMap[k.sender_id]?.name ||'Unknown User';
 let actualMessage = k.message;

 if (k.message.startsWith('ANON:')) {
 const parts = k.message.split('|');
 const customName = parts[0].replace('ANON:','').trim();
 displaySender = customName !=='' ? customName :'Anonymous';
 actualMessage = parts.slice(1).join('|');
}

 return {
 ...k,
 sender_name: displaySender,
 recipient_name: profileMap[k.recipient_id]?.name ||'Unknown User',
 message: actualMessage
};
});

 setKudosList(mapped);
};

 const handleLike = async (id: string, currentLikes: number) => {
 if (likedPosts.has(id)) return;

 // Optimistic UI update
 setKudosList(prev => prev.map(k => k.id === id ? { ...k, likes_count: currentLikes + 1} : k));
 setLikedPosts(prev => {
 const newSet = new Set(prev);
 newSet.add(id);
 return newSet;
});

 await supabase.from('kudos_posts').update({ likes_count: currentLikes + 1}).eq('id', id);
};

 const handleSubmitKudos = async (e: React.FormEvent) => {
 e.preventDefault();
 setComposerError(null);
 if (!message.trim()) return;

 if (!recipient) {
 setComposerError("Please select a valid colleague from the dropdown.");
 return;
}

 if (containsVulgarity(message) || containsVulgarity(senderName) || containsVulgarity(customCategory)) {
 setComposerError("Your message contains restricted words. Please keep the Kudos professional and respectful.");
 return;
}

 const finalCategory = category ==='Other' ? (customCategory.trim() ||'Other') : category;
 const finalMessage = `ANON:${senderName.trim()}|${message.trim()}`;

 setIsSubmitting(true);
 try {
 await supabase.from('kudos_posts').insert({
 sender_id: currentUser?.id,
 recipient_id: recipient,
 message: finalMessage,
 category: finalCategory as any, // Cast to enum
 likes_count: 0
});

 setRecipient('');
 setRecipientSearch('');
 setMessage('');
 setSenderName('');
 setCustomCategory('');
 setCategory('Gratitude');
 setIsComposerOpen(false);
 setSuccessNotification(true);
 setTimeout(() => setSuccessNotification(false), 3000);

 // Explicitly fetch latest kudos
 await fetchKudos(profiles);
} catch (err) {
 console.error(err);
 setComposerError('Failed to send Kudos');
} finally {
 setIsSubmitting(false);
}
};

 const getCategoryColor = (cat: string) => {
 if (highContrast) return'border-black text-black font-bold';

 switch (cat) {
 case'Collaboration':
 return'bg-blue-50 text-blue-700 border-blue-100';
 case'Gratitude':
 return'bg-[#EAEFE9] text-[#2F4F2F] border-[#C3D2C1]';
 case'Inspiration':
 return'bg-purple-50 text-purple-700 border-purple-100';
 case'Impact':
 return'bg-[#F9ECE7] text-[#6A2B15] border-[#ECCBBF]';
 default:
 return'bg-amber-50 text-amber-800 border-amber-100';
}
};

 const filteredKudos = kudosList.filter((k) => {
 const matchesSearch = k.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 k.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 k.message.toLowerCase().includes(searchQuery.toLowerCase());

 const matchesFilter = activeFilter ==='All' || k.category === activeFilter;
 return matchesSearch && matchesFilter;
});

 const eligibleRecipients = Object.entries(profiles).filter(
 ([id, profile]) => id !== currentUser?.id && profile.role !=='admin'
 );

 return (
 <div className="space-y-6">
 {/* Search and Compose Header */}
 <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
 {/* Search Input */}
 <div className="relative w-full sm:max-w-md">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-400 z-10" />
 <Input
 type="text"
 placeholder="Search by name, sender, or keyword..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-10 text-xs font-semibold"
 />
 </div>

 {/* Compose trigger button */}
 <Button
 onClick={() => setIsComposerOpen(true)}
 className="w-full sm:w-auto gap-2"
 >
 <Plus className="h-4.5 w-4.5" />
 <span>Send Kudos Note</span>
 </Button>
 </div>

 {/* Category Filter Pills */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 px-1 -mx-1" role="group" aria-label="Filter kudos categories">
 {(() => {
 const filterCategories = ['All','Gratitude','Collaboration','Inspiration','Impact'];
 kudosList.forEach(k => {
 if (!filterCategories.includes(k.category)) {
 filterCategories.push(k.category);
}
});
 return filterCategories.map((filter) => (
 <Button
 key={filter}
 variant="outline"
 onClick={() => setActiveFilter(filter)}
 className={`h-auto rounded-full py-1.5 px-3.5 text-xs font-semibold shrink-0 ${
 activeFilter === filter
 ? (highContrast ?'bg-black hover:bg-black text-white border-black' :'bg-teal-50 hover:bg-teal-50 text-teal-800 border-teal-200 font-bold')
 :'glass-card hover:bg-neutral-50 text-neutral-500 border-neutral-100'
}`}
 >
 {filter}
 </Button>
 ));
})()}
 </div>

 {successNotification && (
 <div className="bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold p-3 rounded-xl mb-4 mt-2 flex items-center justify-center animate-fade-in transition-all">
 🎉 Kudos successfully sent!
 </div>
 )}

 {/* Kudos Grid */}
 {isLoading ? (
 <div className="p-12 flex justify-center">
 <div className="flex gap-1.5">
 <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'0ms'}} />
 <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'150ms'}} />
 <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay:'300ms'}} />
 </div>
 </div>
 ) : error ? (
 <div className="p-12 text-center text-xs text-red-500">{error}</div>
 ) : filteredKudos.length === 0 ? (
 <Card className="py-16 px-6 text-center glass-card bg-transparent border-transparent shadow-none rounded-2xl">
 <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 border border-amber-100">
 <Award className="h-6 w-6 text-amber-500" />
 </div>
 <p className="text-xs font-bold text-neutral-700">Let&apos;s spread some positivity!</p>
 <p className="text-[11px] text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
 Take a moment to recognize a teammate whose hard work made your day easier. Your appreciation means more than you think.
 </p>
 </Card>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filteredKudos.map((kudos) => (
 <Card
 key={kudos.id}
 className={`p-5 glass-card bg-transparent border-transparent shadow-none rounded-2xl flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
 highContrast ? 'text-black' : ''
}`}
 >
 <div className="space-y-3">
 {/* Header */}
 <div className="flex items-center justify-between gap-3">
 <div className="space-y-0.5">
 <span className="text-xs font-bold text-neutral-800">To: {kudos.recipient_name}</span>
 <span className="text-[10px] text-neutral-400 block">From: {kudos.sender_name}</span>
 </div>
 <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full border ${getCategoryColor(kudos.category)}`}>
 {kudos.category}
 </span>
 </div>

 {/* Content Message */}
 <p className="text-xs text-neutral-600 leading-relaxed italic">
 &ldquo;{kudos.message}&rdquo;
 </p>
 </div>

 {/* Action bar */}
 <div className="flex items-center justify-between border-t pt-3.5 mt-4 border-neutral-100 text-[10px] text-neutral-400 font-medium">
 <span>{new Date(kudos.created_at).toLocaleDateString()}</span>
 <button
 onClick={() => handleLike(kudos.id, kudos.likes_count)}
 disabled={likedPosts.has(kudos.id)}
 className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
 likedPosts.has(kudos.id) ?'' :'hover:bg-neutral-50 focus:ring-2 focus:ring-teal-500'
} focus:outline-none`}
 aria-label={`Like this kudos. Current likes: ${kudos.likes_count}`}
 >
 <Heart className={`h-3.5 w-3.5 ${
 likedPosts.has(kudos.id)
 ?'fill-teal-600 text-teal-600'
 :'text-neutral-400 hover:text-teal-600 hover:fill-teal-600'
}`} />
 <span className={likedPosts.has(kudos.id) ?'text-teal-700 font-bold' :''}>
 {kudos.likes_count} {kudos.likes_count === 1 ?'Like' :'Likes'}
 </span>
 </button>
 </div>
 </Card>
 ))}
 </div>
 )}

 {/* Kudos Composer */}
 <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
 <DialogContent className={`sm:max-w-lg ${highContrast ? 'text-black' : ''}`}>
 <DialogHeader>
 <div className="flex items-center gap-2">
 <Award className="h-5 w-5 text-teal-600" />
 <DialogTitle className="text-neutral-800">Compose Kudos Recognition</DialogTitle>
 </div>
 </DialogHeader>

 {composerError && (
 <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold p-3 rounded-lg flex items-center animate-fade-in">
 ⚠️ {composerError}
 </div>
 )}

 <form onSubmit={handleSubmitKudos} className="space-y-4">
 <div>
 <label htmlFor="kudos-recipient" className="block text-xs font-bold text-neutral-700 mb-1">
 Recipient Name *
 </label>
 <Popover open={showRecipientDropdown} onOpenChange={setShowRecipientDropdown}>
 <PopoverTrigger asChild>
 <Button
 id="kudos-recipient"
 type="button"
 variant="outline"
 role="combobox"
 aria-expanded={showRecipientDropdown}
 className="w-full justify-between font-semibold text-xs"
 >
 <span className={recipient ? '' : 'text-neutral-400 font-normal'}>
 {recipient ? recipientSearch : 'Start typing a name...'}
 </span>
 <ChevronsUpDown className="opacity-50 h-4 w-4" />
 </Button>
 </PopoverTrigger>
 <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
 <Command>
 <CommandInput
 placeholder="Search colleagues..."
 value={recipientSearch}
 onValueChange={(value) => {
 setRecipientSearch(value);
 setRecipient('');
 }}
 />
 <CommandList>
 <CommandEmpty>No colleagues found</CommandEmpty>
 {eligibleRecipients.map(([id, profile]) => (
 <CommandItem
 key={id}
 value={profile.name}
 onSelect={() => {
 setRecipient(id);
 setRecipientSearch(profile.name);
 setShowRecipientDropdown(false);
}}
 >
 {profile.name}
 </CommandItem>
 ))}
 </CommandList>
 </Command>
 </PopoverContent>
 </Popover>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="kudos-category" className="block text-xs font-bold text-neutral-700 mb-1">
 Recognition Category
 </label>
 <Select
 value={category}
 onValueChange={(value) => {
 setCategory(value);
 if (value !=='Other') {
 setCustomCategory('');
}
}}
 >
 <SelectTrigger id="kudos-category" className="w-full text-xs font-semibold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Gratitude">Gratitude</SelectItem>
 <SelectItem value="Collaboration">Collaboration</SelectItem>
 <SelectItem value="Inspiration">Inspiration</SelectItem>
 <SelectItem value="Impact">Impact</SelectItem>
 <SelectItem value="Other">Other - Please specify</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <label htmlFor="kudos-sender" className="block text-xs font-bold text-neutral-700 mb-1">
 Your Name (Optional)
 </label>
 <Input
 id="kudos-sender"
 type="text"
 placeholder="Leave blank to send anonymously"
 value={senderName}
 onChange={(e) => setSenderName(e.target.value)}
 className="text-xs font-semibold"
 />
 </div>
 </div>

 {category ==='Other' && (
 <div className="animate-fade-in">
 <label htmlFor="kudos-custom-category" className="block text-xs font-bold text-neutral-700 mb-1">
 Custom Category Name *
 </label>
 <Input
 id="kudos-custom-category"
 type="text"
 required
 placeholder="e.g. Wellness, Mentorship, Innovation"
 value={customCategory}
 onChange={(e) => setCustomCategory(e.target.value)}
 className="text-xs font-semibold"
 />
 </div>
 )}

 <div>
 <label htmlFor="kudos-text" className="block text-xs font-bold text-neutral-700 mb-1">
 Appreciation Message *
 </label>
 <Textarea
 id="kudos-text"
 required
 rows={4}
 placeholder="Explain how this person supported you or the team..."
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 className="text-xs font-medium"
 />
 </div>

 <div className="flex items-center justify-end gap-2 border-t pt-3.5 border-neutral-100">
 <Button
 type="button"
 variant="secondary"
 size="sm"
 onClick={() => setIsComposerOpen(false)}
 >
 Cancel
 </Button>
 <Button
 type="submit"
 size="sm"
 disabled={isSubmitting}
 className="gap-1.5"
 >
 <Send className="h-3.5 w-3.5" />
 <span>{isSubmitting ?'Sending...' :'Send Kudos'}</span>
 </Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
