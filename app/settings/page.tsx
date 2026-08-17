'use client';
import { useContext} from'react';
import SettingsView from'../components/SettingsView';
import { AuthContext} from'../components/AppShell';

export default function SettingsPage() {
 const { currentUser, triggerRefresh} = useContext(AuthContext);
 return <div className="animate-fade-in"><SettingsView currentUser={currentUser} onUserUpdated={triggerRefresh} /></div>;
}
