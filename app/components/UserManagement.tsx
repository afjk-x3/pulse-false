'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserCog, Search, ShieldAlert, Plus, Trash2, Power, PowerOff, UserCheck, Check } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { Database } from '../lib/database.types';

export default function UserManagement() {
    const { highContrast } = useAccessibility();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Provisioning States
    const [newFullName, setNewFullName] = useState('');
    const [newJobTitle, setNewJobTitle] = useState('');
    const [newRole, setNewRole] = useState<'employee' | 'manager' | 'admin'>('employee');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [provisionSuccess, setProvisionSuccess] = useState(false);
    const [provisionError, setProvisionError] = useState('');
    
    // Auth User mapping to audit log if needed
    const [currentUser, setCurrentUser] = useState<any>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUsers(data);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleProvision = async (e: React.FormEvent) => {
        e.preventDefault();
        setProvisionError('');
        setProvisionSuccess(false);

        if (!newFullName || !newJobTitle || !newEmail) {
            setProvisionError('Full Name, Job Title, and Work Email are required.');
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            setProvisionError('A temporary password of at least 8 characters is required.');
            return;
        }

        setIsProvisioning(true);
        try {
            let emailToUse = newEmail.trim();
            if (!emailToUse.includes('@')) {
                emailToUse = `${emailToUse}@pulseaxionhr.com`;
            }

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: emailToUse,
                password: newPassword.trim(),
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('User creation failed — no user returned.');

            const parts = newFullName.trim().split(' ');
            const initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'EM';

            const { error: profileError } = await supabase.from('user_profiles').insert({
                id: authData.user.id,
                full_name: newFullName.trim(),
                email: emailToUse,
                job_title: newJobTitle.trim(),
                avatar: initials,
                role: newRole,
                status: 'active',
            });

            if (profileError) throw profileError;

            // Log audit
            if (currentUser) {
                await supabase.from('audit_logs').insert({
                    actor_id: currentUser.id,
                    action: `Provisioned new ${newRole} account: ${emailToUse}`,
                    target: 'user_profiles'
                });
            }

            setProvisionSuccess(true);
            setNewFullName('');
            setNewJobTitle('');
            setNewEmail('');
            setNewPassword('');
            setNewRole('employee');
            fetchUsers();
            setTimeout(() => setProvisionSuccess(false), 4000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Provisioning failed. Please try again.';
            setProvisionError(message);
        } finally {
            setIsProvisioning(false);
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: string, email: string) => {
        const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
        const { error } = await supabase
            .from('user_profiles')
            .update({ status: newStatus })
            .eq('id', userId);
        
        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            if (currentUser) {
                await supabase.from('audit_logs').insert({
                    actor_id: currentUser.id,
                    action: `Changed account status to ${newStatus}: ${email}`,
                    target: 'user_profiles'
                });
            }
        } else {
            alert("Failed to update status.");
        }
    };

    const handleRoleChange = async (userId: string, newRole: string, email: string) => {
        const { error } = await supabase
            .from('user_profiles')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            if (currentUser) {
                await supabase.from('audit_logs').insert({
                    actor_id: currentUser.id,
                    action: `Changed account role to ${newRole}: ${email}`,
                    target: 'user_profiles'
                });
            }
        } else {
            alert("Failed to update role.");
        }
    };

    const handleForceDelete = async (userId: string, email: string) => {
        if (!confirm(`Are you sure you want to PERMANENTLY delete the profile for ${email}? This action cannot be undone.`)) return;

        // Delete profile
        const { error } = await supabase.from('user_profiles').delete().eq('id', userId);
        
        if (!error) {
            setUsers(users.filter(u => u.id !== userId));
            if (currentUser) {
                await supabase.from('audit_logs').insert({
                    actor_id: currentUser.id,
                    action: `Force deleted account profile: ${email}`,
                    target: 'user_profiles'
                });
            }
        } else {
            alert("Failed to delete user profile.");
        }
    };

    const filteredUsers = users.filter(u => 
        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className={`p-6 glass-card rounded-2xl border flex flex-col md:flex-row gap-5 items-start justify-between transition-colors duration-300 ${highContrast ? 'border-black text-black' : 'border-border-color'}`}>
                <div className="space-y-1.5">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <UserCog className="h-5.5 w-5.5 text-teal-600" />
                        <span>User Management Center</span>
                    </h2>
                    <p className="text-xs text-neutral-500 leading-relaxed max-w-2xl">
                        Provision new employee accounts, manage roles, and enforce account suspensions or deletions org-wide.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min mb-6">
                
                {/* Users Directory Table */}
                <div className={`p-6 glass-card rounded-2xl border md:col-span-2 xl:col-span-2 space-y-5 transition-colors duration-300 ${highContrast ? 'border-black text-black' : 'border-border-color'}`}>
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b pb-4 border-neutral-100">
                        <h3 className="text-sm font-bold text-neutral-800">Org Directory</h3>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                            <input 
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-12 flex justify-center"><div className="w-4 h-4 rounded-full bg-teal-400 animate-pulse" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-neutral-100 text-neutral-400 font-bold uppercase tracking-wider">
                                        <th className="pb-3 px-2">Employee</th>
                                        <th className="pb-3 px-2">Role</th>
                                        <th className="pb-3 px-2 text-center">Status</th>
                                        <th className="pb-3 px-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-neutral-400 font-medium">No users found matching "{searchQuery}"</td>
                                        </tr>
                                    ) : filteredUsers.map((u) => (
                                        <tr key={u.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                                            <td className="py-3 px-2">
                                                <div className="flex items-center gap-3">
                                                    {u.avatar && u.avatar.length > 5 ? (
                                                        <img src={u.avatar} alt={u.full_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0 overflow-hidden text-[10px]">
                                                            {(u.avatar && u.avatar.length <= 3) ? u.avatar : (u.full_name?.substring(0, 2).toUpperCase() || 'U')}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-neutral-800 truncate max-w-[150px]">{u.full_name}</div>
                                                        <div className="text-[10px] text-neutral-500 truncate max-w-[150px]">{u.email} • {u.job_title}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value, u.email)}
                                                    className="bg-transparent border border-neutral-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-teal-500"
                                                >
                                                    <option value="employee">Employee</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="it">IT</option>
                                                </select>
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'active' ? 'bg-teal-100 text-teal-800' : 'bg-neutral-200 text-neutral-600'}`}>
                                                    {(u.status || 'active').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-right space-x-1.5 whitespace-nowrap">
                                                <button 
                                                    onClick={() => handleToggleStatus(u.id, u.status || 'active', u.email)}
                                                    className={`p-1.5 rounded transition-colors ${u.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-teal-600 hover:bg-teal-50'}`}
                                                    title={u.status === 'active' ? "Disable Account" : "Enable Account"}
                                                >
                                                    {u.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                </button>
                                                <button 
                                                    onClick={() => handleForceDelete(u.id, u.email)}
                                                    className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Force Delete Account"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Provisioning Form Panel */}
                <div className={`p-6 glass-card rounded-2xl border space-y-5 flex flex-col transition-colors duration-300 ${highContrast ? 'border-black text-black' : 'border-border-color'}`}>
                    <div className="space-y-1 border-b pb-3 border-neutral-100">
                        <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                            <Plus className="h-4 w-4 text-teal-600" />
                            Admin Provisioning
                        </h3>
                        <p className="text-[10px] text-neutral-500 leading-relaxed">
                            Bypass standard SSO logic to force-provision employee accounts into the WBG database.
                        </p>
                    </div>

                    <form onSubmit={handleProvision} className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-3 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">Full Legal Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Sarah Connor"
                                    value={newFullName}
                                    onChange={(e) => setNewFullName(e.target.value)}
                                    className={`w-full p-2.5 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-border-color'}`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. UX Engineer"
                                    value={newJobTitle}
                                    onChange={(e) => setNewJobTitle(e.target.value)}
                                    className={`w-full p-2.5 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-border-color'}`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">Account Role</label>
                                <select
                                    required
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as 'employee' | 'manager' | 'admin')}
                                    className={`w-full p-2.5 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-border-color'}`}
                                >
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">Email Address</label>
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        required
                                        placeholder="sarah"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className={`flex-1 p-2.5 rounded-l-lg border border-r-0 text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-border-color'}`}
                                    />
                                    <span className={`p-2.5 rounded-r-lg border border-l-0 text-xs bg-neutral-50 text-neutral-500 font-semibold ${highContrast ? 'border-black' : 'border-border-color'}`}>
                                        @pulseaxionhr.com
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 mb-1">Temporary Password <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Minimum 8 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={`w-full p-2.5 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ? 'border-black' : 'border-border-color'}`}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            {provisionError && (
                                <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-700 flex items-start gap-1 font-semibold">
                                    <ShieldAlert className="h-3.5 w-3.5 mt-0.5" /> <span>{provisionError}</span>
                                </div>
                            )}
                            {provisionSuccess && (
                                <div className="mb-3 p-2 bg-teal-50 border border-teal-150 rounded text-[10px] text-teal-850 flex items-start gap-1 font-semibold">
                                    <UserCheck className="h-3.5 w-3.5 mt-0.5" /> <span>Account provisioned successfully!</span>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={isProvisioning}
                                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed ${highContrast ? 'bg-black text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                            >
                                <Plus className="h-4.5 w-4.5" />
                                <span>{isProvisioning ? 'Provisioning...' : 'Provision Profile'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
