import { useState, useEffect } from 'react';
import { api } from '../lib/utils';
import { BarChart3, Users, MessageCircle, Clock } from 'lucide-react';

function SimpleBar({ data, maxVal, labelKey, valueKey }) {
    return (
        <div className="space-y-2">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-20 shrink-0 text-right">{d[labelKey]}</span>
                    <div className="flex-1 bg-surface-light rounded-full h-5 overflow-hidden">
                        <div className="bg-brand h-full rounded-full transition-all" style={{ width: `${Math.max(2, (d[valueKey] / maxVal) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-300 w-12">{d[valueKey]}</span>
                </div>
            ))}
        </div>
    );
}

export default function Analytics() {
    const [messages, setMessages] = useState([]);
    const [topUsers, setTopUsers] = useState([]);
    const [types, setTypes] = useState([]);
    const [hours, setHours] = useState([]);
    const [days, setDays] = useState(7);

    useEffect(() => {
        api(`/analytics/messages?days=${days}`).then(setMessages).catch(() => {});
        api('/analytics/top-users').then(setTopUsers).catch(() => {});
        api('/analytics/message-types').then(setTypes).catch(() => {});
        api('/analytics/peak-hours').then(setHours).catch(() => {});
    }, [days]);

    const maxMsg = Math.max(1, ...messages.map(m => m.count));
    const maxUser = Math.max(1, ...topUsers.map(u => u.count));
    const maxHour = Math.max(1, ...hours.map(h => h.count));

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Analytics</h1>
                <select value={days} onChange={e => setDays(+e.target.value)}
                    className="bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                    <option value={7}>7 hari</option>
                    <option value={14}>14 hari</option>
                    <option value={30}>30 hari</option>
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface border border-surface-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-4 h-4 text-brand" />
                        <h2 className="text-sm font-semibold text-white">Messages per Day</h2>
                    </div>
                    {messages.length ? <SimpleBar data={messages} maxVal={maxMsg} labelKey="date" valueKey="count" /> : <p className="text-gray-500 text-sm">No data</p>}
                </div>

                <div className="bg-surface border border-surface-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-green-400" />
                        <h2 className="text-sm font-semibold text-white">Top Users</h2>
                    </div>
                    {topUsers.length ? <SimpleBar data={topUsers.map(u => ({ label: u.name || u.sender_jid?.slice(0, 12), count: u.count }))} maxVal={maxUser} labelKey="label" valueKey="count" /> : <p className="text-gray-500 text-sm">No data</p>}
                </div>

                <div className="bg-surface border border-surface-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageCircle className="w-4 h-4 text-yellow-400" />
                        <h2 className="text-sm font-semibold text-white">Message Types</h2>
                    </div>
                    {types.length ? <SimpleBar data={types} maxVal={Math.max(1, ...types.map(t => t.count))} labelKey="type" valueKey="count" /> : <p className="text-gray-500 text-sm">No data</p>}
                </div>

                <div className="bg-surface border border-surface-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <h2 className="text-sm font-semibold text-white">Peak Hours</h2>
                    </div>
                    {hours.length ? <SimpleBar data={hours.map(h => ({ label: `${String(h.hour).padStart(2, '0')}:00`, count: h.count }))} maxVal={maxHour} labelKey="label" valueKey="count" /> : <p className="text-gray-500 text-sm">No data</p>}
                </div>
            </div>
        </div>
    );
}
