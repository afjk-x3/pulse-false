'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
    ChevronRight,
    UserCog
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

export type TabType = 'dashboard' | 'kudos' | 'support' | 'privacy' | 'coffee' | 'manager' | 'admin' | 'settings' | 'users';

interface SidebarProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    currentUser: any; // Using any during Supabase migration transition
    onLogout: () => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, currentUser, onLogout, isCollapsed, setIsCollapsed }: SidebarProps) {
    const { highContrast } = useAccessibility();

    const fullItems = [
        { id: 'manager' as TabType, label: 'Manager View', icon: Users, desc: 'Team aggregate metrics', roles: ['manager'] },
        { id: 'admin' as TabType, label: 'Admin Control', icon: Sliders, desc: 'System configuration', roles: ['admin', 'it'] },
        { id: 'dashboard' as TabType, label: 'Personal Dashboard', icon: LayoutDashboard, desc: 'View well-being indicators', roles: ['employee', 'manager'] },
        { id: 'users' as TabType, label: 'User Management', icon: UserCog, desc: 'Manage accounts & roles', roles: ['admin', 'it'] },
        { id: 'kudos' as TabType, label: 'Kudos Feed', icon: Award, desc: 'Peer recognition wall', roles: ['employee', 'manager'] },
        { id: 'support' as TabType, label: 'Support Circles', icon: Users, desc: 'Connect with support groups', roles: ['employee', 'manager'] },
        { id: 'coffee' as TabType, label: 'Coffee Roulette', icon: Coffee, desc: 'Social connector matches', roles: ['employee', 'manager'] },
        { id: 'privacy' as TabType, label: 'Privacy Center', icon: Lock, desc: 'Data control and compliance', roles: ['employee', 'manager', 'admin', 'it'] },
        { id: 'settings' as TabType, label: 'Settings', icon: Settings, desc: 'Manage your profile settings', roles: ['employee', 'manager', 'admin', 'it'] },
    ];

    const menuItems = fullItems.filter(item => item.roles.includes(currentUser?.role || currentUser?.roleName)); // fallback to mock DB format if needed

    return (
        <>
            {/* Mobile Sidebar Hamburger Trigger (Floating when sidebar is closed) */}
            <div className="lg:hidden fixed top-4 left-4 z-40">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-2.5 rounded-lg glass-card border border-border-color text-neutral-800 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors shadow-sm ${highContrast ? 'border-black text-black' : ''
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
                className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col border-r transition-all duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${isCollapsed ? 'w-20' : 'w-72'
                    } ${highContrast
                        ? 'border-black glass-card text-black'
                        : 'border-border-color glass-card'
                    }`}
            >
                {/* Sidebar Logo Container */}
                <div className={`p-4 border-b flex items-center justify-between ${highContrast ? 'border-black' : 'border-border-color'
                    }`}>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center w-full justify-center lg:justify-start hover:opacity-80 transition-opacity focus:outline-none rounded"
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {!isCollapsed ? (
                            <div className="flex items-center space-x-2 w-full">
                                <div className="w-10 h-10 flex items-center justify-center text-neutral-700 shrink-0">
                                    <Menu className="w-6 h-6" strokeWidth={2.5} />
                                </div>
                                <div className="relative w-40 h-10 flex items-center select-none shrink-0">
                                    <Image
                                        src="/logo.svg"
                                        alt="Pulse: AxionHR logo"
                                        fill
                                        className="object-contain object-left"
                                        priority
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="w-10 h-10 flex items-center justify-center text-neutral-700">
                                <Menu className="w-6 h-6" strokeWidth={2.5} />
                            </div>
                        )}
                    </button>

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

                        const href = item.id === 'dashboard' ? '/' : `/${item.id}`;

                        return (
                            <Link
                                key={item.id}
                                href={href}
                                onClick={() => {
                                    setIsOpen(false); // Close sidebar on mobile select
                                }}
                                className={`w-full flex items-center transition-all duration-150 focus:outline-none ${isCollapsed ? 'justify-center p-3 rounded-xl' : 'gap-3.5 px-4 py-3 rounded-lg text-left'
                                    } ${buttonStyles}`}
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={`${item.label} - ${item.desc}`}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={`h-5 w-5 shrink-0 ${isActive && !highContrast ? 'text-teal-600' : 'text-neutral-500'
                                    } ${isActive && highContrast ? 'text-white' : ''}`} />
                                {!isCollapsed && (
                                    <div>
                                        <span className="block font-medium leading-none">{item.label}</span>
                                        <span className={`block text-[11px] mt-0.5 font-normal ${isActive
                                            ? (highContrast ? 'text-neutral-200' : 'text-teal-700/80')
                                            : 'text-neutral-400'
                                            }`}>{item.desc}</span>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer Section */}
                <div className={`p-4 border-t text-[11px] text-neutral-400 font-medium space-y-3.5 ${highContrast ? 'border-black text-black' : 'border-border-color'
                    }`}>
                    {/* Sign Out Button */}
                    <button
                        onClick={onLogout}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500 ${isCollapsed ? 'px-0' : 'px-4 gap-2'
                            } ${highContrast
                                ? 'border-black hover:bg-black hover:text-white text-black glass-card'
                                : 'border-border-color hover:bg-neutral-50 text-neutral-600'
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
