import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/utils';
import { RefreshCw, Download, Trash2, Pause, Play, Filter } from 'lucide-react';

const LEVEL_COLORS = {
    error: 'text-red-400 bg-red-500/15 border-red-500/30',
    warn: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
    success: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    info: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    debug: 'text-gray-400 bg-gray-500/15 border-gray-500/30',
};

const LEVEL_LABELS = ['All', 'Info', 'Warn', 'Error', 'Success', 'Debug'];

export default function ServerLogs() {
    const [logs, setLogs] = useState([]);
    const [streaming, setStreaming] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);
    const [levelFilter, setLevelFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [errorsOnly, setErrorsOnly] = useState(false);
    const [connected, setConnected] = useState(false);
    const [startFrom, setStartFrom] = useState('');
    const [endAt, setEndAt] = useState('');
    const streamRef = useRef(null);
    const containerRef = useRef(null);

    // Load initial logs
    useEffect(() => {
        api('/runtime-logs?limit=500').then(data => setLogs(data || [])).catch(() => {});
    }, []);

    // SSE streaming
    useEffect(() => {
        if (!streaming) {
            if (streamRef.current) { streamRef.current.close(); streamRef.current = null; }
            setConnected(false);
            return;
        }

        const es = new EventSource('/api/runtime-logs/stream', { withCredentials: true });
        streamRef.current = es;

        es.onopen = () => setConnected(true);
        es.onmessage = (e) => {
            try {
                const entry = JSON.parse(e.data);
                setLogs(prev => {
                    const next = [...prev, entry];
                    return next.length > 2000 ? next.slice(-2000) : next;
                });
            } catch { /* ignore malformed */ }
        };
        es.onerror = () => setConnected(false);

        return () => { es.close(); streamRef.current = null; };
    }, [streaming]);

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // Filter logs
    const filtered = logs.filter(l => {
        if (errorsOnly && l.level !== 'error') return false;
        if (levelFilter !== 'All' && l.level !== levelFilter.toLowerCase()) return false;
        if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false;
        if (startFrom) {
            const logDate = new Date(l.timestamp);
            const fromDate = new Date(startFrom);
            if (logDate < fromDate) return false;
        }
        if (endAt) {
            const logDate = new Date(l.timestamp);
            const toDate = new Date(endAt);
            if (logDate > toDate) return false;
        }
        return true;
    });

    const errorCount = filtered.filter(l => l.level === 'error').length;

    const handleExport = useCallback(() => {
        const text = filtered.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tama-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }, [filtered]);

    const handleClear = async () => {
        try { await api('/runtime-logs/clear', { method: 'POST' }); } catch { /* ignore */ }
        setLogs([]);
    };

    const handleReload = async () => {
        try {
            const data = await api('/runtime-logs?limit=500');
            setLogs(data || []);
        } catch { /* ignore */ }
    };

    const resetFilters = () => {
        setLevelFilter('All');
        setSearch('');
        setErrorsOnly(false);
        setStartFrom('');
        setEndAt('');
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="border-l-4 border-brand pl-4">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Runtime Telemetry</p>
                <h1 className="text-2xl font-bold text-white mt-1">Server Logs Command Center</h1>
                <p className="text-gray-500 text-sm mt-1">Monitor real-time events, isolate noisy signals, and export filtered logs for diagnostics.</p>
            </div>

            {/* Control bar */}
            <div className="flex flex-wrap items-center gap-3">
                <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${connected ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-gray-500 border-gray-600 bg-gray-800'}`}>
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                    {connected ? 'Connected' : 'Disconnected'}
                </span>
                <button onClick={() => setStreaming(!streaming)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${streaming ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20' : 'text-gray-400 border-gray-600 bg-gray-800 hover:bg-gray-700'}`}>
                    {streaming ? 'Stream Live' : 'Paused'}
                </button>
                <button onClick={handleReload}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                    <RefreshCw className="w-3 h-3 inline mr-1" />Reload
                </button>
                <button onClick={handleExport}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    <Download className="w-3 h-3 inline mr-1" />Export
                </button>
                <button onClick={handleClear}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-3 h-3 inline mr-1" />Clear
                </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-surface border border-surface-border rounded-xl px-5 py-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Logs</p>
                    <p className="text-2xl font-bold text-white mt-1">{logs.length}</p>
                </div>
                <div className="bg-surface border border-surface-border rounded-xl px-5 py-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Visible Logs</p>
                    <p className="text-2xl font-bold text-brand mt-1">{filtered.length}</p>
                </div>
                <div className="bg-surface border border-surface-border rounded-xl px-5 py-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Errors (Visible)</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">{errorCount}</p>
                </div>
                <div className="bg-surface border border-surface-border rounded-xl px-5 py-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Auto-Scroll</p>
                    <p className={`text-2xl font-bold mt-1 ${autoScroll ? 'text-emerald-400' : 'text-gray-500'}`}>{autoScroll ? 'Enabled' : 'Disabled'}</p>
                </div>
            </div>

            {/* Search bar */}
            <div className="bg-surface border border-surface-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-gray-500 shrink-0" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by message or level..."
                        className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-gray-600" />
                    <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-white transition-colors shrink-0">Reset Filters</button>
                </div>
            </div>

            {/* Filters row */}
            <div className="grid grid-cols-3 gap-4">
                {/* Level filter */}
                <div className="bg-surface border border-surface-border rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Level Filter</p>
                    <div className="flex flex-wrap gap-1.5">
                        {LEVEL_LABELS.map(l => (
                            <button key={l} onClick={() => setLevelFilter(l)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${levelFilter === l ? 'text-brand border-brand bg-brand/10' : 'text-gray-500 border-gray-700 hover:border-gray-500'}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date range */}
                <div className="bg-surface border border-surface-border rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Date Range</p>
                    <div className="flex items-center gap-2">
                        <input type="datetime-local" value={startFrom} onChange={e => setStartFrom(e.target.value)}
                            className="flex-1 bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-300 focus:outline-none" />
                        <span className="text-gray-600 text-xs">to</span>
                        <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)}
                            className="flex-1 bg-surface-light border border-surface-border rounded px-2 py-1 text-xs text-gray-300 focus:outline-none" />
                        {(startFrom || endAt) && (
                            <button onClick={() => { setStartFrom(''); setEndAt(''); }} className="text-xs text-gray-500 hover:text-white">Clear</button>
                        )}
                    </div>
                </div>

                {/* Stream controls */}
                <div className="bg-surface border border-surface-border rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Stream Controls</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setErrorsOnly(!errorsOnly)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${errorsOnly ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-gray-500 border-gray-700 hover:border-gray-500'}`}>
                            Errors Only
                        </button>
                        <button onClick={() => setStreaming(!streaming)}
                            className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition-colors ${streaming ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}>
                            {streaming ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
                        </button>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)}
                                className="w-3.5 h-3.5 rounded accent-brand" />
                            <span className="text-xs text-gray-400">Auto-scroll</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Log stream */}
            <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
                    <h2 className="text-sm font-semibold text-white">Live Stream</h2>
                    <span className="text-xs text-gray-500">Showing <span className="text-white font-medium">{filtered.length}</span> of {logs.length} entries</span>
                </div>
                <div ref={containerRef} className="max-h-[600px] overflow-y-auto font-mono text-xs divide-y divide-surface-border/50">
                    {filtered.length === 0 ? (
                        <div className="px-5 py-12 text-center text-gray-600">No logs yet — waiting for events...</div>
                    ) : filtered.map(l => (
                        <div key={l.id} className="flex items-start gap-3 px-5 py-2.5 hover:bg-surface-light/50 transition-colors">
                            <span className="text-gray-600 shrink-0 w-16 pt-0.5">{l.time}</span>
                            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${LEVEL_COLORS[l.level] || LEVEL_COLORS.info}`}>
                                {l.level}
                            </span>
                            <span className="text-gray-300 break-all whitespace-pre-wrap leading-relaxed">{l.message}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
