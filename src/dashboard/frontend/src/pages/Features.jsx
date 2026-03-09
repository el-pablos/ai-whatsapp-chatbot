import { useState, useEffect } from 'react';
import { api } from '../lib/utils';
import { Search } from 'lucide-react';

export default function Features() {
    const [features, setFeatures] = useState([]);
    const [search, setSearch] = useState('');
    const [toggling, setToggling] = useState('');

    const load = () => api('/features').then(setFeatures).catch(() => {});
    useEffect(() => { load(); }, []);

    const filtered = features.filter(f =>
        f.id.includes(search.toLowerCase()) || (f.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleToggle = async (id, current) => {
        setToggling(id);
        await api(`/features/${id}`, { method: 'PUT', body: { is_enabled: !current } }).catch(() => {});
        load();
        setToggling('');
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">Feature Toggles</h1>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input placeholder="Cari feature..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(f => (
                    <div key={f.id} className="bg-surface border border-surface-border rounded-xl p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white">{f.name || f.id}</p>
                            {f.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{f.description}</p>}
                            <span className="inline-block mt-1.5 text-xs text-gray-600 font-mono">{f.id}</span>
                        </div>
                        <button
                            onClick={() => handleToggle(f.id, f.is_enabled)}
                            disabled={toggling === f.id}
                            className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${f.is_enabled ? 'bg-brand' : 'bg-gray-700'}`}
                        >
                            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${f.is_enabled ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
