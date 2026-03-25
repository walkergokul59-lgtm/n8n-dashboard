/* UI redesign: fixed text-[10px] to text-[12px], replaced hardcoded grays/slate with CSS vars, consistent typography */
import { useMemo } from 'react';
import { Bot, User, Clock, DollarSign, Calendar } from 'lucide-react';
import { getAIAgentLogs } from '../utils/mock-data';
import { useDashboardData } from '../hooks/useDashboardData';

export default function AIAgentLogs() {
    const { data: logs, isLoading } = useDashboardData(getAIAgentLogs);
    const logsList = Array.isArray(logs) ? logs : [];

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-elevated)] p-6 rounded-[8px] border border-[var(--c-border)] shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--c-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div>
                    <h2 className="text-[20px] font-semibold text-[var(--c-text)] mb-1">AI Agent Logs</h2>
                    <p className="text-[14px] text-[var(--c-text-muted)]">Detailed interaction logs between users and AI agents</p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="bg-[var(--bg-surface)] px-4 py-2 rounded-[6px] border border-[var(--c-border)] flex items-center">
                        <div className="mr-3 p-1.5 bg-[var(--c-accent)]/10 rounded-[4px] text-[var(--c-accent)]">
                            <Bot size={16} />
                        </div>
                        <div>
                            <p className="text-[12px] text-[var(--c-text-subtle)] uppercase font-semibold tracking-wider">Conversations</p>
                            <p className="text-[var(--c-text)] font-semibold">{stats.totalConversations}</p>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-surface)] px-4 py-2 rounded-[6px] border border-[var(--c-border)] flex items-center">
                        <div className="mr-3 p-1.5 bg-[var(--c-warning)]/10 rounded-[4px] text-[var(--c-warning)]">
                            <Clock size={16} />
                        </div>
                        <div>
                            <p className="text-[12px] text-[var(--c-text-subtle)] uppercase font-semibold tracking-wider">Total Duration</p>
                            <p className="text-[var(--c-text)] font-semibold">{stats.totalDuration}ms</p>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-surface)] px-4 py-2 rounded-[6px] border border-[var(--c-border)] flex items-center">
                        <div className="mr-3 p-1.5 bg-[var(--c-success)]/10 rounded-[4px] text-[var(--c-success)]">
                            <DollarSign size={16} />
                        </div>
                        <div>
                            <p className="text-[12px] text-[var(--c-text-subtle)] uppercase font-semibold tracking-wider">Total Cost</p>
                            <p className="text-[var(--c-text)] font-semibold">${stats.totalCost}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conversation List */}
            <div className="space-y-6">
                {isLoading && logsList.length === 0 ? (
                    <div className="text-[14px] text-[var(--c-text-muted)]">Loading logs…</div>
                ) : null}

                {logsList.map((log) => (
                    <div key={log.threadId} className="bg-[var(--bg-elevated)] rounded-[8px] border border-[var(--c-border)] shadow-md overflow-hidden">
                        {/* Thread Header Metadata */}
                        <div className="bg-[var(--bg-surface)] px-6 py-3 border-b border-[var(--c-border)] flex flex-wrap items-center justify-between gap-4 text-[12px]">
                            <div className="flex items-center text-[var(--c-text-muted)] font-mono">
                                <span className="text-[var(--c-text-subtle)] mr-2">THREAD ID</span>
                                <span className="text-[var(--c-accent)] truncate max-w-[150px] sm:max-w-none" title={log.threadId}>
                                    {log.threadId}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-[var(--c-text-muted)] font-medium">
                                <div className="flex items-center" title="Duration">
                                    <Clock size={14} className="mr-1.5 text-[var(--c-warning)]" />
                                    {log.durationMs}ms
                                </div>
                                <div className="flex items-center" title="Cost">
                                    <DollarSign size={14} className="mr-1.5 text-[var(--c-success)]" />
                                    ${log.cost.toFixed(4)}
                                </div>
                                <div className="flex items-center" title="Timestamp">
                                    <Calendar size={14} className="mr-1.5 text-[var(--c-accent)]" />
                                    {formatDate(log.timestamp)}
                                </div>
                            </div>
                        </div>

                        {/* Conversation Area */}
                        <div className="p-6 space-y-6">
                            {/* User Message */}
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center shrink-0 border border-[var(--c-border)] shadow-sm">
                                    <User size={16} className="text-[var(--c-text-dim)]" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[12px] font-semibold text-[var(--c-text-muted)] mb-1 tracking-wide">USER</h4>
                                    <div className="bg-[var(--bg-surface)] border border-[var(--c-border)] rounded-2xl rounded-tl-sm p-4 text-[var(--c-text-dim)] text-[14px] shadow-sm inline-block max-w-[85%] leading-relaxed">
                                        {log.question}
                                    </div>
                                </div>
                            </div>

                            {/* AI Agent Response */}
                            <div className="flex items-start gap-4 flex-row-reverse">
                                <div className="w-8 h-8 rounded-full bg-[var(--c-accent)]/20 flex items-center justify-center shrink-0 border border-[var(--c-accent)]/30 shadow-sm">
                                    <Bot size={16} className="text-[var(--c-accent)]" />
                                </div>
                                <div className="flex-1 flex flex-col items-end">
                                    <h4 className="text-[12px] font-semibold text-[var(--c-accent)]/80 mb-1 tracking-wide">AI AGENT</h4>
                                    <div className="bg-[var(--c-accent)]/10 border border-[var(--c-accent)]/20 rounded-2xl rounded-tr-sm p-4 text-[var(--c-text)] text-[14px] shadow-sm inline-block max-w-[85%] text-left leading-relaxed">
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
