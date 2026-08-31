'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { supabase } from '../lib/supabaseClient';

interface ProfileSetupDialogProps {
  open: boolean;
  currentUser: { id: string; full_name: string; email: string };
  onSaved: () => void;
}

export default function ProfileSetupDialog({ open, currentUser, onSaved }: ProfileSetupDialogProps) {
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const pName = formData.get('name') as string;
    const pPhone = formData.get('phone') as string;
    const pAddress = formData.get('address') as string;

    if (!pName || !pPhone) return;

    setIsSaving(true);
    setError('');
    try {
      await supabase.from('user_profiles').update({
        full_name: pName.trim(),
        phone: pPhone.trim(),
        address: pAddress ? pAddress.trim() : null,
      }).eq('id', currentUser.id);
      onSaved();
    } catch {
      setError('Failed to save profile setup.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Complete Your Profile Setup</DialogTitle>
          <DialogDescription className="text-xs">
            First-time login setup: Please verify and fill out your required profile information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="setup-name" className="block text-xs font-bold">Full Name *</Label>
            <Input id="setup-name" name="name" type="text" defaultValue={currentUser.full_name} required className="text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="setup-email" className="block text-xs font-bold">Work Email (Read-only)</Label>
            <Input id="setup-email" type="email" value={currentUser.email} disabled className="text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="setup-phone" className="block text-xs font-bold">Phone Number *</Label>
            <Input id="setup-phone" name="phone" type="tel" required className="text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="setup-address" className="block text-xs font-bold">Residential Address (Optional)</Label>
            <Input id="setup-address" name="address" type="text" className="text-xs font-semibold" />
          </div>
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={isSaving} className="w-full py-2.5 h-auto rounded-xl text-xs font-bold">
            {isSaving ? 'Saving...' : 'Access Portal'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
