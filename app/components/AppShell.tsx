'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar, { TabType } from './Sidebar';
import Header from './Header';
import { useAccessibility } from '../context/AccessibilityContext';
import { supabase } from '../lib/supabaseClient';
import SentimentWidget from './SentimentWidget';
import MicroCoachingNudge from './MicroCoachingNudge';
import LoginGate from './LoginGate';
import ProfileSetupDialog from './ProfileSetupDialog';

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

  async function fetchUserProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setCurrentUser(data);
        return data;
      } else {
        setLoginError('Authentication successful, but no User Profile was found.');
      }
    } catch {
      setLoginError('Failed to fetch user profile.');
    } finally {
      setAuthLoading(false);
    }
  }

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



  const handleLogin = async (email: string, password = 'password123') => {
    setAuthLoading(true);
    setLoginError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.session) {
        setSession(data.session);
        const profile = await fetchUserProfile(data.session.user.id);
        if (profile) {
          const role = (profile.role || (profile as any).roleName || 'employee').toLowerCase();
          if (role === 'admin' || role === 'it') {
            router.push('/admin');
          } else if (role === 'manager') {
            router.push('/manager');
          }
        }
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
  if (pathname.includes('/inbox')) { activeTab = 'inbox'; pageTitle = 'Direct Messages'; }
  else if (pathname.includes('/kudos')) { activeTab = 'kudos'; pageTitle = 'Kudos Peer Feed'; }
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
        employee: ['dashboard', 'inbox', 'kudos', 'support', 'coffee', 'privacy', 'settings'],
        manager: ['dashboard', 'inbox', 'manager', 'kudos', 'support', 'coffee', 'privacy', 'settings'],
        admin: ['admin', 'inbox', 'users', 'privacy', 'settings'],
        it: ['admin', 'inbox', 'users', 'privacy', 'settings']
      };

      const allowedTabs = roleConfig[role as keyof typeof roleConfig] || roleConfig['employee'];

      if (!allowedTabs.includes(activeTab)) {
        if (role === 'admin' || role === 'it') router.replace('/admin');
        else if (role === 'manager') router.replace('/manager');
        else router.replace('/');
      }

      // Explicitly close the sidebar on mobile upon successful login or route change
      if (window.innerWidth < 1024) {
        const timer = setTimeout(() => setIsSidebarOpen(false), 0);
        return () => clearTimeout(timer);
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
      <LoginGate
        email={emailInput}
        onEmailChange={setEmailInput}
        password={passwordInput}
        onPasswordChange={setPasswordInput}
        error={loginError}
        onSubmit={handleFormSubmit}
      />
    );
  }

  const setupIncomplete = Boolean(currentUser && !currentUser.phone);

  return (
    <div className={`min-h-screen flex bg-background text-foreground transition-colors duration-300 ${highContrast ? 'high-contrast' : ''}`}>
      {!setupIncomplete && (
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
      )}

      <div className={`flex-1 flex flex-col min-h-screen relative transition-all duration-300 min-w-0 ${setupIncomplete ? '' : (isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72')}`}>
        <Header title={pageTitle} currentUser={currentUser} onLogout={handleLogout} />

        {systemPaused && (
          <div className="w-full bg-red-600 text-white py-3.5 px-6 text-xs font-extrabold flex items-center justify-center gap-2 border-b border-red-750 select-none animate-slide-down">
            <span className="inline-block p-1 bg-red-800 rounded-md">⚠️ SYSTEM PORTAL PAUSED</span>
            <p>Corporate administration has suspended all well-being telemetry org-wide.</p>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-7xl w-full mx-auto">
          <AuthContext.Provider value={{ currentUser, triggerRefresh, session }}>
            {children}
          </AuthContext.Provider>
        </main>
      </div>

      {!systemPaused && !setupIncomplete && (
        <>
          <SentimentWidget onLogSaved={triggerRefresh} />
          <MicroCoachingNudge />
        </>
      )}

      {setupIncomplete && (
        <ProfileSetupDialog
          open={setupIncomplete}
          currentUser={currentUser}
          onSaved={triggerRefresh}
        />
      )}
    </div>
  );
}
