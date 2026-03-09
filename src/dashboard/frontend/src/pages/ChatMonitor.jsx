import { useState, useEffect } from 'react';
import { api } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

export default function ChatMonitor() {
    const [chats, setChats] = useState([]);
    const [hours, setHours] = useState(24);
    const navigate = useNavigate();

    const load = () => api(`/chats?hours=${hours}`).then(setChats).catch(() => {});
    useEffect(() => { load(); }, [hours]);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Chat Monitor</h1>
                <div className="flex items-center gap-3">
                    <select value={hours} onChange={e => setHours(+e.target.value)}
                        className="bg-surface-light border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                        <option value={6}>6 jam</option>
                        <option value={24}>24 jam</option>
                        <option value={72}>3 hari</option>
                        <option value={168}>7 hari</option>
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
                            <th className="px-5 py-3">Chat ID</th>
                            <th className="px-5 py-3">Sender</th>
                            <th className="px-5 py-3">Messages</th>
                            <th className="px-5 py-3">Last Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chats.length === 0 ? (
                            <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500">Tidak ada chat dalam rentang waktu ini</td></tr>
                        ) : chats.map(c => (
                            <tr key={c.chat_id} onClick={() => navigate(`/chats/${encodeURIComponent(c.chat_id)}`)}
                                className="border-b border-surface-border last:border-0 hover:bg-surface-light cursor-pointer">
                                <td className="px-5 py-3 text-white font-mono text-xs">{c.chat_id}</td>
                                <td className="px-5 py-3 text-gray-300">{c.sender_name || '—'}</td>
                                <td className="px-5 py-3 text-gray-300">{c.msg_count}</td>
                                <td className="px-5 py-3 text-gray-500">{new Date(c.last_msg).toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
