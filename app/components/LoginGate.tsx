'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { useAccessibility } from '../context/AccessibilityContext';

interface LoginGateProps {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}

export default function LoginGate({
  email, onEmailChange, password, onPasswordChange, error, onSubmit,
}: LoginGateProps) {
  const { highContrast } = useAccessibility();

  return (
    <div className={`min-h-screen w-full flex bg-background ${highContrast ? 'glass-card text-black' : ''}`}>
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-teal-900 via-teal-800 to-teal-950 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 flex flex-col justify-end p-16 pb-24 text-white z-10">
          <div className="space-y-4 max-w-md animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 relative"><Image src="/logo-icon.svg" alt="AxionHR Logo" fill className="object-contain filter brightness-0 invert" /></div>
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
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="block text-xs font-bold text-neutral-700">
                  Work Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. alex.rivera@axionhr.com"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  required
                  className="p-3.5 rounded-xl text-sm glass-card font-medium h-auto"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="block text-xs font-bold text-neutral-700">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  required
                  className="p-3.5 rounded-xl text-sm glass-card font-medium h-auto"
                />
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full py-3.5 h-auto rounded-xl text-sm font-bold">
              Sign In to Portal
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
