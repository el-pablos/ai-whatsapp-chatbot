import { useState, useEffect } from 'react';
import { api } from '../lib/utils';
import { Save, RotateCcw } from 'lucide-react';

export default function BotConfig() {
    const [configs, setConfigs] = useState([]);
    const [edits, setEdits] = useState({});
    const [saving, setSaving] = useState('');

    const load = () => api('/config').then(rows => { setConfigs(rows); setEdits({}); }).catch(() => {});
    useEffect(() => { load(); }, []);

    const handleSave = async (key) => {
        setSaving(key);
        try {
            await api(`/config/${key}`, { method: 'PUT', body: { value: edits[key] } });
            load();
        } catch { /* ignore */ }
        setSaving('');
    };

    const handleReset = async () => {
        if (!confirm('Reset semua config ke default?')) return;
        await api('/config/reset', { method: 'POST' }).catch(() => {});
        load();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Bot Configuration</h1>
                <button onClick={handleReset} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
                    <RotateCcw className="w-4 h-4" /> Reset Default
                </button>
            </div>

            <div className="bg-surface border border-surface-border rounded-xl divide-y divide-surface-border">
                {configs.length === 0 ? (
                    <div className="px-5 py-8 text-center text-gray-500">No configs found</div>
                ) : configs.map(c => (
                    <div key={c.config_key} className="flex items-center gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{c.config_key}</p>
                            {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                        </div>
                        <input
                            value={edits[c.config_key] ?? c.config_value ?? ''}
                            onChange={e => setEdits({ ...edits, [c.config_key]: e.target.value })}
                            className="w-64 bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none"
                        />
                        {edits[c.config_key] !== undefined && edits[c.config_key] !== (c.config_value ?? '') && (
                            <button onClick={() => handleSave(c.config_key)} disabled={saving === c.config_key}
                                className="p-2 rounded-lg bg-brand hover:bg-brand-light text-white transition-colors disabled:opacity-50">
                                <Save className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
