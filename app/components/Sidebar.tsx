'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    LayoutDashboard,
    Award,
    Users,
    Lock,
    Coffee,
    Sliders,
    Settings,
    UserCog,
    MessageCircle
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

export type TabType = 'dashboard' | 'inbox' | 'kudos' | 'support' | 'privacy' | 'coffee' | 'manager' | 'admin' | 'settings' | 'users';

const AnimatedHamburger = ({ active }: { active: boolean }) => (
    <div className={`relative w-6 h-[14px] flex flex-col justify-between items-end transition-transform duration-300 ease-in-out ${active ? '-rotate-180' : ''}`}>
        <span className={`h-[2px] bg-current rounded-full transition-all duration-300 ease-out origin-right ${active ? 'w-3.5 -rotate-45 translate-y-1.5' : 'w-6'}`}></span>
        <span className={`h-[2px] bg-current rounded-full transition-all duration-300 ease-out ${active ? 'w-6' : 'w-6'}`}></span>
        <span className={`h-[2px] bg-current rounded-full transition-all duration-300 ease-out origin-right ${active ? 'w-3.5 rotate-45 -translate-y-1.5' : 'w-6'}`}></span>
    </div>
);

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

export default function Sidebar({ activeTab, isOpen, setIsOpen, currentUser, isCollapsed, setIsCollapsed }: SidebarProps) {
    const { highContrast } = useAccessibility();

    const fullItems = [
        { id: 'manager' as TabType, label: 'Manager View', icon: Users, desc: 'Team aggregate metrics', roles: ['manager'] },
        { id: 'admin' as TabType, label: 'Admin Control', icon: Sliders, desc: 'System configuration', roles: ['admin', 'it'] },
        { id: 'dashboard' as TabType, label: 'Personal Dashboard', icon: LayoutDashboard, desc: 'View well-being indicators', roles: ['employee', 'manager'] },
        { id: 'inbox' as TabType, label: 'Direct Messages', icon: MessageCircle, desc: 'Secure internal chat & outbox', roles: ['employee', 'manager', 'admin', 'it'] },
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
            {/* Mobile Sidebar Hamburger Trigger (Always rendered for animation) */}
            <div className="lg:hidden fixed top-4 left-4 z-[65]">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-neutral-800 transition-colors focus:outline-none [-webkit-tap-highlight-color:transparent] ${highContrast ? 'border border-black text-black' : 'border border-transparent'}`}
                    aria-expanded={isOpen}
                    aria-label="Toggle sidebar menu"
                >
                    <AnimatedHamburger active={isOpen} />
                </button>
            </div>

            {/* Mobile Backdrop Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-[55] bg-neutral-900/20 backdrop-blur-xs transition-opacity"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Main Sidebar Drawer */}
            <aside
                id="sidebar-navigation"
                className={`fixed top-0 bottom-0 left-0 z-[60] flex flex-col border-r transition-all duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${isCollapsed ? 'w-20' : 'w-72'
                    } ${highContrast
                        ? 'border-black bg-white text-black'
                        : 'border-border-color bg-white'
                    }`}
            >
                {/* Sidebar Logo Container */}
                <div className={`h-20 px-4 border-b flex items-center justify-between ${highContrast ? 'border-black' : 'border-border-color'
                    }`}>
                    <button
                        onClick={() => {
                            if (window.innerWidth < 1024) {
                                setIsOpen(false);
                            } else {
                                setIsCollapsed(!isCollapsed);
                            }
                        }}
                        className="flex items-center w-full justify-center lg:justify-start focus:outline-none rounded [-webkit-tap-highlight-color:transparent]"
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <div className="flex items-center w-full">
                            <div className="w-10 h-10 flex items-center justify-center text-neutral-700 shrink-0">
                                <div className="hidden lg:block"><AnimatedHamburger active={!isCollapsed} /></div>
                            </div>
                            <div className={`relative h-10 flex items-center select-none shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-40 opacity-100 ml-2'}`}>
                                <Image
                                    src="/logo.svg"
                                    alt="Pulse: AxionHR logo"
                                    fill
                                    className="object-contain object-left"
                                    priority
                                />
                            </div>
                        </div>
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
                    {/* Footer Info */}                    {!isCollapsed && (
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
