'use client';
import { useContext} from'react';
import ManagerDashboard from'../components/ManagerDashboard';
import { AuthContext} from'../components/AppShell';

export default function ManagerPage() {
 return <div className="animate-fade-in"><ManagerDashboard /></div>;
}
