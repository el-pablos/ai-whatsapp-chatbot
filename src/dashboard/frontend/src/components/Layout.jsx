import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import {
    LayoutDashboard, ShieldCheck, Settings2, ToggleLeft,
    MessageCircle, BarChart3, ScrollText, Wrench, LogOut, Bot
} from 'lucide-react';

const NAV = [
    { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/allowlist', icon: ShieldCheck, label: 'Allowlist' },
    { to: '/config', icon: Settings2, label: 'Bot Config' },
    { to: '/features', icon: ToggleLeft, label: 'Features' },
    { to: '/chats', icon: MessageCircle, label: 'Chat Monitor' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/logs', icon: ScrollText, label: 'Activity Logs' },
    { to: '/settings', icon: Wrench, label: 'Settings' },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-950">
            {/* Sidebar */}
            <aside className="w-64 border-r border-surface-border bg-surface flex flex-col shrink-0">
                <div className="flex items-center gap-2 px-5 py-5 border-b border-surface-border">
                    <Bot className="w-7 h-7 text-brand" />
                    <span className="text-lg font-semibold text-white">Tama AI</span>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                    {NAV.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) => cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                isActive ? 'bg-brand text-white' : 'text-gray-400 hover:bg-surface-light hover:text-white'
                            )}
                        >
                            <Icon className="w-4.5 h-4.5" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* User footer */}
                <div className="border-t border-surface-border px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.display_name || user?.username}</p>
                        <p className="text-xs text-gray-500">{user?.role}</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-surface-light text-gray-400 hover:text-white transition-colors" title="Logout">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
