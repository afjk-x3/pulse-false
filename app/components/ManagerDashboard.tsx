'use client';

import React, { useState, useEffect } from 'react';
import { Users, EyeOff, ArrowRight, ShieldCheck, UserCheck, Plus, ShieldAlert, TrendingUp } from 'lucide-react';
import { PulseDB, UserAccount } from '../lib/db';
import { useAccessibility } from '../context/AccessibilityContext';

export default function ManagerDashboard() {
  const { highContrast } = useAccessibility();
  
  // Local states
  const [responseCount, setResponseCount] = useState(3);
  const [kanonFloor, setKanonFloor] = useState(5);

  // Onboarding states
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [provisionSuccess, setProvisionSuccess] = useState(false);

  // Shared trends
  const [sharedTrends, setSharedTrends] = useState<{ name: string; avatar: string; data: number[] }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const config = PulseDB.getAdminConfig();
      setKanonFloor(config.kanonymityFloor);
      setAccounts(PulseDB.getUserAccounts());

      // Check if any employee has shared their BRI
      const isShared = localStorage.getItem('pulse-bri-share-manager') === 'true';
      if (isShared) {
        const riskData = PulseDB.getBurnoutRiskIndex();
        // Only show for Alex (the employee who can toggle share)
        const scores = riskData.map((d: { score: number }) => d.score);
        setSharedTrends([{ name: 'Alex Rivera', avatar: 'AR', data: scores }]);
      } else {
        setSharedTrends([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setProvisionSuccess(false);

    if (!newName || !newTitle || !newEmail || !newUsername) {
      setErrorMessage('All fields are required.');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(newUsername)) {
      setErrorMessage('Username contains invalid characters. Use alphanumeric, dot, dash, or underscore.');
      return;
    }

    const parts = newName.trim().split(' ');
    const initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'EM';

    const newAccount: UserAccount = {
      username: newUsername.trim().toLowerCase(),
      name: newName.trim(),
      role: 'employee',
      roleName: 'Employee',
      avatar: initials,
      title: newTitle.trim(),
      email: newEmail.trim(),
      password: newPassword.trim() || undefined
    };

    const added = PulseDB.addUserAccount(newAccount);
    if (!added) {
      setErrorMessage('Username is already taken by another account.');
      return;
    }

    setProvisionSuccess(true);
    setAccounts(PulseDB.getUserAccounts());
    setNewName('');
    setNewTitle('');
    setNewEmail('');
    setNewUsername('');
    setNewPassword('');
    setTimeout(() => setProvisionSuccess(false), 4000);
  };

  const prompts = [
    { text: "Your team's off-hours messaging rate increased by 12% this week. Consider reviewing sprint scopes.", tag: "Right-to-Disconnect" },
    { text: "Burnout indicators suggest elevated screen times. Try starting meetings with a 2-minute posture check.", tag: "Health Habits" },
    { text: "Kudos activity is high! Commend the team for strong peer appreciation in your next sync.", tag: "Recognition" },
  ];

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className={`p-6 bg-white rounded-2xl border flex flex-col md:flex-row gap-5 items-start justify-between ${
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}>
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2">
            <Users className="h-5.5 w-5.5 text-teal-600" />
            <span>Manager Team Dashboard</span>
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-2xl">
            A k-anonymized aggregate view of team-level workload, disconnect boundaries, and recognition health. To protect employee privacy, no individual logs or details are visible.
          </p>
        </div>

        {/* Cohort size simulation controls */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="manager-cohort" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            Simulate Submissions:
          </label>
          <div className="inline-flex rounded-lg p-0.5 bg-neutral-100 border border-neutral-200">
            <button
              onClick={() => setResponseCount(3)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                responseCount < kanonFloor
                  ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Small ({responseCount < kanonFloor ? responseCount : 3})
            </button>
            <button
              onClick={() => setResponseCount(kanonFloor + 2)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                responseCount >= kanonFloor
                  ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Large ({kanonFloor + 2})
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Workload & Wellbeing Trend (2 cols) */}
        <div className={`p-6 bg-white rounded-2xl border relative overflow-hidden lg:col-span-2 min-h-[300px] flex flex-col justify-between ${
          highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
        }`}>
          <div>
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              Team Burnout Risk Index (Weekly Average)
            </span>
            
            {/* Chart area */}
            <div className={`h-48 w-full flex items-end justify-between px-4 pb-4 border-b border-neutral-100 transition-all duration-500 ${
              responseCount < kanonFloor ? 'blur-md pointer-events-none select-none opacity-40' : 'blur-none opacity-100'
            }`}>
              {/* Simulated bars */}
              {[
                { date: 'Mon', val: 38 },
                { date: 'Tue', val: 42 },
                { date: 'Wed', val: 32 },
                { date: 'Thu', val: 56 },
                { date: 'Fri', val: 40 },
                { date: 'Sat', val: 15 },
                { date: 'Sun', val: 12 },
              ].map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-8 bg-teal-600 rounded-t-md transition-all duration-1000" style={{ height: `${bar.val * 2}px` }} />
                  <span className="text-[9px] font-bold text-neutral-400">{bar.date}</span>
                </div>
              ))}
            </div>

            {/* k-Anonymity overlay */}
            {responseCount < kanonFloor && (
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md bg-white/70 animate-fade-in"
                role="alert"
              >
                <div className="h-10 w-10 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-500 flex items-center justify-center mb-3">
                  <EyeOff className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold text-neutral-800 mb-1">
                  Insufficient data to protect team privacy
                </h3>
                <p className="text-[10px] text-neutral-400 max-w-xs leading-normal">
                  Minimum of <span className="font-bold text-neutral-600">{kanonFloor} responses</span> required. Current active cohort submissions: <span className="font-bold text-neutral-700">{responseCount}</span>.
                </p>
              </div>
            )}
          </div>

          <div className="text-[10px] text-neutral-400 mt-4">
            k-Anonymity compliance constraint: <strong>k={kanonFloor} floor active</strong>. Setting managed by System Administrator.
          </div>
        </div>

        {/* Right-to-Disconnect adherence (1 col) */}
        <div className={`p-6 bg-white rounded-2xl border flex flex-col justify-between ${
          highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
        }`}>
          <div className="space-y-4">
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Right-to-Disconnect Adherence Rate
            </span>

            <div className="text-center py-6">
              <span className="text-4xl font-extrabold text-teal-600">82%</span>
              <span className="block text-[10px] text-neutral-400 mt-1.5 font-bold uppercase tracking-wider">
                Healthy Boundary Score
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1">
                  <span>After-hours Messages Composed</span>
                  <span>18 total</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="w-[82%] h-full bg-teal-600 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1">
                  <span>Send Overrides Auths Logged</span>
                  <span>3 overrides</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="w-[15%] h-full bg-orange-600 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100 text-[10px] leading-normal text-neutral-400 flex items-start gap-1">
            <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <p>Adherence metrics only measure total volumes; sender identities are scrubbed.</p>
          </div>
        </div>
      </div>

      {/* Account Provisioning & Employee Directory Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Onboarding Form Card (1 col) */}
        <div className={`p-6 bg-white rounded-2xl border flex flex-col justify-between ${
          highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
        }`}>
          <form onSubmit={handleProvision} className="space-y-4">
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Employee Account Provisioning
            </span>

            <p className="text-xs text-neutral-500 leading-relaxed">
              Create a new secure employee profile. Once provisioned, the user is immediately added to the system and can select their account on the login portal.
            </p>

            <div className="space-y-3 pt-2">
              {/* Full Name */}
              <div>
                <label htmlFor="provision-name" className="block text-[10px] font-bold text-neutral-700 mb-1">
                  Employee Full Name
                </label>
                <input
                  id="provision-name"
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    const suggested = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                    setNewUsername(suggested);
                  }}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              {/* Title */}
              <div>
                <label htmlFor="provision-title" className="block text-[10px] font-bold text-neutral-700 mb-1">
                  Job Title
                </label>
                <input
                  id="provision-title"
                  type="text"
                  required
                  placeholder="e.g. UX Engineer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="provision-email" className="block text-[10px] font-bold text-neutral-700 mb-1">
                  Work Email Address
                </label>
                <input
                  id="provision-email"
                  type="email"
                  required
                  placeholder="e.g. sarah@axionhr.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              {/* Username */}
              <div>
                <label htmlFor="provision-username" className="block text-[10px] font-bold text-neutral-700 mb-1">
                  Unique Username (System Login)
                </label>
                <input
                  id="provision-username"
                  type="text"
                  required
                  placeholder="e.g. sarah"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              {/* Temporary Password */}
              <div>
                <label htmlFor="provision-password" className="block text-[10px] font-bold text-neutral-700 mb-1">
                  Temporary Password (Optional)
                </label>
                <input
                  id="provision-password"
                  type="text"
                  placeholder="e.g. Welcome123!"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>
            </div>

            {/* Notifications */}
            {errorMessage && (
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-750 flex items-start gap-1.5 font-semibold leading-normal animate-fade-in">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {provisionSuccess && (
              <div className="p-2.5 bg-teal-50 border border-teal-150 rounded-lg text-[10px] text-teal-850 flex items-start gap-1.5 font-semibold leading-normal animate-fade-in">
                <UserCheck className="h-4.5 w-4.5 text-teal-600 shrink-0 mt-0.5" />
                <span>Account provisioned! This user can now sign in from the login page.</span>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-4 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                highContrast
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
              }`}
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Provision Profile</span>
            </button>
          </form>
        </div>

        {/* Directory List Card (2 cols) */}
        <div className={`p-6 bg-white rounded-2xl border flex flex-col justify-between xl:col-span-2 ${
          highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
        }`}>
          <div className="space-y-4 w-full">
            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Active Employee Directory
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 font-semibold">
                    <th className="py-2.5">Avatar</th>
                    <th className="py-2.5">Name</th>
                    <th className="py-2.5">Job Title</th>
                    <th className="py-2.5">Email</th>
                    <th className="py-2.5">Username</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {accounts.map((user) => (
                    <tr key={user.username} className="hover:bg-neutral-50/50 transition">
                      <td className="py-3">
                        <div className="h-7 w-7 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-[10px]">
                          {user.avatar}
                        </div>
                      </td>
                      <td className="py-3 font-bold text-neutral-800">{user.name}</td>
                      <td className="py-3 text-neutral-500 font-semibold">{user.title}</td>
                      <td className="py-3 text-neutral-400 font-semibold">{user.email}</td>
                      <td className="py-3 text-teal-600 font-extrabold font-mono">{user.username}</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-neutral-100 text-neutral-600'
                            : user.role === 'manager'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-teal-50 text-teal-700'
                        }`}>
                          {user.roleName}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 border-t pt-3.5 mt-4">
            Total active directories: <strong>{accounts.length} accounts</strong>. Provisioning acts locally and updates live directory listings.
          </div>
        </div>
      </div>

      {/* Suggested Icebreakers / Prompts */}
      <div className={`p-6 bg-white rounded-2xl border space-y-4 ${
        highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
      }`}>
        <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          Contextual Manager Conversation Starters
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prompts.map((p, idx) => (
            <div 
              key={idx}
              className={`p-4 rounded-xl border bg-neutral-50/40 text-xs flex flex-col justify-between gap-3 hover:bg-neutral-50 transition ${
                highContrast ? 'border-black' : 'border-neutral-100'
              }`}
            >
              <div className="space-y-2">
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 rounded text-[9px] font-bold uppercase tracking-wider self-start inline-block">
                  {p.tag}
                </span>
                <p className="text-neutral-600 leading-relaxed font-semibold italic">
                  &ldquo;{p.text}&rdquo;
                </p>
              </div>

              <button className="flex items-center gap-1.5 font-bold text-teal-700 hover:text-teal-900 transition-colors text-[10px] self-end mt-2">
                <span>View Suggestions</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* ===== Direct Reports — Shared BRI Trends ===== */}
      <div className={`p-6 bg-white rounded-2xl border ${highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'}`}>
        <div className="flex items-center gap-2 border-b pb-3 mb-5 border-neutral-100">
          <TrendingUp className="h-5 w-5 text-teal-600" />
          <h3 className="text-base font-bold text-neutral-800">Direct Reports — Shared BRI Trends</h3>
        </div>

        {sharedTrends.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center mx-auto">
              <EyeOff className="h-5 w-5 text-neutral-300" />
            </div>
            <p className="text-xs font-semibold text-neutral-500">No direct reports have shared their trend data yet.</p>
            <p className="text-[10px] text-neutral-400 max-w-sm mx-auto">Employees can opt in from the &ldquo;Why am I seeing this?&rdquo; card on their dashboard. Shared data shows only the trend shape — raw scores and factors remain hidden.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sharedTrends.map((trend, idx) => {
              const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const svgW = 280;
              const svgH = 80;
              const padding = 10;
              const stepX = (svgW - padding * 2) / (trend.data.length - 1);
              const maxScore = 3;
              const points = trend.data.map((score, i) => {
                const x = padding + i * stepX;
                const y = svgH - padding - ((score / maxScore) * (svgH - padding * 2));
                return `${x},${y}`;
              }).join(' ');

              const lineColors = ['stroke-teal-500', 'stroke-blue-500', 'stroke-amber-500'];
              const dotColors = ['fill-teal-500', 'fill-blue-500', 'fill-amber-500'];
              const colorIdx = idx % lineColors.length;

              return (
                <div key={trend.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-neutral-100 text-[9px] font-bold">{trend.avatar}</span>
                    <span className="text-xs font-bold text-neutral-700">{trend.name}</span>
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 rounded text-[8px] font-bold">OPTED IN</span>
                  </div>
                  <div className="bg-neutral-50/50 rounded-xl border border-neutral-100 p-4">
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-20">
                      <polyline
                        points={points}
                        fill="none"
                        className={`${lineColors[colorIdx]} stroke-2`}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {trend.data.map((score, i) => {
                        const x = padding + i * stepX;
                        const y = svgH - padding - ((score / maxScore) * (svgH - padding * 2));
                        return <circle key={i} cx={x} cy={y} r="3" className={dotColors[colorIdx]} />;
                      })}
                    </svg>
                    <div className="flex justify-between mt-1 px-1">
                      {dayLabels.map(d => (
                        <span key={d} className="text-[8px] text-neutral-400 font-semibold">{d}</span>
                      ))}
                    </div>
                    <p className="text-[9px] text-neutral-400 mt-2 italic">Trend shape only — raw numerical scores and contributing factors are hidden for privacy compliance.</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
