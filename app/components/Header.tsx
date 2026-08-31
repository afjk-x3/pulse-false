'use client';

import React, { useState, useEffect, useRef} from'react';
import { createPortal} from'react-dom';

import {
 Accessibility,
 Video,
 VideoOff,
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
import { Button } from'./ui/button';
import { Popover, PopoverTrigger, PopoverContent} from'./ui/popover';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle} from'./ui/sheet';
import HeaderNotificationsPanel from'./HeaderNotificationsPanel';
import HeaderAccessibilityPanel from'./HeaderAccessibilityPanel';

interface HeaderProps {
 title: string;
 currentUser: any; // Using any during migration transition
 onLogout: () => void;
}

export default function Header({ title, currentUser, onLogout}: HeaderProps) {
 const {
 highContrast
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

  // The notifications trigger renders both a Popover (desktop) and a Sheet
  // (mobile); PopoverContent/SheetContent both portal to document.body, so
  // CSS alone (`hidden sm:block` / `sm:hidden` on the trigger wrappers)
  // cannot keep the "wrong" one from becoming an interactive Radix root --
  // Tailwind's breakpoint classes only ever hide the trigger button, not the
  // portaled content. Gate each root's `open` prop on the actual viewport so
  // only one is ever live at a time, matching the shadcn responsive
  // dialog/drawer pattern.
  const [isDesktopNotif, setIsDesktopNotif] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktopNotif(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Same rationale as isDesktopNotif above: PopoverContent/SheetContent both
  // portal to document.body, so the accessibility hub's desktop/mobile roots
  // must be gated on the real viewport rather than on Tailwind's `hidden
  // sm:block` / `sm:hidden` wrapper classes.
  const [isDesktopAccess, setIsDesktopAccess] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktopAccess(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

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
 <header className={`sticky top-0 right-0 z-50 flex h-20 items-center justify-between px-6 lg:px-8 bg-white border-b select-none ${highContrast
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

 {/* Notifications */}
 {/* Desktop: anchored popover */}
 <div className="hidden sm:block">
 <Popover open={isNotifMenuOpen && isDesktopNotif} onOpenChange={setIsNotifMenuOpen}>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full relative">
 <Bell className="h-5 w-5" />
 {notifications.filter(n => !n.read).length > 0 && (
 <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
 )}
 </Button>
 </PopoverTrigger>
 <PopoverContent align="end" className="w-80 p-5 max-h-[60vh] overflow-y-auto">
 <HeaderNotificationsPanel notifications={notifications} onClose={() => setIsNotifMenuOpen(false)} onMarkAsRead={markAsRead} />
 </PopoverContent>
 </Popover>
 </div>

 {/* Mobile: centred sheet */}
 <div className="sm:hidden">
 <Sheet open={isNotifMenuOpen && !isDesktopNotif} onOpenChange={setIsNotifMenuOpen}>
 <SheetTrigger asChild>
 <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full relative">
 <Bell className="h-5 w-5" />
 {notifications.filter(n => !n.read).length > 0 && (
 <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
 )}
 </Button>
 </SheetTrigger>
 <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-5">
 <SheetHeader className="sr-only"><SheetTitle>Notifications</SheetTitle></SheetHeader>
 <HeaderNotificationsPanel notifications={notifications} onClose={() => setIsNotifMenuOpen(false)} onMarkAsRead={markAsRead} />
 </SheetContent>
 </Sheet>
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
          {/* Desktop: anchored popover, flying out to the left of the profile dropdown */}
          <div className="hidden sm:block">
            <Popover open={isAccessMenuOpen && isDesktopAccess} onOpenChange={setIsAccessMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors ${isAccessMenuOpen ? 'bg-teal-50 text-teal-700' : 'hover:bg-neutral-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Accessibility className="h-4 w-4 text-teal-600" />
                    <span>Accessibility Hub</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">▶</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="left" align="start" className="w-72 md:w-80 p-4 max-h-[80vh] overflow-y-auto overflow-x-hidden">
                <HeaderAccessibilityPanel />
              </PopoverContent>
            </Popover>
          </div>

          {/* Mobile: centred sheet */}
          <div className="sm:hidden">
            <Sheet open={isAccessMenuOpen && !isDesktopAccess} onOpenChange={setIsAccessMenuOpen}>
              <SheetTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors ${isAccessMenuOpen ? 'bg-teal-50 text-teal-700' : 'hover:bg-neutral-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Accessibility className="h-4 w-4 text-teal-600" />
                    <span>Accessibility Hub</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">▶</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto overflow-x-hidden p-5">
                <SheetHeader className="sr-only"><SheetTitle>Accessibility Hub</SheetTitle></SheetHeader>
                <HeaderAccessibilityPanel />
              </SheetContent>
            </Sheet>
          </div>
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
