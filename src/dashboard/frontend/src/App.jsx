import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Allowlist from './pages/Allowlist';
import BotConfig from './pages/BotConfig';
import Features from './pages/Features';
import ChatMonitor from './pages/ChatMonitor';
import ChatDetail from './pages/ChatDetail';
import Analytics from './pages/Analytics';
import Logs from './pages/Logs';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function AppRoutes() {
    const { user, loading } = useAuth();
    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading...</div>;

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Overview />} />
                <Route path="allowlist" element={<Allowlist />} />
                <Route path="config" element={<BotConfig />} />
                <Route path="features" element={<Features />} />
                <Route path="chats" element={<ChatMonitor />} />
                <Route path="chats/:chatId" element={<ChatDetail />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="logs" element={<Logs />} />
                <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}
