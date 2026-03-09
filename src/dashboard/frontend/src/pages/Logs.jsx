import { useState, useEffect } from 'react';
import { api } from '../lib/utils';
import { RefreshCw } from 'lucide-react';

export default function Logs() {
    const [logs, setLogs] = useState([]);
    const [limit, setLimit] = useState(100);

    const load = () => api(`/system/logs?limit=${limit}`).then(setLogs).catch(() => {});
    useEffect(() => { load(); }, [limit]);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
                <div className="flex items-center gap-3">
                    <select value={limit} onChange={e => setLimit(+e.target.value)}
                        className="bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                        <option value={50}>50 terbaru</option>
                        <option value={100}>100 terbaru</option>
                        <option value={500}>500 terbaru</option>
                    </select>
                    <button onClick={load} className="p-2 rounded-lg hover:bg-surface-light text-gray-400 hover:text-white">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-border text-left text-gray-400">
                            <th className="px-5 py-3">Waktu</th>
                            <th className="px-5 py-3">Admin</th>
                            <th className="px-5 py-3">Action</th>
                            <th className="px-5 py-3">Target</th>
                            <th className="px-5 py-3">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-500">Belum ada log</td></tr>
                        ) : logs.map((l, i) => (
                            <tr key={i} className="border-b border-surface-border last:border-0 hover:bg-surface-light">
                                <td className="px-5 py-3 text-gray-500 text-xs">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                                <td className="px-5 py-3 text-brand">{l.admin_name || l.username || '—'}</td>
                                <td className="px-5 py-3 text-gray-300">{l.action}</td>
                                <td className="px-5 py-3 text-gray-400 font-mono text-xs">{l.target || '—'}</td>
                                <td className="px-5 py-3 text-gray-500 text-xs max-w-xs truncate">{l.details || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
