'use client';
import { useContext} from'react';
import AdminConsole from'../components/AdminConsole';
import { AuthContext} from'../components/AppShell';

export default function AdminPage() {
 return <div className="animate-fade-in"><AdminConsole /></div>;
}
