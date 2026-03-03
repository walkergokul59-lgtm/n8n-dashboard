import { useMemo } from 'react';
import { Bot, User, Clock, DollarSign, Calendar } from 'lucide-react';
import { getAIAgentLogs } from '../utils/mock-data';
import { useDashboardData } from '../hooks/useDashboardData'; // Assuming this is the path for the custom hook

export default function AIAgentLogs() {
    const { data: logs, isLoading } = useDashboardData(getAIAgentLogs);
    const logsList = Array.isArray(logs) ? logs : [];

    // Calculate summary stats
    const stats = useMemo(() => {
        if (!logsList.length) {
            return {
                totalConversations: 0,
                totalDuration: 0,
                totalCost: '0.0000',
            };
        }
        return {
            totalConversations: logsList.length,
            totalDuration: logsList.reduce((acc, curr) => acc + curr.durationMs, 0),
            totalCost: logsList.reduce((acc, curr) => acc + curr.cost, 0).toFixed(4),
        };
    }, [logsList]);

    const formatDate = (isoString) => {
        const d = new Date(isoString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(d);
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header & Stats Summary */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1f2e] p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div>
                    <h2 className="text-xl font-bold text-white mb-1">AI Agent Logs</h2>
                    <p className="text-sm text-gray-400">Detailed interaction logs between users and AI agents</p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="bg-[#141a21] px-4 py-2 rounded-lg border border-white/5 flex items-center">
                        <div className="mr-3 p-1.5 bg-indigo-500/10 rounded-md text-indigo-400">
                            <Bot size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Conversations</p>
                            <p className="text-white font-semibold">{stats.totalConversations}</p>
                        </div>
                    </div>

                    <div className="bg-[#141a21] px-4 py-2 rounded-lg border border-white/5 flex items-center">
                        <div className="mr-3 p-1.5 bg-amber-500/10 rounded-md text-amber-400">
                            <Clock size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Duration</p>
                            <p className="text-white font-semibold">{stats.totalDuration}ms</p>
                        </div>
                    </div>

                    <div className="bg-[#141a21] px-4 py-2 rounded-lg border border-white/5 flex items-center">
                        <div className="mr-3 p-1.5 bg-emerald-500/10 rounded-md text-emerald-400">
                            <DollarSign size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Cost</p>
                            <p className="text-white font-semibold">${stats.totalCost}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conversation List */}
            <div className="space-y-6">
                {isLoading && logsList.length === 0 ? (
                    <div className="text-sm text-gray-400">Loading logs…</div>
                ) : null}

                {logsList.map((log) => (
                    <div key={log.threadId} className="bg-[#1a1f2e] rounded-xl border border-white/5 shadow-md overflow-hidden">
                        {/* Thread Header Metadata */}
                        <div className="bg-[#141a21]/80 px-6 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs">
                            <div className="flex items-center text-gray-400 font-mono">
                                <span className="text-gray-500 mr-2">THREAD ID</span>
                                <span className="text-primary truncate max-w-[150px] sm:max-w-none" title={log.threadId}>
                                    {log.threadId}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-gray-400 font-medium">
                                <div className="flex items-center" title="Duration">
                                    <Clock size={14} className="mr-1.5 text-amber-400" />
                                    {log.durationMs}ms
                                </div>
                                <div className="flex items-center" title="Cost">
                                    <DollarSign size={14} className="mr-1.5 text-emerald-400" />
                                    ${log.cost.toFixed(4)}
                                </div>
                                <div className="flex items-center" title="Timestamp">
                                    <Calendar size={14} className="mr-1.5 text-indigo-400" />
                                    {formatDate(log.timestamp)}
                                </div>
                            </div>
                        </div>

                        {/* Conversation Area */}
                        <div className="p-6 space-y-6">
                            {/* User Message */}
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600 shadow-sm">
                                    <User size={16} className="text-slate-200" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-bold text-slate-400 mb-1 tracking-wide">USER</h4>
                                    <div className="bg-[#141a21] border border-white/5 rounded-2xl rounded-tl-sm p-4 text-gray-200 text-sm shadow-sm inline-block max-w-[85%] leading-relaxed">
                                        {log.question}
                                    </div>
                                </div>
                            </div>

                            {/* AI Agent Response */}
                            <div className="flex items-start gap-4 flex-row-reverse">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 shadow-sm shadow-primary/10">
                                    <Bot size={16} className="text-primary" />
                                </div>
                                <div className="flex-1 flex flex-col items-end">
                                    <h4 className="text-xs font-bold text-primary/80 mb-1 tracking-wide">AI AGENT</h4>
                                    <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm p-4 text-gray-100 text-sm shadow-sm inline-block max-w-[85%] text-left leading-relaxed">
                                        {log.response}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
