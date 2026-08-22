'use client';

import React, { useState, useEffect, useRef} from'react';
import { createPortal} from'react-dom';

import {
 Accessibility,
 Video,
 VideoOff,
 X,
 LogOut,
 Maximize,
 Minimize,
 Circle,
 Expand,
 Bell
} from'lucide-react';
import { useAccessibility} from'../context/AccessibilityContext';
import WebcamCVConsentModal from'./WebcamCVConsentModal';
import { supabase} from'../lib/supabaseClient';

interface HeaderProps {
 title: string;
 currentUser: any; // Using any during migration transition
 onLogout: () => void;
}

export default function Header({ title, currentUser, onLogout}: HeaderProps) {
 const {
 openDyslexic,
 setOpenDyslexic,
 readingRuler,
 setReadingRuler,
 highContrast,
 setHighContrast,
 fontScale,
 setFontScale,
 ttsEnabled,
 setTtsEnabled,
 ttsSpeed,
 setTtsSpeed,
 ttsPitch,
 setTtsPitch,
 nudgeStyle,
 setNudgeStyle
} = useAccessibility();

 const [isAccessMenuOpen, setIsAccessMenuOpen] = useState(false);
 const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  interface Notification {
    id: string;
    title: string;
    message: string;
    created_at: string;
    read: boolean;
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const channel = supabase.channel('realtime_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };
 const [cvActive, setCvActive] = useState(false);

  const [isMobileProfileMenuOpen, setIsMobileProfileMenuOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Prevent scrolling on mobile when full-screen modals are open
  useEffect(() => {
    if (isAccessMenuOpen || isMobileProfileMenuOpen || isNotifMenuOpen) {
      document.body.classList.add('overflow-hidden', 'sm:overflow-auto');
    } else {
      document.body.classList.remove('overflow-hidden', 'sm:overflow-auto');
    }
    return () => document.body.classList.remove('overflow-hidden', 'sm:overflow-auto');
  }, [isAccessMenuOpen, isMobileProfileMenuOpen, isNotifMenuOpen]);

  const [videoMode, setVideoMode] = useState<'normal' |'fullscreen' |'bubble'>('normal');

 const [position, setPosition] = useState({ x: 0, y: 0});
 const [isDraggingState, setIsDraggingState] = useState(false);
 const dragStart = useRef({ x: 0, y: 0});
 const isDragging = useRef(false);

 const [mounted, setMounted] = useState(false);
 useEffect(() => {
  const timer = setTimeout(() => setMounted(true), 0);
  return () => clearTimeout(timer);
 }, []);

 const videoRef = useRef<HTMLVideoElement>(null);
 const streamRef = useRef<MediaStream | null>(null);
 const widgetRef = useRef<HTMLDivElement>(null);

 const handlePointerDown = (e: React.PointerEvent) => {
 if (videoMode ==='fullscreen') return;
 if ((e.target as HTMLElement).tagName.toLowerCase() ==='button' || (e.target as HTMLElement).closest('button')) return;

 isDragging.current = true;
 setIsDraggingState(true);
 dragStart.current = {
 x: e.clientX - position.x,
 y: e.clientY - position.y
};
 (e.target as HTMLElement).setPointerCapture(e.pointerId);
};

 const handlePointerMove = (e: React.PointerEvent) => {
 if (!isDragging.current || !widgetRef.current) return;

 let newX = e.clientX - dragStart.current.x;
 let newY = e.clientY - dragStart.current.y;

 const rect = widgetRef.current.getBoundingClientRect();

 const maxX = 24;
 const minX = -(window.innerWidth - rect.width - 24);
 const maxY = 24;
 const minY = -(window.innerHeight - rect.height - 24);

 newX = Math.max(minX, Math.min(maxX, newX));
 newY = Math.max(minY, Math.min(maxY, newY));

 setPosition({ x: newX, y: newY});
};

 const handlePointerUp = (e: React.PointerEvent) => {
 if (!isDragging.current) return;
 isDragging.current = false;
 setIsDraggingState(false);
 (e.target as HTMLElement).releasePointerCapture(e.pointerId);
};

 // Load CV active state from Supabase (or fallback to local while transitioning)
 useEffect(() => {
 const fetchConsent = async () => {
 const { data: { user}} = await supabase.auth.getUser();
 if (user) {
 const { data} = await supabase
 .from('user_profiles')
 .select('camera_telemetry_consented')
 .eq('id', user.id)
 .single();
 if (data) {
 const consent = data.camera_telemetry_consented;
 
 // Always stay off on page load until explicitly turned on by user
 setCvActive(false);
 localStorage.setItem('pulse-cv-active','false');
 
 // Also persist back to localStorage for fallback scripts that might still check it
 localStorage.setItem('pulse-cv-consent', String(consent));
}
} else {
 // Fallback for when not fully migrated in page.tsx
 const savedCv = localStorage.getItem('pulse-cv-active');
 const consent = localStorage.getItem('pulse-cv-consent') ==='true';
 if (savedCv !== null) {
 setCvActive(savedCv ==='true' && consent);
}
}
};
 fetchConsent();
}, []);

 // Handle webcam stream based on cvActive
 useEffect(() => {
 let isCancelled = false;

 if (cvActive) {
 navigator.mediaDevices.getUserMedia({ video: true})
 .then((stream) => {
 if (isCancelled) {
 stream.getTracks().forEach(track => track.stop());
 return;
}
 streamRef.current = stream;
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
}
})
 .catch(err => console.error("Camera access denied or failed:", err));
} else {
 if (streamRef.current) {
 streamRef.current.getTracks().forEach(track => track.stop());
 streamRef.current = null;
}
 if (videoRef.current) {
 videoRef.current.srcObject = null;
}
}

 return () => {
 isCancelled = true;
 if (streamRef.current) {
 streamRef.current.getTracks().forEach(track => track.stop());
 streamRef.current = null;
}
};
}, [cvActive]);

 const updateConsentDB = async (val: boolean) => {
 setLoading(true);
 try {
 const { data: { user}} = await supabase.auth.getUser();
 if (user) {
 await supabase
 .from('user_profiles')
 .update({ camera_telemetry_consented: val})
 .eq('id', user.id);
}
} catch (e) {
 console.error(e);
} finally {
 setLoading(false);
}
};

 const toggleCv = () => {
 if (loading) return;

 if (cvActive) {
 setCvActive(false);
 localStorage.setItem('pulse-cv-active','false');
 updateConsentDB(false);


} else {
 const consent = localStorage.getItem('pulse-cv-consent') ==='true';
 if (consent) {
 setCvActive(true);
 localStorage.setItem('pulse-cv-active','true');
 updateConsentDB(true);


} else {
 setIsConsentModalOpen(true);
}
}
};

 const handleAcceptConsent = () => {
 localStorage.setItem('pulse-cv-consent','true');
 localStorage.setItem('pulse-cv-active','true');
 setCvActive(true);
 setIsConsentModalOpen(false);
 updateConsentDB(true);


};

 const handleDeclineConsent = () => {
 localStorage.setItem('pulse-cv-consent','false');
 localStorage.setItem('pulse-cv-active','false');
 setCvActive(false);
 setIsConsentModalOpen(false);
 updateConsentDB(false);
};

 return (
 <>
 <header className={`sticky top-0 right-0 ${isAccessMenuOpen ? 'z-[70]' : 'z-50'} flex h-20 items-center justify-between px-6 lg:px-8 bg-white border-b select-none ${highContrast
 ?'border-black bg-white text-black'
 :'border-border-color'
}`}>
 {/* Page Title & Breadcrumb (Responsive margin for mobile burger) */}
 <div className="flex items-center gap-3 pl-14 lg:pl-0">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-neutral-800 focus:outline-none">
 {title}
 </h1>
 <p className="text-xs text-neutral-400 hidden sm:block">AxionHR Well-Being Guardian Dashboard</p>
 </div>
 </div>

 {/* Header Actions */}
 <div className="flex items-center gap-2 sm:gap-4">

 {/* Notifications Dropdown */}
 <div className="relative">
 <button
 onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
 className={`p-2.5 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 ${isNotifMenuOpen
 ? (highContrast ?'bg-black text-white border-2 border-black' :'bg-teal-50 text-teal-600 border border-teal-200')
 : (highContrast ?'border border-black text-black hover:bg-neutral-100' :'bg-neutral-50 text-neutral-600 hover:bg-neutral-100')
}`}
 aria-expanded={isNotifMenuOpen}
 aria-haspopup="true"
 aria-label="Notifications"
 >
 <Bell className="h-5 w-5" />
 {notifications.filter(n => !n.read).length > 0 && (
 <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
 )}
 </button>

  {/* Dropdown Menu */}
  {isNotifMenuOpen && (
  <>
  {/* Mobile Backdrop */}
  <div className="fixed inset-0 z-[100] bg-neutral-900/40 backdrop-blur-sm sm:hidden animate-fade-in" onClick={(e) => { e.stopPropagation(); setIsNotifMenuOpen(false); }} />
  
  {/* Desktop Overlay blocker for outside clicks */}
  <div className="hidden sm:block fixed inset-0 z-40" onClick={() => setIsNotifMenuOpen(false)} />

  <div 
    className={`
      fixed inset-x-4 top-1/2 -translate-y-1/2 z-[101] p-5 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] bg-white border
      sm:absolute sm:inset-auto sm:top-auto sm:right-0 sm:mt-3 sm:w-80 sm:p-5 sm:rounded-xl sm:shadow-xl sm:z-50 sm:max-h-[60vh] sm:translate-y-0
      transition-all animate-fade-in
      ${highContrast ?'border-black text-black' :'border-border-color'}
    `}
    onClick={(e) => e.stopPropagation()}
  >
  <div className="flex items-center justify-between border-b pb-3 mb-4 shrink-0">
  <div className="flex items-center gap-2">
  <Bell className="h-5 w-5 text-teal-600" />
  <span className="font-bold text-neutral-800">Notifications</span>
  </div>
  <button
  onClick={() => setIsNotifMenuOpen(false)}
  className="p-1 rounded hover:bg-neutral-100 focus:ring-2 focus:ring-teal-500"
  aria-label="Close notifications panel"
  >
  <X className="h-4 w-4" />
  </button>
  </div>
  
  <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
 {notifications.length === 0 ? (
 <div className="text-center text-sm text-neutral-500 py-4">No notifications</div>
 ) : (
 notifications.map(notif => (
 <div 
 key={notif.id} 
 onClick={() => markAsRead(notif.id)}
 className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${notif.read ?'bg-white border-border-color hover:bg-neutral-50' :'bg-teal-50 border-teal-200 hover:bg-teal-100/50'} ${highContrast ?'border-black' :''}`}
 role="button"
 tabIndex={0}
 onKeyDown={(e) => {
 if (e.key ==='Enter' || e.key ===' ') {
 e.preventDefault();
 markAsRead(notif.id);
}
}}
 >
 <div className="flex justify-between items-start mb-1">
 <h4 className="text-sm font-semibold text-neutral-800">{notif.title}</h4>
 <span className="text-[10px] text-neutral-500">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 <p className="text-xs text-neutral-600 text-left">{notif.message}</p>
 {!notif.read && (
 <div className="text-[10px] text-teal-600 font-bold mt-2 text-left">
 Click to mark as read
 </div>
 )}
 </div>
 ))
 )}
 </div>
 </div>
 </>
 )}
 </div>
  {/* User Profile Info */}
  <div className="relative pl-2 sm:border-l border-border-color flex items-center">
   <button 
     onClick={() => { setIsMobileProfileMenuOpen(!isMobileProfileMenuOpen); setIsAccessMenuOpen(false); }}
     className="flex items-center gap-3 focus:outline-none group rounded-lg hover:bg-neutral-50 p-1 pr-2 sm:pr-3 transition"
     aria-label="Toggle profile menu"
     aria-haspopup="true"
     aria-expanded={isMobileProfileMenuOpen}
   >
     <div className="relative h-9 w-9 rounded-full overflow-hidden border border-border-color shrink-0 select-none bg-neutral-100 group-focus:ring-2 group-focus:ring-teal-500">
       {(currentUser?.avatar?.startsWith('data:image') || currentUser?.avatar?.startsWith('http')) ? (
         <img src={currentUser.avatar} alt="Profile" className="h-full w-full object-cover animate-fade-in" />
       ) : (
         <div className="h-full w-full flex items-center justify-center font-bold text-teal-700 text-sm animate-fade-in">
           {currentUser?.avatar || currentUser?.full_name?.substring(0, 2).toUpperCase() ||'U'}
         </div>
       )}
     </div>
     <div className="hidden sm:block text-left select-none animate-fade-in">
       <span className="block text-xs font-bold text-neutral-800 leading-none group-hover:text-teal-700 transition-colors">{currentUser?.name || currentUser?.full_name}</span>
       <span className="block text-[9px] text-neutral-400 mt-1 font-semibold">{currentUser?.title || currentUser?.job_title}</span>
     </div>
   </button>

  {/* Profile Dropdown Menu */}
  {isMobileProfileMenuOpen && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setIsMobileProfileMenuOpen(false)} />
      <div className={`absolute right-0 top-full mt-2 w-56 p-2 rounded-xl border bg-white shadow-xl z-50 transition-all animate-fade-in ${highContrast ? 'border-black text-black' : 'border-border-color'}`}>
        <div className="px-3 py-2 border-b border-border-color mb-2">
          <span className="block text-sm font-bold text-neutral-800">{currentUser?.name || currentUser?.full_name}</span>
          <span className="block text-[10px] text-neutral-400 font-semibold">{currentUser?.title || currentUser?.job_title}</span>
        </div>
        
        <button 
          onClick={() => { toggleCv(); setIsMobileProfileMenuOpen(false); }}
          className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-3 hover:bg-neutral-50 transition-colors"
        >
          {cvActive ? <Video className="h-4 w-4 text-teal-600" /> : <VideoOff className="h-4 w-4 text-neutral-400" />}
          <span>{cvActive ? 'Pause Local CV' : 'Resume Local CV'}</span>
        </button>

        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsAccessMenuOpen(!isAccessMenuOpen); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors ${isAccessMenuOpen ? 'bg-teal-50 text-teal-700' : 'hover:bg-neutral-50'}`}
          >
            <div className="flex items-center gap-3">
              <Accessibility className="h-4 w-4 text-teal-600" />
              <span>Accessibility Hub</span>
            </div>
            <span className="text-[10px] text-neutral-400">▶</span>
          </button>
          
          {isAccessMenuOpen && (
            <>
              {/* Mobile Backdrop */}
              <div className="fixed inset-0 z-[100] bg-neutral-900/40 backdrop-blur-sm sm:hidden animate-fade-in" onClick={(e) => { e.stopPropagation(); setIsAccessMenuOpen(false); }} />
              
              <div 
                className={`
                  fixed inset-x-4 top-1/2 -translate-y-1/2 z-[101] p-5 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto bg-white border
                  sm:absolute sm:inset-auto sm:top-0 sm:right-full sm:-translate-y-0 sm:mr-3 sm:w-72 md:w-80 sm:p-4 sm:rounded-xl sm:shadow-xl sm:z-50 sm:max-h-[80vh]
                  transition-all animate-fade-in custom-scrollbar
                  ${highContrast ? 'border-black text-black' : 'border-border-color'}
                `} 
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b pb-3 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Accessibility className="h-5 w-5 text-teal-600" />
                    <h2 className="font-bold text-neutral-800 text-sm">Accessibility Hub</h2>
                  </div>
                  <button
                    onClick={() => setIsAccessMenuOpen(false)}
                    className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 sm:hidden"
                    aria-label="Close accessibility panel"
                  >
                    <X className="h-4 w-4 text-neutral-500" />
                  </button>
                </div>
              
              <div className="space-y-4">
                {/* OpenDyslexic Toggle */}
                <div className="flex items-center justify-between">
                <div>
                <label htmlFor="dyslexic-toggle" className="block text-sm font-semibold text-neutral-700">OpenDyslexic Font</label>
                <span className="text-[10px] text-neutral-400 block">Enables dyslexia-friendly typeface</span>
                </div>
                <button
                id="dyslexic-toggle"
                role="switch"
                aria-checked={openDyslexic}
                onClick={() => setOpenDyslexic(!openDyslexic)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${openDyslexic ?'bg-teal-600' :'bg-neutral-200'}`}
                >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${openDyslexic ?'translate-x-4' :'translate-x-0'}`} />
                </button>
                </div>

                {/* Reading Ruler Toggle */}
                <div className="flex items-center justify-between">
                <div>
                <label htmlFor="ruler-toggle" className="block text-sm font-semibold text-neutral-700">Reading Ruler</label>
                <span className="text-[10px] text-neutral-400 block">Horizontal tracking guide follows cursor</span>
                </div>
                <button
                id="ruler-toggle"
                role="switch"
                aria-checked={readingRuler}
                onClick={() => setReadingRuler(!readingRuler)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${readingRuler ?'bg-teal-600' :'bg-neutral-200'}`}
                >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${readingRuler ?'translate-x-4' :'translate-x-0'}`} />
                </button>
                </div>

                {/* High Contrast Toggle */}
                <div className="flex items-center justify-between">
                <div>
                <label htmlFor="contrast-toggle" className="block text-sm font-semibold text-neutral-700">High Contrast Mode</label>
                <span className="text-[10px] text-neutral-400 block">Stark black & white layout borders</span>
                </div>
                <button
                id="contrast-toggle"
                role="switch"
                aria-checked={highContrast}
                onClick={() => setHighContrast(!highContrast)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${highContrast ?'bg-teal-600' :'bg-neutral-200'}`}
                >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${highContrast ?'translate-x-4' :'translate-x-0'}`} />
                </button>
                </div>

                {/* Font Scaling Options */}
                <div className="border-t pt-3">
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1.5">Text Zoom Scale</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-50 rounded-lg border border-neutral-100">
                {(['normal','large','extra-large'] as const).map((scale) => (
                <button
                key={scale}
                onClick={() => setFontScale(scale)}
                className={`py-1 px-1.5 rounded-md text-[10px] font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${fontScale === scale
                ?'bg-white text-neutral-900 shadow-sm border border-border-color font-bold'
                :'text-neutral-500 hover:text-neutral-800'
                }`}
                >
                {scale ==='normal' &&'100%'}
                {scale ==='large' &&'120%'}
                {scale ==='extra-large' &&'140%'}
                </button>
                ))}
                </div>
                </div>

                {/* Text-to-Speech Toggle & Sliders */}
                <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                <div>
                <label htmlFor="tts-toggle" className="block text-sm font-semibold text-neutral-700">Text-to-Speech</label>
                <span className="text-[10px] text-neutral-400 block">Reads hovered text elements</span>
                </div>
                <button
                id="tts-toggle"
                role="switch"
                aria-checked={ttsEnabled}
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 ${ttsEnabled ?'bg-teal-600' :'bg-neutral-200'}`}
                >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${ttsEnabled ?'translate-x-4' :'translate-x-0'}`} />
                </button>
                </div>

                {ttsEnabled && (
                <div className="space-y-2 p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                <div>
                <div className="flex justify-between text-[9px] font-bold text-neutral-500 mb-1">
                <span>Speech Speed</span>
                <span>{ttsSpeed}x</span>
                </div>
                <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsSpeed}
                onChange={(e) => setTtsSpeed(Number(e.target.value))}
                className="w-full h-1 bg-neutral-250 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
                aria-label="Speech Speed"
                />
                </div>

                <div>
                <div className="flex justify-between text-[9px] font-bold text-neutral-500 mb-1">
                <span>Speech Pitch</span>
                <span>{ttsPitch}</span>
                </div>
                <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsPitch}
                onChange={(e) => setTtsPitch(Number(e.target.value))}
                className="w-full h-1 bg-neutral-250 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
                aria-label="Speech Pitch"
                />
                </div>
                </div>
                )}
                </div>

                {/* Nudge Delivery Preferences */}
                <div className="border-t pt-3">
                <label htmlFor="nudge-style-select" className="block text-[11px] font-semibold text-neutral-700 mb-1.5">
                Nudge Delivery Style
                </label>
                <select
                id="nudge-style-select"
                value={nudgeStyle}
                onChange={(e) => setNudgeStyle(e.target.value as'toast' |'glow' |'push' |'off')}
                className={`w-full p-2 rounded-lg border text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ?'border-black' :'border-border-color'}`}
                >
                <option value="toast">Toast Notification</option>
                <option value="glow">Ambient Edge-Glow</option>
                <option value="push">Web Push Notification</option>
                <option value="off">Off / Disabled</option>
                </select>
                </div>
              </div>
            </div>
            </>
          )}
        </div>

        <div className="border-t border-border-color my-1" />

        <button 
          onClick={onLogout}
          className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  )}
  </div>
  </div>
  </header>

 {/* Picture-in-Picture Local Camera Feed (Portaled to avoid ALL z-index stacking context constraints) */}
 {cvActive && mounted && createPortal(
 <div
 ref={widgetRef}
 onPointerDown={handlePointerDown}
 onPointerMove={handlePointerMove}
 onPointerUp={handlePointerUp}
 onPointerCancel={handlePointerUp}
 style={{
 transform: videoMode ==='fullscreen' ?'none' : `translate(${position.x}px, ${position.y}px)`,
 cursor: videoMode ==='fullscreen' ?'default' : (isDraggingState ?'grabbing' :'grab'),
 transition: isDraggingState ?'none' :'width 0.3s, height 0.3s, border-radius 0.3s, opacity 0.3s, transform 0.3s'
}}
 className={`
 group overflow-hidden shadow-2xl z-[100] bg-black animate-fade-in
 ${videoMode ==='fullscreen' ?'fixed inset-0 w-full h-full rounded-none' :''}
 ${videoMode ==='bubble' ?'fixed bottom-6 right-6 w-24 h-24 rounded-full border-2 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]' :''}
 ${videoMode ==='normal' ?'fixed bottom-6 right-6 w-48 sm:w-64 rounded-xl border-2 border-teal-500' :''}
 `}>
 {videoMode !=='bubble' && (
 <div className={`absolute top-3 left-3 flex items-center gap-1.5 z-10 transition-opacity duration-200 ${videoMode ==='fullscreen' ?'opacity-100' :'group-hover:opacity-0 opacity-100'}`}>
 <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
 <span className="text-[9px] sm:text-[10px] font-mono text-white font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
 LOCAL CV ACTIVE
 </span>
 </div>
 )}

 {/* Controls */}
 {videoMode ==='bubble' ? (
 <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30 backdrop-blur-[2px]">
 <button
 onClick={() => setVideoMode('normal')}
 className="p-2 bg-black/60 hover:bg-teal-600 rounded-full text-white backdrop-blur-sm transition-colors shadow-sm"
 title="Normal Size"
 >
 <Expand className="w-5 h-5" />
 </button>
 </div>
 ) : (
 <div className="absolute top-2 right-2 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
 {videoMode !=='fullscreen' && (
 <button
 onClick={() => setVideoMode('fullscreen')}
 className="p-1.5 bg-black/60 hover:bg-teal-600 rounded text-white backdrop-blur-sm transition-colors shadow-sm"
 title="Full Screen"
 >
 <Maximize className="w-3.5 h-3.5" />
 </button>
 )}
 {videoMode ==='fullscreen' && (
 <button
 onClick={() => setVideoMode('normal')}
 className="p-2 bg-black/60 hover:bg-teal-600 rounded text-white backdrop-blur-sm transition-colors shadow-sm"
 title="Exit Full Screen"
 >
 <Minimize className="w-5 h-5" />
 </button>
 )}
 <button
 onClick={() => setVideoMode('bubble')}
 className={`p-1.5 bg-black/60 hover:bg-teal-600 rounded text-white backdrop-blur-sm transition-colors shadow-sm ${videoMode ==='fullscreen' ?'p-2' :''}`}
 title="Bubble Mode"
 >
 <Circle className={videoMode ==='fullscreen' ?'w-5 h-5' :'w-3.5 h-3.5'} />
 </button>
 </div>
 )}

 <video
 ref={videoRef}
 autoPlay
 playsInline
 muted
 className={`w-full h-full object-cover transition-all duration-300 -scale-x-100 ${videoMode ==='normal' ?'aspect-video' :''}`}
 />

 {videoMode !=='bubble' && (
 <div className={`absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1 z-10 transition-opacity duration-200 ${videoMode ==='fullscreen' ?'opacity-100 p-2' :'opacity-100 group-hover:opacity-0'}`}>
 <p className={`font-mono text-teal-400 text-center ${videoMode ==='fullscreen' ?'text-sm' :'text-[8px] sm:text-[9px]'}`}>
 PROCESSING GAZE & POSTURE — 100% IN-BROWSER
 </p>
 </div>
 )}
 </div>,
 document.body
 )}

 {/* Consent flow modal overlay */}
 <WebcamCVConsentModal
 isOpen={isConsentModalOpen}
 onAccept={handleAcceptConsent}
 onDecline={handleDeclineConsent}
 />
 </>
 );
}
