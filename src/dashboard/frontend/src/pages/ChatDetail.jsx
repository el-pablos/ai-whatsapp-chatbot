import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/utils';
import { ArrowLeft, User } from 'lucide-react';

export default function ChatDetail() {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        const decoded = decodeURIComponent(chatId);
        api(`/chats/${encodeURIComponent(decoded)}`).then(setMessages).catch(() => {});
        api(`/chats/${encodeURIComponent(decoded)}/user`).then(setUserInfo).catch(() => {});
    }, [chatId]);

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/chats')} className="p-2 rounded-lg hover:bg-surface-light text-gray-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white">{userInfo?.profile?.display_name || decodeURIComponent(chatId)}</h1>
                    <p className="text-sm text-gray-500 font-mono">{decodeURIComponent(chatId)}</p>
                </div>
            </div>

            {userInfo?.profile && (
                <div className="bg-surface border border-surface-border rounded-xl p-4 mb-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-sm text-white">{userInfo.profile.display_name || '—'}</p>
                        <p className="text-xs text-gray-500">Messages: {userInfo.profile.total_messages || 0} · Last seen: {userInfo.profile.last_seen ? new Date(userInfo.profile.last_seen).toLocaleString('id-ID') : '—'}</p>
                    </div>
                </div>
            )}

            <div className="bg-surface border border-surface-border rounded-xl p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                {messages.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Tidak ada pesan</p>
                ) : messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm ${m.role === 'assistant' ? 'bg-surface-light text-gray-200' : 'bg-brand text-white'}`}>
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            <p className="text-[10px] mt-1 opacity-50">{m.created_at ? new Date(m.created_at).toLocaleTimeString('id-ID') : ''}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
