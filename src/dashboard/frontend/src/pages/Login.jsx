import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Tama AI Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Login untuk akses admin panel</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-surface border border-surface-border rounded-2xl p-6 space-y-4">
                    {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{error}</div>}

                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus
                            className="w-full bg-surface-light border border-surface-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none" />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Password</label>
                        <div className="relative">
                            <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                                className="w-full bg-surface-light border border-surface-border rounded-lg px-3 py-2.5 pr-10 text-white text-sm focus:border-brand focus:outline-none" />
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full bg-brand hover:bg-brand-light text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
