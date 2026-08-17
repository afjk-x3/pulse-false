'use client';

import React, { useState, useEffect} from'react';
import { Award, Search, Heart, Plus, Send, X} from'lucide-react';
import { supabase} from'../lib/supabaseClient';
import { Database} from'../lib/database.types';
import { useAccessibility} from'../context/AccessibilityContext';

type KudosPost = Database['public']['Tables']['kudos_posts']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

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

 const fetchKudos = async (profileMap: Record<string, { name: string, role: string}>) => {
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

 return (
 <div className="space-y-6">
 {/* Search and Compose Header */}
 <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
 {/* Search Input */}
 <div className="relative w-full sm:max-w-md">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-400" />
 <input
 type="text"
 placeholder="Search by name, sender, or keyword..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className={`w-full pl-10 pr-4 py-2.5 rounded-xl border glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>

 {/* Compose trigger button */}
 <button
 onClick={() => setIsComposerOpen(true)}
 className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
 highContrast
 ?'bg-black text-white hover:bg-neutral-800 border-2 border-black'
 :'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
}`}
 >
 <Plus className="h-4.5 w-4.5" />
 <span>Send Kudos Note</span>
 </button>
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
 <button
 key={filter}
 onClick={() => setActiveFilter(filter)}
 className={`py-1.5 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
 activeFilter === filter
 ? (highContrast ?'bg-black text-white' :'bg-teal-50 text-teal-800 border border-teal-200 font-bold')
 :'glass-card hover:bg-neutral-50 text-neutral-500 border border-neutral-100'
}`}
 >
 {filter}
 </button>
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
 <div className={`py-16 px-6 text-center glass-card rounded-2xl border ${
 highContrast ?'border-black' :'border-border-color'
}`}>
 <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 border border-amber-100">
 <Award className="h-6 w-6 text-amber-500" />
 </div>
 <p className="text-xs font-bold text-neutral-700">Let's spread some positivity!</p>
 <p className="text-[11px] text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
 Take a moment to recognize a teammate whose hard work made your day easier. Your appreciation means more than you think.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filteredKudos.map((kudos) => (
 <article
 key={kudos.id}
 className={`p-5 glass-card rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
 highContrast ?'border-black text-black' :'border-border-color'
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
 </article>
 ))}
 </div>
 )}

 {/* Kudos Composer Modal Overlay */}
 {isComposerOpen && (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-fade-in"
 role="dialog"
 aria-modal="true"
 aria-labelledby="composer-title"
 >
 <div className={`w-full max-w-lg p-6 glass-card rounded-2xl border shadow-2xl space-y-4 animate-scale-up ${
 highContrast ?'border-black text-black' :'border-neutral-150'
}`}>
 <div className="flex items-center justify-between border-b pb-3 mb-4">
 <div className="flex items-center gap-2">
 <Award className="h-5 w-5 text-teal-600" />
 <h3 id="composer-title" className="font-bold text-neutral-800">Compose Kudos Recognition</h3>
 </div>
 <button 
 onClick={() => {
 setIsComposerOpen(false);
 setComposerError(null);
}}
 className="p-1 rounded hover:bg-neutral-100"
 aria-label="Close form"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 {composerError && (
 <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold p-3 rounded-lg flex items-center mb-4 animate-fade-in">
 ⚠️ {composerError}
 </div>
 )}

 <form onSubmit={handleSubmitKudos} className="space-y-4">
 <div>
 <label htmlFor="kudos-recipient" className="block text-xs font-bold text-neutral-700 mb-1">
 Recipient Name *
 </label>
 <div className="relative">
 <input
 id="kudos-recipient"
 type="text"
 required
 placeholder="Start typing a name..."
 value={recipientSearch}
 onChange={(e) => {
 setRecipientSearch(e.target.value);
 setRecipient(''); 
 setShowRecipientDropdown(true);
}}
 onFocus={() => setShowRecipientDropdown(true)}
 onBlur={() => setTimeout(() => setShowRecipientDropdown(false), 200)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 {showRecipientDropdown && recipientSearch && (
 <ul className="absolute z-10 w-full mt-1 glass-card border border-border-color rounded-lg shadow-lg max-h-48 overflow-y-auto">
 {Object.entries(profiles)
 .filter(([id, profile]) => id !== currentUser?.id && profile.role !=='admin' && profile.name.toLowerCase().includes(recipientSearch.toLowerCase()))
 .map(([id, profile]) => (
 <li
 key={id}
 className="px-4 py-2 text-xs font-semibold hover:bg-teal-50 cursor-pointer"
 onMouseDown={() => {
 setRecipient(id);
 setRecipientSearch(profile.name);
 setShowRecipientDropdown(false);
}}
 >
 {profile.name}
 </li>
 ))}
 {Object.entries(profiles).filter(([id, profile]) => id !== currentUser?.id && profile.role !=='admin' && profile.name.toLowerCase().includes(recipientSearch.toLowerCase())).length === 0 && (
 <li className="px-4 py-2 text-xs text-neutral-500 italic">No colleagues found</li>
 )}
 </ul>
 )}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="kudos-category" className="block text-xs font-bold text-neutral-700 mb-1">
 Recognition Category
 </label>
 <select
 id="kudos-category"
 value={category}
 onChange={(e) => {
 setCategory(e.target.value);
 if (e.target.value !=='Other') {
 setCustomCategory('');
}
}}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 >
 <option value="Gratitude">Gratitude</option>
 <option value="Collaboration">Collaboration</option>
 <option value="Inspiration">Inspiration</option>
 <option value="Impact">Impact</option>
 <option value="Other">Other - Please specify</option>
 </select>
 </div>
 <div>
 <label htmlFor="kudos-sender" className="block text-xs font-bold text-neutral-700 mb-1">
 Your Name (Optional)
 </label>
 <input
 id="kudos-sender"
 type="text"
 placeholder="Leave blank to send anonymously"
 value={senderName}
 onChange={(e) => setSenderName(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>
 </div>

 {category ==='Other' && (
 <div className="animate-fade-in">
 <label htmlFor="kudos-custom-category" className="block text-xs font-bold text-neutral-700 mb-1">
 Custom Category Name *
 </label>
 <input
 id="kudos-custom-category"
 type="text"
 required
 placeholder="e.g. Wellness, Mentorship, Innovation"
 value={customCategory}
 onChange={(e) => setCustomCategory(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>
 )}

 <div>
 <label htmlFor="kudos-text" className="block text-xs font-bold text-neutral-700 mb-1">
 Appreciation Message *
 </label>
 <textarea
 id="kudos-text"
 required
 rows={4}
 placeholder="Explain how this person supported you or the team..."
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium ${
 highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>

 <div className="flex items-center justify-end gap-2 border-t pt-3.5 border-neutral-100">
 <button
 type="button"
 onClick={() => setIsComposerOpen(false)}
 className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting}
 className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 disabled:opacity-60"
 >
 <Send className="h-3.5 w-3.5" />
 <span>{isSubmitting ?'Sending...' :'Send Kudos'}</span>
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
