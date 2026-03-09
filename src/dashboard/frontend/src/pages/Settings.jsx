import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/utils';
import { Save, Trash2 } from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [cleaning, setCleaning] = useState(false);

    const handleChangePass = async (e) => {
        e.preventDefault();
        setMsg({ type: '', text: '' });
        try {
            await api('/auth/change-password', { method: 'POST', body: { old_password: oldPass, new_password: newPass } });
            setMsg({ type: 'ok', text: 'Password berhasil diubah!' });
            setOldPass('');
            setNewPass('');
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        }
    };

    const handleCleanup = async () => {
        setCleaning(true);
        try {
            const result = await api('/system/cleanup', { method: 'POST' });
            setMsg({ type: 'ok', text: `Cleanup selesai. Sessions expired: ${result.expiredSessions}, Messages deleted: ${result.messagesDeleted}` });
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        }
        setCleaning(false);
    };

    return (
        <div className="max-w-xl">
            <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

            {msg.text && (
                <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                    {msg.text}
                </div>
            )}

            <div className="bg-surface border border-surface-border rounded-xl p-5 mb-6">
                <h2 className="text-lg font-semibold text-white mb-1">Profile</h2>
                <p className="text-sm text-gray-500 mb-4">Logged in as <span className="text-brand">{user?.username}</span> ({user?.role})</p>

                <form onSubmit={handleChangePass} className="space-y-3">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Password Lama</label>
                        <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} required
                            className="w-full bg-surface-light border border-surface-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Password Baru (min 6 karakter)</label>
                        <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={6}
                            className="w-full bg-surface-light border border-surface-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none" />
                    </div>
                    <button type="submit" className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                        <Save className="w-4 h-4" /> Ubah Password
                    </button>
                </form>
            </div>

            <div className="bg-surface border border-surface-border rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-1">System Maintenance</h2>
                <p className="text-sm text-gray-500 mb-4">Bersihkan expired sessions dan pesan lama</p>
                <button onClick={handleCleanup} disabled={cleaning}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-red-500/30 disabled:opacity-50">
                    <Trash2 className="w-4 h-4" /> {cleaning ? 'Cleaning...' : 'Run Cleanup'}
                </button>
            </div>
        </div>
    );
}
