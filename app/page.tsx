'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import Header from './components/Header';
import SentimentWidget from './components/SentimentWidget';
import BurnoutRiskIndex from './components/BurnoutRiskIndex';
import KAnonymityEmptyState from './components/KAnonymityEmptyState';
import RightToDisconnectOutbox from './components/RightToDisconnectOutbox';
import MicroCoachingNudge from './components/MicroCoachingNudge';
import KudosFeed from './components/KudosFeed';
import SupportCircles from './components/SupportCircles';
import PrivacyCenter from './components/PrivacyCenter';
import SentimentTrendLine from './components/SentimentTrendLine';
import BRIExplainerCard from './components/BRIExplainerCard';
import CoffeeRoulette from './components/CoffeeRoulette';
import ManagerDashboard from './components/ManagerDashboard';
import AdminConsole from './components/AdminConsole';
import CalendarGuard from './components/CalendarGuard';
import BRIExplanationFeed from './components/BRIExplanationFeed';
import SettingsView from './components/SettingsView';

import { useAccessibility } from './context/AccessibilityContext';
import { Heart, ThumbsUp, Inbox } from 'lucide-react';
import Image from 'next/image';
import { supabase } from './lib/supabaseClient';

export default function Home() {
  const { highContrast } = useAccessibility();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loginAccounts, setLoginAccounts] = useState<any[]>([]);
  const [systemPaused, setSystemPaused] = useState(false);
  
  const [authLoading, setAuthLoading] = useState(true);

  // Quick stats states
  const [outboxCount, setOutboxCount] = useState(0);
  const [kudosCount, setKudosCount] = useState(0);
  const [sentimentCount, setSentimentCount] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Sync auth state
  useEffect(() => {
    console.log('[Auth] Effect running, getting session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] getSession resolved:', session?.user?.id);
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    console.log('[Auth] Setting up onAuthStateChange listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] onAuthStateChange fired:', _event, session?.user?.id);
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
    console.log('[Auth] fetchUserProfile called for:', userId);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log('[Auth] fetchUserProfile result:', { data, error });
      if (data) {
        setCurrentUser(data);
        if (data.role === 'employee') setActiveTab('dashboard');
        else if (data.role === 'manager') setActiveTab('manager');
        else if (data.role === 'admin' || data.role === 'it') setActiveTab('admin');
      } else {
        setLoginError('Authentication successful, but no User Profile was found. Please run the SQL script to create your profile.');
      }
    } catch (e) {
      console.error('[Auth] Failed to fetch user profile exception:', e);
      setLoginError('Failed to fetch user profile from database.');
    } finally {
      console.log('[Auth] fetchUserProfile finally: setting authLoading to false');
      setAuthLoading(false);
    }
  }

  // Fetch users list for quick sign in
  useEffect(() => {
    if (!session) {
      const fetchAccountsForQuickSignIn = async () => {
        const { data } = await supabase.from('user_profiles').select('*').limit(6);
        if (data) setLoginAccounts(data);
      };
      fetchAccountsForQuickSignIn();
    }
  }, [session]);

  const handleLogin = async (email: string, password = 'password123') => {
    setAuthLoading(true);
    setLoginError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      // Explicitly set session and fetch profile to prevent infinite loading if the auth listener misses the event
      if (data?.session) {
        setSession(data.session);
        await fetchUserProfile(data.session.user.id);
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Login failed');
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Global Config loading (System paused)
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.from('admin_configs').select('emergency_kill_switch').limit(1).single();
      if (data) {
        setSystemPaused(data.emergency_kill_switch);
      }
    };
    loadConfig();

    const handleStatusChange = () => {
      loadConfig();
      triggerRefresh();
    };
    window.addEventListener('pulse-system-paused-change', handleStatusChange);
    return () => {
      window.removeEventListener('pulse-system-paused-change', handleStatusChange);
    };
  }, [triggerRefresh]);

  // Dashboard Stats loading
  useEffect(() => {
    if (!session) return;
    const fetchStats = async () => {
      try {
        const [outboxRes, kudosRes, sentimentRes] = await Promise.all([
          supabase.from('outbox_messages').select('id', { count: 'exact' }).eq('sender_id', session.user.id).eq('status', 'queued'),
          supabase.from('kudos_posts').select('id', { count: 'exact' }),
          supabase.from('mood_logs').select('id', { count: 'exact' }).eq('user_id', session.user.id)
        ]);

        setOutboxCount(outboxRes.count || 0);
        setKudosCount(kudosRes.count || 0);
        setSentimentCount(sentimentRes.count || 0);
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, [refreshTrigger, session]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Pulse PWA Service worker registered:', reg.scope))
        .catch((err) => console.error('Pulse PWA Service worker registration failed:', err));
    }
  }, []);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Guardian Dashboard';
      case 'kudos':
        return 'Kudos Peer Feed';
      case 'support':
        return 'Support Circles Forum';
      case 'privacy':
        return 'Privacy & Data Governance';
      case 'coffee':
        return 'Coffee Roulette Connector';
      case 'manager':
        return 'Manager Team Overview';
      case 'admin':
        return 'HR/IT Admin Console';
      case 'settings':
        return 'Profile Settings';
      default:
        return 'Pulse Guardian';
    }
  };

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!emailInput || !passwordInput) {
      setLoginError('Please enter both email and password.');
      return;
    }

    handleLogin(emailInput, passwordInput);
  };

  console.log('[Render] authLoading:', authLoading, 'currentUser:', !!currentUser, 'session:', !!session);

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 bg-[#FAF9F6] selection:bg-teal-150 ${highContrast ? 'bg-white text-black' : ''}`}>
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
      <div className={`min-h-screen flex items-center justify-center p-6 bg-[#FAF9F6] selection:bg-teal-150 ${highContrast ? 'bg-white text-black' : ''
        }`}>
        <div className="w-full max-w-5xl space-y-8 animate-scale-up">
          <div className="text-center space-y-3.5">
            <div className="relative w-48 h-14 mx-auto select-none">
              <Image
                src="/logo.svg"
                alt="Pulse: AxionHR WBG Logo"
                fill
                className="object-contain animate-pulse-slow"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-800 tracking-tight sm:text-2xl">
                Well-Being Guardian WBG Portal
              </h1>
              <p className="text-xs text-neutral-400 font-semibold max-w-md mx-auto leading-relaxed mt-1">
                Enterprise workplace health telemetry, stress risk mitigation, and privacy compliance.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-8 items-center">
            {/* Login Form (Centered) */}
            <div className={`w-full max-w-md p-6 bg-white rounded-2xl border flex flex-col gap-4 ${
              highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
            }`}>
              <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Sign In</h2>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-bold text-neutral-700 mb-1">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="e.g. alex.rivera@axionhr.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                      highContrast ? 'border-black' : 'border-neutral-200'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs font-bold text-neutral-700 mb-1">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                      highContrast ? 'border-black' : 'border-neutral-200'
                    }`}
                    required
                  />
                </div>

                {loginError && (
                  <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-750 font-semibold animate-fade-in">
                    ⚠️ {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-center border transition ${
                    highContrast
                      ? 'bg-black text-white hover:bg-neutral-800'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                  }`}
                >
                  Sign In
                </button>
              </form>
            </div>

            {/* Quick Sign-In (Temporary) Below */}
            {loginAccounts.length > 0 && (
              <div className="w-full max-w-4xl space-y-4 pt-4 border-t border-neutral-200/50">
                <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider text-center">
                  Quick Sign-In Shortcuts (Temporary)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {loginAccounts.map((account) => {
                    const isManager = account.role === 'Manager';
                    const isAdmin = account.role === 'Admin' || account.role === 'IT';

                    let accentColor = 'border-teal-150 text-teal-700 bg-teal-50/50 hover:bg-teal-50';
                    let badgeText = 'Employee Telemetry';
                    let scopeList = [
                      'Local Computer Vision eye/posture tracking',
                      'Rolling sentiment SVG trend line charts',
                      'Peer Kudos Recognition feed'
                    ];

                    if (isManager) {
                      accentColor = 'border-blue-150 text-blue-700 bg-blue-50/50 hover:bg-blue-50';
                      badgeText = 'Team Analytics';
                      scopeList = [
                        'k-Anonymized aggregate workload charts',
                        'Right-to-Disconnect adherence statistics'
                      ];
                    } else if (isAdmin) {
                      accentColor = 'border-orange-150 text-orange-700 bg-orange-50/50 hover:bg-orange-50';
                      badgeText = 'IT Settings & Override';
                      scopeList = [
                        'Adjust privacy floors & standard hours',
                        'Emergency "System Paused" red kill switch'
                      ];
                    }

                    return (
                      <button
                        key={account.id}
                        onMouseDown={() => handleLogin(account.email, 'password123')}
                        className={`p-4 text-left bg-white rounded-2xl border transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500 flex flex-col justify-between h-[230px] ${highContrast ? 'border-black hover:border-2 text-black' : 'border-[#f1f0ea]'
                          }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-teal-700 border border-neutral-200 shrink-0">
                              {account.avatar || account.full_name?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div className="truncate">
                              <h2 className="text-xs font-bold text-neutral-800 leading-tight truncate">{account.full_name}</h2>
                              <span className="text-[9px] text-neutral-400 font-semibold truncate">{account.job_title}</span>
                            </div>
                          </div>

                          <span className={`px-1.5 py-0.5 border rounded text-[8px] font-bold uppercase tracking-wider inline-block ${accentColor}`}>
                            {badgeText}
                          </span>

                          <ul className="text-[9px] text-neutral-500 space-y-1 list-disc pl-3 leading-normal">
                            {scopeList.map((scope, idx) => (
                              <li key={idx}>{scope}</li>
                            ))}
                          </ul>
                        </div>

                        <div className={`w-full py-1.5 rounded-lg text-[10px] font-bold text-center border transition ${highContrast
                            ? 'bg-black text-white hover:bg-neutral-800'
                            : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                          }`}>
                          Quick Sign In
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] text-neutral-400 font-semibold max-w-sm mx-auto leading-relaxed pt-4">
            🔒 Uses Supabase Auth layer. Default test user passwords are 'password123'.
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className={`min-h-screen flex bg-[#FAF9F6] selection:bg-teal-150 ${highContrast ? 'bg-white text-black' : ''
      }`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Container */}
      <div className={`flex-1 flex flex-col min-h-screen relative transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      }`}>
        <Header
          title={getPageTitle()}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Global System Paused Warning Banner */}
        {systemPaused && (
          <div className="w-full bg-red-600 text-white py-3.5 px-6 text-xs font-extrabold flex items-center justify-center gap-2 border-b border-red-750 select-none animate-slide-down">
            <span className="inline-block p-1 bg-red-800 rounded-md">⚠️ SYSTEM PORTAL PAUSED</span>
            <p>
              Corporate administration has suspended all well-being telemetry, camera processing, and coaching reminders org-wide.
            </p>
          </div>
        )}

        {/* Scrollable Main View Content */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              {/* Welcome Banner Card */}
              <div className={`p-6 bg-white rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 ${highContrast ? 'border-black' : 'border-[#f1f0ea]'
                }`}>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-neutral-800">
                    Welcome back, {currentUser.full_name?.split(' ')[0]}.
                  </h2>
                  <p className="text-xs text-neutral-500 max-w-lg leading-relaxed">
                    AxionHR Well-Being Guardian is monitoring locally. Your data is 100% private, anonymous, and encrypted inside this browser sandbox.
                  </p>
                </div>

                {/* Micro Analytics Banner Row */}
                <div className="flex flex-wrap gap-4 shrink-0">
                  <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50/50 border border-neutral-100 flex items-center gap-2 text-xs">
                    <Inbox className="h-4.5 w-4.5 text-teal-600" />
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold uppercase">Queued Mail</span>
                      <span className="font-bold text-neutral-700">{outboxCount} locked</span>
                    </div>
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50/50 border border-neutral-100 flex items-center gap-2 text-xs">
                    <ThumbsUp className="h-4.5 w-4.5 text-teal-600" />
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold uppercase">Kudos Shared</span>
                      <span className="font-bold text-neutral-700">{kudosCount} notes</span>
                    </div>
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50/50 border border-neutral-100 flex items-center gap-2 text-xs">
                    <Heart className="h-4.5 w-4.5 text-teal-600" />
                    <div>
                      <span className="block text-[10px] text-neutral-400 font-semibold uppercase">Sentiment Checks</span>
                      <span className="font-bold text-neutral-700">{sentimentCount} logs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Dashboard Widgets (Focus Dimming active inside this wrapper) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 focus-dimming-active items-start">
                
                {/* Left Column: Primary Focus / Wider (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* 7-Day Burnout Risk heatmap */}
                  <div className="focus-dimming-card">
                    <BurnoutRiskIndex
                      onNavigateToTab={setActiveTab}
                      refreshTrigger={refreshTrigger}
                    />
                  </div>

                  {/* Sentiment Trend Line chart */}
                  <div className="focus-dimming-card">
                    <SentimentTrendLine refreshTrigger={refreshTrigger} />
                  </div>

                  {/* Team Workload / k-Anonymity privacy state */}
                  <div className="focus-dimming-card">
                    <KAnonymityEmptyState />
                  </div>

                  {/* Calendar Guard (Moved to left column to balance vertical height) */}
                  <div className="focus-dimming-card">
                    <CalendarGuard />
                  </div>
                </div>

                {/* Right Column: Secondary / Actionable (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* GBDT Factor attribution explainer card */}
                  <div className="focus-dimming-card">
                    <BRIExplainerCard />
                  </div>
                  
                  {/* BRI Explanation Feed */}
                  <div className="focus-dimming-card flex-1">
                    <BRIExplanationFeed refreshTrigger={refreshTrigger} />
                  </div>

                  {/* Right-to-Disconnect Queue */}
                  <div className="focus-dimming-card">
                    <RightToDisconnectOutbox
                      onRefreshStats={triggerRefresh}
                      refreshTrigger={refreshTrigger}
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'kudos' && (
            <div className="animate-fade-in">
              <KudosFeed />
            </div>
          )}

          {activeTab === 'support' && (
            <div className="animate-fade-in">
              <SupportCircles />
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="animate-fade-in">
              <PrivacyCenter />
            </div>
          )}

          {activeTab === 'coffee' && (
            <div className="animate-fade-in">
              <CoffeeRoulette />
            </div>
          )}

          {activeTab === 'manager' && (
            <div className="animate-fade-in">
              <ManagerDashboard />
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="animate-fade-in">
              <AdminConsole />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <SettingsView currentUser={currentUser} onUserUpdated={triggerRefresh} />
            </div>
          )}
        </main>
      </div>

      {/* Floating widgets rendered ONLY when the system telemetry is not paused by admin */}
      {!systemPaused && (
        <>
          {/* Floating Sentiment Widget Bottom Right */}
          <SentimentWidget onLogSaved={triggerRefresh} />

          {/* Floating Micro-Coaching Nudge Overlay Bottom Left */}
          <MicroCoachingNudge />
        </>
      )}

      {/* First-Time Profile Setup Blocking Modal */}
      {currentUser && !currentUser.phone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-md p-4">
          <div className={`w-full max-w-lg p-6 bg-white rounded-2xl border shadow-xl flex flex-col gap-4 ${
            highContrast ? 'border-black text-black bg-white font-bold' : 'border-neutral-200'
          }`}>
            <div>
              <h2 className="text-lg font-bold text-neutral-800">Complete Your Profile Setup</h2>
              <p className="text-xs text-neutral-500 mt-1">First-time login setup: Please verify and fill out your required profile information to access the WBG portal.</p>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const pName = formData.get('name') as string;
              const pPhone = formData.get('phone') as string;
              const pAddress = formData.get('address') as string;
              
              if(pName && pPhone) {
                try {
                  const { error } = await supabase
                    .from('user_profiles')
                    .update({
                      full_name: pName.trim(),
                      phone: pPhone.trim(),
                      address: pAddress ? pAddress.trim() : null
                    })
                    .eq('id', currentUser.id);
                  if (error) throw error;
                  triggerRefresh();
                } catch (e) {
                  console.error(e);
                  alert('Failed to save profile setup.');
                }
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Full Name *</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={currentUser.full_name}
                  required
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Work Email Address (Read-only)</label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  readOnly
                  className="w-full p-2.5 rounded-lg border text-xs bg-neutral-50 text-neutral-500 border-neutral-200 cursor-not-allowed font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Phone Number *</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="e.g. +1 (555) 019-2834"
                  required
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Residential Address (Optional)</label>
                <input
                  name="address"
                  type="text"
                  placeholder="e.g. 123 Elm St, Springfield, IL"
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  highContrast 
                    ? 'bg-black text-white hover:bg-neutral-800' 
                    : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                }`}
              >
                Access Portal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
