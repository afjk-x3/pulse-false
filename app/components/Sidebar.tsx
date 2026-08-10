'use client';

import React from 'react';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Award, 
  Users, 
  Lock, 
  Menu, 
  X,
  Coffee,
  Sliders,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { UserAccount } from '../lib/db';

export type TabType = 'dashboard' | 'kudos' | 'support' | 'privacy' | 'coffee' | 'manager' | 'admin' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentUser: UserAccount;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, currentUser, onLogout, isCollapsed, setIsCollapsed }: SidebarProps) {
  const { highContrast } = useAccessibility();
  
  const fullItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard, desc: 'View well-being indicators', roles: ['employee'] },
    { id: 'manager' as TabType, label: 'Manager View', icon: Users, desc: 'Team aggregate metrics', roles: ['manager'] },
    { id: 'admin' as TabType, label: 'Admin Control', icon: Sliders, desc: 'System configuration', roles: ['admin'] },
    { id: 'kudos' as TabType, label: 'Kudos Feed', icon: Award, desc: 'Peer recognition wall', roles: ['employee', 'manager'] },
    { id: 'support' as TabType, label: 'Support Circles', icon: Users, desc: 'Connect with support groups', roles: ['employee', 'manager'] },
    { id: 'coffee' as TabType, label: 'Coffee Roulette', icon: Coffee, desc: 'Social connector matches', roles: ['employee'] },
    { id: 'privacy' as TabType, label: 'Privacy Center', icon: Lock, desc: 'Data control and compliance', roles: ['employee', 'manager', 'admin'] },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings, desc: 'Manage your profile settings', roles: ['employee', 'manager', 'admin'] },
  ];

  const menuItems = fullItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <>
      {/* Mobile Sidebar Hamburger Trigger (Floating when sidebar is closed) */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors shadow-sm ${
            highContrast ? 'border-black text-black' : ''
          }`}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close sidebar menu" : "Open sidebar menu"}
          aria-controls="sidebar-navigation"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-neutral-900/20 backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        id="sidebar-navigation"
        className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col border-r transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          highContrast 
            ? 'border-black bg-white text-black' 
            : 'border-[#f1f0ea] bg-white'
        }`}
      >
        {/* Sidebar Logo Container */}
        <div className={`p-4 border-b flex items-center justify-between ${
          highContrast ? 'border-black' : 'border-[#f1f0ea]'
        }`}>
          {!isCollapsed ? (
            <>
              <div className="relative w-36 h-10 flex items-center select-none">
                <Image 
                  src="/logo.svg" 
                  alt="Pulse: AxionHR logo" 
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className={`hidden lg:flex p-1.5 rounded-lg border hover:bg-neutral-50 text-neutral-500 transition-all ${
                  highContrast ? 'border-black' : 'border-neutral-200'
                }`}
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center w-full gap-2">
              <div className="relative w-8 h-8 flex items-center select-none">
                <Image 
                  src="/logo-icon.svg" 
                  alt="Pulse logo icon" 
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <button
                onClick={() => setIsCollapsed(false)}
                className={`hidden lg:flex p-1 rounded-lg border hover:bg-neutral-50 text-neutral-500 transition-all ${
                  highContrast ? 'border-black' : 'border-neutral-200'
                }`}
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          
          {/* Close button inside sidebar for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-neutral-100 focus:ring-2 focus:ring-teal-500"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation Menu Items */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            // Standard and high contrast styles for active/inactive menu items
            let buttonStyles = '';
            if (isActive) {
              buttonStyles = highContrast 
                ? 'bg-black text-white border-2 border-black font-bold'
                : 'bg-teal-50/70 border-l-4 border-teal-600 text-teal-900 font-semibold';
            } else {
              buttonStyles = highContrast
                ? 'text-neutral-900 hover:underline hover:bg-neutral-100 border border-transparent'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/80 border-l-4 border-transparent';
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false); // Close sidebar on mobile select
                }}
                className={`w-full flex items-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3.5 px-4 py-3 rounded-lg text-left'
                } ${buttonStyles}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${item.label} - ${item.desc}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${
                  isActive && !highContrast ? 'text-teal-600' : 'text-neutral-500'
                } ${isActive && highContrast ? 'text-white' : ''}`} />
                {!isCollapsed && (
                  <div>
                    <span className="block font-medium leading-none">{item.label}</span>
                    <span className={`block text-[11px] mt-0.5 font-normal ${
                      isActive 
                        ? (highContrast ? 'text-neutral-200' : 'text-teal-700/80') 
                        : 'text-neutral-400'
                    }`}>{item.desc}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Section */}
        <div className={`p-4 border-t text-[11px] text-neutral-400 font-medium space-y-3.5 ${
          highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
        }`}>
          {/* Sign Out Button */}
          <button
            onClick={onLogout}
            className={`w-full py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500 ${
              isCollapsed ? 'px-0' : 'px-4 gap-2'
            } ${
              highContrast
                ? 'border-black hover:bg-black hover:text-white text-black bg-white'
                : 'border-neutral-250 hover:bg-neutral-50 text-neutral-600'
            }`}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4 text-neutral-500 animate-pulse-slow" />
            {!isCollapsed && <span>Sign Out Account</span>}
          </button>

          {!isCollapsed && (
            <>
              <div className="flex items-center justify-between">
                <span>AxionHR WBG v1.0.0</span>
                <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 rounded text-[9px] font-bold">PWA ACTIVE</span>
              </div>
              <p className="leading-tight">Team Privacy Protection: Enabled</p>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
