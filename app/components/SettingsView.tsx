'use client';

import React, { useState} from'react';
import { supabase} from'../lib/supabaseClient';
import { Database} from'../lib/database.types';
import { useAccessibility} from'../context/AccessibilityContext';
import { Save, User, ShieldAlert, CheckCircle, Upload, X} from'lucide-react';
import Cropper from'react-easy-crop';
import { getCroppedImg} from'../utils/cropImage';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface SettingsViewProps {
 currentUser: UserProfile;
 onUserUpdated: () => void;
}

export default function SettingsView({ currentUser, onUserUpdated}: SettingsViewProps) {
 const { highContrast} = useAccessibility();

 const [name, setName] = useState(currentUser.full_name);
 const [phone, setPhone] = useState(currentUser.phone ||'');
 const [address, setAddress] = useState(currentUser.address ||'');
 const [avatar, setAvatar] = useState(currentUser.avatar ||'');
 const [newPassword, setNewPassword] = useState('');
 const [workingHoursStart, setWorkingHoursStart] = useState(currentUser.working_hours_start || '09:00');
 const [workingHoursEnd, setWorkingHoursEnd] = useState(currentUser.working_hours_end || '17:00');

 const [isLoading, setIsLoading] = useState(false);
 const [errorMsg, setErrorMsg] = useState('');
 const [successMsg, setSuccessMsg] = useState('');

 // Crop Modal State
 const [imageToCrop, setImageToCrop] = useState<string | null>(null);
 const [crop, setCrop] = useState({ x: 0, y: 0});
 const [zoom, setZoom] = useState(1);
 const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number} | null>(null);
 const [isCropModalOpen, setIsCropModalOpen] = useState(false);

 const avatarPresets = ['AR','DV','PS','SC','MK','LH','JW','KL'];

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setErrorMsg('');
 setSuccessMsg('');

 if (!name.trim()) {
 setErrorMsg('Full Name is required.');
 return;
}
 if (!phone.trim()) {
 setErrorMsg('Phone Number is required.');
 return;
}

 setIsLoading(true);
 try {
 // Update profile fields in Supabase
 const { error: profileError} = await supabase
 .from('user_profiles')
 .update({
 full_name: name.trim(),
 phone: phone.trim(),
 address: address.trim() || null,
 avatar: avatar || null,
 working_hours_start: workingHoursStart,
 working_hours_end: workingHoursEnd,
})
 .eq('id', currentUser.id);

 if (profileError) throw profileError;

 // If the user entered a new password, update it via Supabase Auth
 if (newPassword.trim()) {
 const { error: authError} = await supabase.auth.updateUser({
 password: newPassword.trim(),
});
 if (authError) throw authError;
}

 setSuccessMsg('Profile settings updated successfully!');
 onUserUpdated();
 setNewPassword('');
 setTimeout(() => setSuccessMsg(''), 3000);
} catch (err: unknown) {
 const message = err instanceof Error ? err.message :'Failed to update profile settings.';
 setErrorMsg(message);
} finally {
 setIsLoading(false);
}
};

 return (
 <div className="max-w-3xl mx-auto space-y-6">
 <div className={`p-6 glass-card rounded-2xl border ${highContrast ?'border-black text-black' :'border-border-color'
}`}>
 <div className="flex items-center gap-3 border-b pb-4 mb-6 border-neutral-100">
 <User className="h-5.5 w-5.5 text-teal-600" />
 <div>
 <h2 className="text-base font-bold text-neutral-800">Personal Profile Settings</h2>
 <p className="text-xs text-neutral-400">View and update your personal details</p>
 </div>
 </div>

 <form onSubmit={handleSave} className="space-y-5">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 {/* Full Name */}
 <div>
 <label htmlFor="settings-name" className="block text-xs font-bold text-neutral-700 mb-1">
 Full Name <span className="text-red-500">*</span>
 </label>
 <input
 id="settings-name"
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ?'border-black' :'border-border-color'
}`}
 required
 />
 </div>

 {/* Email (Read Only) */}
 <div>
 <label htmlFor="settings-email" className="block text-xs font-bold text-neutral-700 mb-1">
 Work Email Address <span className="text-neutral-400 font-normal">(Cannot be edited)</span>
 </label>
 <input
 id="settings-email"
 type="email"
 value={currentUser.email}
 className="w-full p-2.5 rounded-lg border text-xs bg-neutral-50 text-neutral-500 border-border-color cursor-not-allowed font-semibold focus:outline-none"
 disabled
 readOnly
 />
 </div>

 {/* Phone Number */}
 <div>
 <label htmlFor="settings-phone" className="block text-xs font-bold text-neutral-700 mb-1">
 Phone Number <span className="text-red-500">*</span>
 </label>
 <input
 id="settings-phone"
 type="tel"
 placeholder="e.g. +1 (555) 019-2834"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ?'border-black' :'border-border-color'
}`}
 required
 />
 </div>

 {/* Address */}
 <div className="md:col-span-2">
 <label htmlFor="settings-address" className="block text-xs font-bold text-neutral-700 mb-1">
 Home Address
 </label>
 <input
 id="settings-address"
 type="text"
 placeholder="e.g. 123 Guardian Way, Tech City"
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>

 {/* Working Hours Start */}
 <div>
 <label htmlFor="settings-wh-start" className="block text-xs font-bold text-neutral-700 mb-1">
 My Working Hours (Start)
 </label>
 <input
 id="settings-wh-start"
 type="time"
 value={workingHoursStart}
 onChange={(e) => setWorkingHoursStart(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ?'border-black' :'border-border-color'
}`}
 required
 />
 </div>

 {/* Working Hours End */}
 <div>
 <label htmlFor="settings-wh-end" className="block text-xs font-bold text-neutral-700 mb-1">
 My Working Hours (End)
 </label>
 <input
 id="settings-wh-end"
 type="time"
 value={workingHoursEnd}
 onChange={(e) => setWorkingHoursEnd(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ?'border-black' :'border-border-color'
}`}
 required
 />
 </div>

 {/* New Password */}
 <div>
 <label htmlFor="settings-password" className="block text-xs font-bold text-neutral-700 mb-1">
 New Password <span className="text-neutral-400 font-normal">(Leave blank to keep current)</span>
 </label>
 <input
 id="settings-password"
 type="password"
 placeholder="••••••••"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>
 </div>

 {/* Address */}
 <div>
 <label htmlFor="settings-address" className="block text-xs font-bold text-neutral-700 mb-1">
 Residential Address
 </label>
 <input
 id="settings-address"
 type="text"
 placeholder="e.g. 123 Elm St, Springfield, IL"
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 className={`w-full p-2.5 rounded-lg border text-xs glass-card focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${highContrast ?'border-black' :'border-border-color'
}`}
 />
 </div>

 {/* Profile Image / Avatar Preset Selection */}
 <div>
 <span className="block text-xs font-bold text-neutral-700 mb-2">Select Profile Avatar</span>
 <div className="flex flex-wrap gap-2.5 items-center">
 {/* Custom Image Upload */}
 <div className="relative group">
 <input 
 type="file" 
 accept="image/*" 
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setImageToCrop(reader.result as string);
 setZoom(1);
 setCrop({ x: 0, y: 0});
 setIsCropModalOpen(true);
};
 reader.readAsDataURL(file);
}
 e.target.value ='';
}}
 title="Upload custom avatar"
 />
 <button
 type="button"
 className={`h-11 w-11 rounded-full flex items-center justify-center text-xs border transition-all relative overflow-hidden ${
 avatar.startsWith('data:image') || avatar.startsWith('http')
 ? (highContrast ?'border-2 border-black ring-2 ring-black' :'border-teal-500 shadow-sm ring-2 ring-teal-200')
 : (highContrast ?'border-black glass-card group-hover:bg-neutral-100' :'border-border-color bg-neutral-50 group-hover:bg-neutral-100 text-neutral-600')
}`}
 >
 {(avatar.startsWith('data:image') || avatar.startsWith('http')) ? (
 <img src={avatar} alt="Custom avatar" className="h-full w-full object-cover" />
 ) : (
 <Upload className="w-5 h-5 text-neutral-500" />
 )}
 </button>
 </div>

 <div className="h-6 w-px bg-neutral-200 mx-1"></div>

 {avatarPresets.map((preset) => (
 <button
 key={preset}
 type="button"
 onClick={() => setAvatar(preset)}
 className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-extrabold border transition-all ${avatar === preset
 ? (highContrast ?'border-2 border-black bg-neutral-900 text-white' :'border-teal-500 bg-teal-50 text-teal-700 shadow-sm ring-2 ring-teal-200')
 : (highContrast ?'border-black glass-card hover:bg-neutral-100' :'border-border-color bg-neutral-50 hover:bg-neutral-100 text-neutral-600')
}`}
 >
 {preset}
 </button>
 ))}
 </div>
 </div>

 {errorMsg && (
 <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 flex items-start gap-2 font-semibold leading-normal animate-fade-in">
 <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
 <span>{errorMsg}</span>
 </div>
 )}

 {successMsg && (
 <div className="p-3.5 bg-teal-50 border border-teal-150 rounded-xl text-xs text-teal-800 flex items-start gap-2 font-semibold leading-normal animate-fade-in">
 <CheckCircle className="h-4.5 w-4.5 text-teal-600 shrink-0 mt-0.5" />
 <span>{successMsg}</span>
 </div>
 )}

 <div className="border-t pt-4 flex justify-end">
 <button
 type="submit"
 disabled={isLoading}
 className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed ${highContrast
 ?'bg-black text-white hover:bg-neutral-800'
 :'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
}`}
 >
 <Save className="h-4 w-4" />
 <span>{isLoading ?'Saving...' :'Save Changes'}</span>
 </button>
 </div>
 </form>
 </div>

 {/* Crop Modal Overlay */}
 {isCropModalOpen && imageToCrop && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
 <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-scale-up">
 <div className="p-4 border-b border-neutral-100 flex justify-between items-center">
 <h3 className="font-bold text-neutral-800 text-sm">Crop Avatar Image</h3>
 <button onClick={() => setIsCropModalOpen(false)} className="text-neutral-400 hover:text-black transition">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="relative w-full h-[320px] bg-teal-900 overflow-hidden">
 <Cropper
 image={imageToCrop}
 crop={crop}
 zoom={zoom}
 aspect={1}
 cropShape="round"
 showGrid={false}
 onCropChange={setCrop}
 onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
 onZoomChange={setZoom}
 />
 </div>
 
 <div className="p-5 glass-card flex flex-col gap-5">
 <div className="flex items-center gap-4">
 <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Zoom</span>
 <input
 type="range"
 value={zoom}
 min={1}
 max={3}
 step={0.1}
 onChange={(e) => setZoom(Number(e.target.value))}
 className="flex-1 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
 />
 </div>
 <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
 <button
 type="button"
 onClick={() => setIsCropModalOpen(false)}
 className="px-4 py-2.5 text-xs font-bold text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition focus:ring-2 focus:ring-neutral-300 outline-none"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={async () => {
 try {
 if (croppedAreaPixels) {
 const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
 setAvatar(croppedImage);
 setIsCropModalOpen(false);
}
} catch (e) {
 console.error("Crop error:", e);
}
}}
 className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition focus:ring-2 focus:ring-teal-500 shadow-sm outline-none"
 >
 Apply & Save
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
