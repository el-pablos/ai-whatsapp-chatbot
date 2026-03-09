import { useState, useEffect } from 'react';
import { api } from '../lib/utils';
import { Users, MessageCircle, Zap, Clock } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'text-brand' }) {
    return (
        <div className="bg-surface border border-surface-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-surface-light ${color}`}><Icon className="w-5 h-5" /></div>
                <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    );
}

function formatUptime(s) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

function formatBytes(b) {
    if (b > 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    return (b / 1048576).toFixed(1) + ' MB';
}

export default function Overview() {
    const [data, setData] = useState(null);
    const [activity, setActivity] = useState([]);

    useEffect(() => {
        api('/analytics/overview').then(setData).catch(() => {});
        api('/system/activity?limit=10').then(setActivity).catch(() => {});
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={Users} label="Total Users" value={data?.totalUsers?.toLocaleString()} />
                <StatCard icon={MessageCircle} label="Total Messages" value={data?.totalMessages?.toLocaleString()} color="text-green-400" />
                <StatCard icon={Zap} label="Active Today" value={data?.activeToday} color="text-yellow-400" />
                <StatCard icon={Clock} label="Uptime" value={data ? formatUptime(data.uptime) : '—'} sub={data ? `Heap: ${formatBytes(data.memory.heapUsed)} / ${formatBytes(data.memory.heapTotal)}` : ''} color="text-purple-400" />
            </div>

            <div className="bg-surface border border-surface-border rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
                {activity.length === 0 ? (
                    <p className="text-gray-500 text-sm">Belum ada aktivitas.</p>
                ) : (
                    <div className="space-y-2">
                        {activity.map((log, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-surface-border last:border-0">
                                <span className="text-gray-500 text-xs w-36 shrink-0">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                                <span className="text-brand font-medium">{log.admin_name || log.username || '—'}</span>
                                <span className="text-gray-300">{log.action}</span>
                                {log.target && <span className="text-gray-500">{log.target}</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
