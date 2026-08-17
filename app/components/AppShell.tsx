'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar, { TabType } from './Sidebar';
import Header from './Header';
import { useAccessibility } from '../context/AccessibilityContext';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';
import SentimentWidget from './SentimentWidget';
import MicroCoachingNudge from './MicroCoachingNudge';

export const AuthContext = React.createContext<any>(null);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { highContrast } = useAccessibility();
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [systemPaused, setSystemPaused] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const triggerRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshTrigger]);

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setCurrentUser(data);
      } else {
        setLoginError('Authentication successful, but no User Profile was found.');
      }
    } catch (e) {
      setLoginError('Failed to fetch user profile.');
    } finally {
      setAuthLoading(false);
    }
  }

  const handleLogin = async (email: string, password = 'password123') => {
    setAuthLoading(true);
    setLoginError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.session) {
        setSession(data.session);
        await fetchUserProfile(data.session.user.id);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.from('admin_configs').select('emergency_kill_switch').limit(1).single();
      if (data) setSystemPaused(data.emergency_kill_switch);
    };
    loadConfig();

    const handleStatusChange = () => {
      loadConfig();
      triggerRefresh();
    };
    window.addEventListener('pulse-system-paused-change', handleStatusChange);
    return () => window.removeEventListener('pulse-system-paused-change', handleStatusChange);
  }, [triggerRefresh]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginError('Please enter both email and password.');
      return;
    }
    handleLogin(emailInput, passwordInput);
  };

  // Derive activeTab and PageTitle from pathname
  let activeTab: TabType = 'dashboard';
  let pageTitle = 'Guardian Dashboard';
  if (pathname.includes('/kudos')) { activeTab = 'kudos'; pageTitle = 'Kudos Peer Feed'; }
  else if (pathname.includes('/support')) { activeTab = 'support'; pageTitle = 'Support Circles Forum'; }
  else if (pathname.includes('/privacy')) { activeTab = 'privacy'; pageTitle = 'Privacy & Data Governance'; }
  else if (pathname.includes('/coffee')) { activeTab = 'coffee'; pageTitle = 'Coffee Roulette Connector'; }
  else if (pathname.includes('/manager')) { activeTab = 'manager'; pageTitle = 'Manager Team Overview'; }
  else if (pathname.includes('/admin')) { activeTab = 'admin'; pageTitle = 'Admin Console'; }
  else if (pathname.includes('/users')) { activeTab = 'users'; pageTitle = 'User Management'; }
  else if (pathname.includes('/settings')) { activeTab = 'settings'; pageTitle = 'Profile Settings'; }

  useEffect(() => {
    if (!authLoading && currentUser) {
      const role = (currentUser.role || currentUser.roleName || 'employee').toLowerCase();

      const roleConfig = {
        employee: ['dashboard', 'kudos', 'support', 'coffee', 'privacy', 'settings'],
        manager: ['dashboard', 'manager', 'kudos', 'support', 'privacy', 'settings'],
        admin: ['admin', 'users', 'privacy', 'settings'],
        it: ['admin', 'users', 'privacy', 'settings']
      };

      const allowedTabs = roleConfig[role as keyof typeof roleConfig] || roleConfig['employee'];

      if (!allowedTabs.includes(activeTab)) {
        if (role === 'admin' || role === 'it') router.replace('/admin');
        else if (role === 'manager') router.replace('/manager');
        else router.replace('/');
      }
    }
  }, [authLoading, currentUser, activeTab, router]);

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 bg-background ${highContrast ? 'glass-card text-black' : ''}`}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (!currentUser || !session) {
    return (
      <div className={`min-h-screen w-full flex bg-background ${highContrast ? 'glass-card text-black' : ''}`}>
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-teal-900 via-teal-800 to-teal-950 items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="absolute inset-0 flex flex-col justify-end p-16 pb-24 text-white z-10">
            <div className="space-y-4 max-w-md animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 relative"><Image src="/logo.svg" alt="AxionHR Logo" fill className="object-contain filter brightness-0 invert" /></div>
                <h2 className="text-2xl font-bold tracking-tight">AxionHR Pulse</h2>
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Enterprise Telemetry & Well-Being Guardian</h1>
              <p className="text-sm text-teal-100 font-medium leading-relaxed">Privacy-first workplace health monitoring.</p>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 animate-fade-in">
          <div className="w-full max-w-sm space-y-10">
            <div className="lg:hidden text-center space-y-4 mb-8">
              <div className="relative w-40 h-12 mx-auto select-none"><Image src="/logo.svg" alt="Pulse WBG Logo" fill className="object-contain" priority /></div>
              <h1 className="text-xl font-bold text-neutral-800 tracking-tight">Well-Being Guardian</h1>
            </div>
            <div className="space-y-3 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Welcome back</h2>
              <p className="text-sm text-neutral-500 font-medium">Please enter your corporate credentials to access the WBG portal.</p>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-700">Work Email</label>
                  <input type="email" placeholder="e.g. alex.rivera@axionhr.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full p-3.5 rounded-xl border text-sm glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium transition-all" required />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-700">Password</label>
                  </div>
                  <input type="password" placeholder="••••••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-3.5 rounded-xl border text-sm glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium transition-all" required />
                </div>
              </div>
              {loginError && (<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2"><span className="shrink-0 mt-0.5">⚠️</span><span>{loginError}</span></div>)}
              <button type="submit" className="w-full py-3.5 rounded-xl text-sm font-bold text-center border transition-all active:scale-[0.98] bg-teal-600 text-white hover:bg-teal-700 shadow-lg hover:shadow-xl ">Sign In to Portal</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex bg-background text-foreground transition-colors duration-300 ${highContrast ? 'high-contrast' : ''}`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={() => { }} // Disabled as we use Links now
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div className={`flex-1 flex flex-col min-h-screen relative transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <Header title={pageTitle} currentUser={currentUser} onLogout={handleLogout} />

        {systemPaused && (
          <div className="w-full bg-red-600 text-white py-3.5 px-6 text-xs font-extrabold flex items-center justify-center gap-2 border-b border-red-750 select-none animate-slide-down">
            <span className="inline-block p-1 bg-red-800 rounded-md">⚠️ SYSTEM PORTAL PAUSED</span>
            <p>Corporate administration has suspended all well-being telemetry org-wide.</p>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          <AuthContext.Provider value={{ currentUser, triggerRefresh, session }}>
            {children}
          </AuthContext.Provider>
        </main>
      </div>

      {!systemPaused && (
        <>
          <SentimentWidget onLogSaved={triggerRefresh} />
          <MicroCoachingNudge />
        </>
      )}

      {currentUser && !currentUser.phone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-900/60 backdrop-blur-md p-4">
          <div className={`w-full max-w-lg p-6 glass-card rounded-2xl border shadow-xl flex flex-col gap-4 border-border-color`}>
            <div>
              <h2 className="text-lg font-bold">Complete Your Profile Setup</h2>
              <p className="text-xs opacity-70 mt-1">First-time login setup: Please verify and fill out your required profile information.</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const pName = formData.get('name') as string;
              const pPhone = formData.get('phone') as string;
              const pAddress = formData.get('address') as string;

              if (pName && pPhone) {
                try {
                  await supabase.from('user_profiles').update({
                    full_name: pName.trim(), phone: pPhone.trim(), address: pAddress ? pAddress.trim() : null
                  }).eq('id', currentUser.id);
                  triggerRefresh();
                } catch (e) {
                  alert('Failed to save profile setup.');
                }
              }
            }} className="space-y-4">
              <div><label className="block text-xs font-bold mb-1">Full Name *</label><input name="name" type="text" defaultValue={currentUser.full_name} required className="w-full p-2.5 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold" /></div>
              <div><label className="block text-xs font-bold mb-1">Work Email (Read-only)</label><input type="email" value={currentUser.email} disabled className="w-full p-2.5 rounded-lg border text-xs bg-black/5 cursor-not-allowed font-semibold focus:outline-none" /></div>
              <div><label className="block text-xs font-bold mb-1">Phone Number *</label><input name="phone" type="tel" required className="w-full p-2.5 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold" /></div>
              <div><label className="block text-xs font-bold mb-1">Residential Address (Optional)</label><input name="address" type="text" className="w-full p-2.5 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold" /></div>
              <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold transition-all bg-teal-600 hover:bg-teal-700 text-white">Access Portal</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
