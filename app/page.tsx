'use client';

import React, { useState, useEffect } from 'react';
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

import { useAccessibility } from './context/AccessibilityContext';
import {
  Heart,
  ThumbsUp,
  Inbox
} from 'lucide-react';
import { PulseDB, UserAccount } from './lib/db';
import Image from 'next/image';

export default function Home() {
  const { highContrast } = useAccessibility();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [loginAccounts, setLoginAccounts] = useState<UserAccount[]>([]);
  const [systemPaused, setSystemPaused] = useState(false);

  // Quick stats states
  const [outboxCount, setOutboxCount] = useState(2);
  const [kudosCount, setKudosCount] = useState(3);
  const [sentimentCount, setSentimentCount] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Sync user directories on mount & refresh triggers
  useEffect(() => {
    const accountsList = PulseDB.getUserAccounts();
    const savedUsername = localStorage.getItem('pulse-current-user');

    const timer = setTimeout(() => {
      setLoginAccounts(accountsList);
      if (savedUsername) {
        const matched = accountsList.find(a => a.username === savedUsername);
        if (matched) {
          setCurrentUser(matched);
          if (matched.role === 'employee') setActiveTab('dashboard');
          else if (matched.role === 'manager') setActiveTab('manager');
          else if (matched.role === 'admin') setActiveTab('admin');
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshTrigger]);

  const handleLogin = (user: UserAccount) => {
    localStorage.setItem('pulse-current-user', user.username);
    setCurrentUser(user);
    if (user.role === 'employee') setActiveTab('dashboard');
    else if (user.role === 'manager') setActiveTab('manager');
    else if (user.role === 'admin') setActiveTab('admin');
    triggerRefresh();
  };

  const handleLogout = () => {
    localStorage.removeItem('pulse-current-user');
    setCurrentUser(null);
    triggerRefresh();
  };

  useEffect(() => {
    const loadConfig = () => {
      const config = PulseDB.getAdminConfig();
      setSystemPaused(config.systemPaused);
    };

    setTimeout(loadConfig, 0);

    const handleStatusChange = () => {
      loadConfig();
      triggerRefresh();
    };

    window.addEventListener('pulse-system-paused-change', handleStatusChange);
    return () => {
      window.removeEventListener('pulse-system-paused-change', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Pulse PWA Service worker registered:', reg.scope))
        .catch((err) => console.error('Pulse PWA Service worker registration failed:', err));
    }
  }, []);

  useEffect(() => {
    // Refresh stats count based on DB
    const outbox = PulseDB.getOutboxMessages().filter(m => m.status === 'scheduled').length;
    const kudos = PulseDB.getKudos().length;
    const sentiment = PulseDB.getSentimentLogs().length;

    setTimeout(() => {
      setOutboxCount(outbox);
      setKudosCount(kudos);
      setSentimentCount(sentiment);
    }, 0);
  }, [refreshTrigger]);

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
      default:
        return 'Pulse Guardian';
    }
  };

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 bg-[#FAF9F6] selection:bg-teal-150 ${highContrast ? 'bg-white text-black' : ''
        }`}>
        <div className="w-full max-w-4xl space-y-8 animate-scale-up">
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
                Enterprise workplace health telemetry, stress risk mitigation, and privacy compliance. Select a dedicated account to sign in:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loginAccounts.map((account) => {
              const isManager = account.role === 'manager';

              let accentColor = 'border-teal-150 text-teal-700 bg-teal-50/50 hover:bg-teal-50';
              let badgeText = 'Employee Telemetry';
              let scopeList = [
                'Local Computer Vision eye/posture tracking',
                'Rolling sentiment SVG trend line charts',
                'Peer Kudos Recognition feed',
                'Pseudonymous chat support circles',
                'Coffee Roulette social pairings'
              ];

              if (isManager) {
                accentColor = 'border-blue-150 text-blue-700 bg-blue-50/50 hover:bg-blue-50';
                badgeText = 'Team Analytics & Health';
                scopeList = [
                  'k-Anonymized aggregate workload charts',
                  'Team Right-to-Disconnect adherence statistics',
                  'Contextual 1:1 conversation starter icebreakers',
                  'Pseudonymous forums moderation access'
                ];
              } else if (account.role === 'admin') {
                accentColor = 'border-orange-150 text-orange-700 bg-orange-50/50 hover:bg-orange-50';
                badgeText = 'IT Settings & Override';
                scopeList = [
                  'Configure standard working hours default',
                  'Manage holiday calendars & org metrics',
                  'Adjust k-anonymity privacy floors',
                  'Emergency "System Paused" red kill switch'
                ];
              }

              return (
                <button
                  key={account.username}
                  onClick={() => handleLogin(account)}
                  className={`p-6 text-left bg-white rounded-2xl border transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500 flex flex-col justify-between h-[360px] ${highContrast ? 'border-black hover:border-2 text-black' : 'border-[#f1f0ea]'
                    }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center text-lg font-bold text-teal-700 border border-neutral-200 shrink-0">
                        {account.avatar}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-neutral-800 leading-tight">{account.name}</h2>
                        <span className="text-[10px] text-neutral-400 font-semibold">{account.title}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider inline-block ${accentColor}`}>
                      {badgeText}
                    </span>

                    <ul className="text-[10px] text-neutral-500 space-y-1.5 list-disc pl-4 leading-normal">
                      {scopeList.map((scope, idx) => (
                        <li key={idx}>{scope}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={`w-full py-2 rounded-xl text-xs font-bold text-center border transition ${highContrast
                      ? 'bg-black text-white hover:bg-neutral-800'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                    }`}>
                    Sign In Account
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center text-[10px] text-neutral-400 font-semibold max-w-sm mx-auto leading-relaxed pt-4">
            🔒 All account configurations and telemetry calculations persist locally in browser LocalStorage. No databases are shared.
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
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-72 relative">
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
                    Welcome back, {currentUser.name.split(' ')[0]}.
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
    </div>
  );
}
