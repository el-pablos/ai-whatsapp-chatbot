import { useState, useEffect } from 'react';
import { api } from '../lib/utils';
import { Plus, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react';

export default function Allowlist() {
    const [entries, setEntries] = useState([]);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ phone_number: '', display_name: '', notes: '' });
    const [error, setError] = useState('');

    const load = () => api('/allowlist').then(setEntries).catch(() => {});
    useEffect(() => { load(); }, []);

    const filtered = entries.filter(e =>
        e.phone_number.includes(search) || (e.display_name || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api('/allowlist', { method: 'POST', body: form });
            setForm({ phone_number: '', display_name: '', notes: '' });
            setShowAdd(false);
            load();
        } catch (err) { setError(err.message); }
    };

    const handleDelete = async (phone) => {
        if (!confirm(`Hapus ${phone} dari allowlist?`)) return;
        await api(`/allowlist/${phone}`, { method: 'DELETE' }).catch(() => {});
        load();
    };

    const handleToggle = async (phone) => {
        await api(`/allowlist/${phone}/toggle`, { method: 'POST' }).catch(() => {});
        load();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Allowlist</h1>
                <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-brand hover:bg-brand-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" /> Tambah Nomor
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleAdd} className="bg-surface border border-surface-border rounded-xl p-5 mb-6 space-y-3">
                    {error && <div className="text-red-400 text-sm">{error}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input placeholder="Nomor (628xxx)" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} required
                            className="bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none" />
                        <input placeholder="Nama (opsional)" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })}
                            className="bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none" />
                        <input placeholder="Catatan (opsional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                            className="bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none" />
                    </div>
                    <button type="submit" className="bg-brand hover:bg-brand-light text-white text-sm font-medium px-4 py-2 rounded-lg">Simpan</button>
                </form>
            )}

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input placeholder="Cari nomor atau nama..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none" />
            </div>

            <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-border text-left text-gray-400">
                            <th className="px-5 py-3">Nomor</th>
                            <th className="px-5 py-3">Nama</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Ditambahkan</th>
                            <th className="px-5 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-500">Belum ada nomor di allowlist</td></tr>
                        ) : filtered.map(e => (
                            <tr key={e.phone_number} className="border-b border-surface-border last:border-0 hover:bg-surface-light">
                                <td className="px-5 py-3 text-white font-mono">{e.phone_number}</td>
                                <td className="px-5 py-3 text-gray-300">{e.display_name || '—'}</td>
                                <td className="px-5 py-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${e.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {e.is_active ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-gray-500">{e.added_by || '—'}</td>
                                <td className="px-5 py-3 text-right flex items-center justify-end gap-2">
                                    <button onClick={() => handleToggle(e.phone_number)} className="p-1.5 rounded hover:bg-surface-light text-gray-400 hover:text-white" title="Toggle">
                                        {e.is_active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => handleDelete(e.phone_number)} className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400" title="Hapus">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
