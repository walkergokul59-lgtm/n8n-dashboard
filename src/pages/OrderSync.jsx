/* UI redesign: replaced hardcoded grays with CSS vars, consistent typography and spacing */
import { useState, useMemo } from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getOrderSyncs } from '../utils/mock-data';
import ChromaGrid from '../components/ChromaGrid';
import { useDashboardData } from '../hooks/useDashboardData';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function OrderSync() {
    const { data: orders, isLoading } = useDashboardData(getOrderSyncs);

    const [sortConfig, setSortConfig] = useState({ key: 'syncedAt', direction: 'desc' });

    const metrics = [
        {
            title: 'ORDERS SYNCED',
            value: '20',
            icon: CheckCircle2,
            iconColor: 'text-[var(--c-accent)]',
            iconBg: 'bg-[var(--c-accent)]/10',
            borderColor: 'border-l-[var(--c-accent)]',
        },
        {
            title: 'RETRY VOLUME',
            value: '19',
            subText: 'Auto-recovered',
            icon: RefreshCw,
            iconColor: 'text-[var(--c-warning)]',
            iconBg: 'bg-[var(--c-warning)]/10',
            borderColor: 'border-l-[var(--c-warning)]',
        },
        {
            title: 'SYNC LATENCY',
            value: '450ms',
            icon: Clock,
            iconColor: 'text-[var(--c-warning)]',
            iconBg: 'bg-[var(--c-warning)]/10',
            borderColor: 'border-l-[var(--c-warning)]',
        },
    ];

    const formatDate = (isoString) => {
        const d = new Date(isoString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(d);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedOrders = useMemo(() => {
        let sortableItems = Array.isArray(orders) ? [...orders] : [];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [orders, sortConfig]);

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 text-[var(--c-text-subtle)] opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? (
            <ArrowUp size={14} className="ml-1 text-[var(--c-accent)]" />
        ) : (
            <ArrowDown size={14} className="ml-1 text-[var(--c-accent)]" />
        );
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-[20px] font-semibold text-[var(--c-accent)] tracking-tight">Order Sync</h1>
                <p className="text-[var(--c-text-muted)] text-[14px] mt-1">E-commerce to Warehouse sync logs.</p>
            </div>

            <ChromaGrid
                items={metrics}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                renderItem={(metric, i, handleCardMove) => (
                    <div
                        key={i}
                        onMouseMove={handleCardMove}
                        className="group relative h-full w-full"
                        style={{ '--spotlight-color': 'var(--c-overlay-hover)' }}
                    >
                        <div
                            className={cn(
                                'h-full bg-[var(--bg-elevated)] rounded-[8px] p-6 flex flex-col justify-between border-l-2 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden',
                                metric.borderColor,
                                'border-y border-r border-[var(--c-border)]/30'
                            )}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--c-overlay-hover)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h3 className="text-[var(--c-text-muted)] text-[12px] font-semibold tracking-wider uppercase">{metric.title}</h3>
                                <div className={cn('p-2 rounded-[6px] border border-[var(--c-border)]', metric.iconBg, metric.iconColor)}>
                                    <metric.icon size={20} strokeWidth={2.5} />
                                </div>
                            </div>

                            <div className="relative z-10 mt-2">
                                <div className="text-[24px] font-semibold text-[var(--c-text)] mb-2 tracking-tight">{metric.value}</div>
                                {metric.subText && <span className="text-[var(--c-text-subtle)] font-medium text-[14px]">{metric.subText}</span>}
                            </div>
                        </div>

                        <div
                            className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-20 opacity-0 group-hover:opacity-100 rounded-[8px]"
                            style={{
                                background: 'radial-gradient(circle 250px at var(--mouse-x, 0) var(--mouse-y, 0), var(--spotlight-color), transparent 80%)'
                            }}
                        />
                    </div>
                )}
            />

            <div className="bg-[var(--bg-elevated)] rounded-[8px] shadow-lg border border-[var(--c-border)] w-full overflow-hidden flex flex-col">
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead>
                            <tr className="bg-[var(--bg-surface)] text-[12px] uppercase tracking-wider text-[var(--c-text-muted)] font-semibold border-b border-[var(--c-border)]">
                                <th onClick={() => handleSort('runId')} className="px-6 py-4 w-20 text-center cursor-pointer hover:bg-[var(--c-overlay-hover)] group transition-colors">
                                    <div className="flex items-center justify-center">Run ID <SortIcon columnKey="runId" /></div>
                                </th>
                                <th onClick={() => handleSort('orderId')} className="px-6 py-4 w-32 cursor-pointer hover:bg-[var(--c-overlay-hover)] group transition-colors">
                                    <div className="flex items-center">Order ID <SortIcon columnKey="orderId" /></div>
                                </th>
                                <th onClick={() => handleSort('status')} className="px-6 py-4 w-32 text-center cursor-pointer hover:bg-[var(--c-overlay-hover)] group transition-colors">
                                    <div className="flex items-center justify-center">Status <SortIcon columnKey="status" /></div>
                                </th>
                                <th onClick={() => handleSort('retries')} className="px-6 py-4 w-28 text-center cursor-pointer hover:bg-[var(--c-overlay-hover)] group transition-colors">
                                    <div className="flex items-center justify-center">Retries <SortIcon columnKey="retries" /></div>
                                </th>
                                <th onClick={() => handleSort('durationMs')} className="px-6 py-4 w-32 text-right cursor-pointer hover:bg-[var(--c-overlay-hover)] group transition-colors">
                                    <div className="flex items-center justify-end">Duration <SortIcon columnKey="durationMs" /></div>
                                </th>
                                <th onClick={() => handleSort('cost')} className="px-6 py-4 w-28 text-right cursor-pointer hover:bg-[var(--c-overlay-hover)] group transition-colors">
                                    <div className="flex items-center justify-end">Cost <SortIcon columnKey="cost" /></div>
                                </th>
                                <th onClick={() => handleSort('syncedAt')} className="px-6 py-4 w-40 text-right cursor-pointer hover:bg-[var(--c-overlay-hover)] group transition-colors">
                                    <div className="flex items-center justify-end">Synced At <SortIcon columnKey="syncedAt" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-[14px] font-medium">
                            {sortedOrders.map((order, index) => (
                                <tr
                                    key={order.runId}
                                    className={cn(
                                        'border-b border-[var(--c-border)] last:border-0 transition-colors duration-200 hover:bg-[var(--c-overlay-hover)]',
                                        index % 2 === 0 ? 'bg-transparent' : 'bg-[var(--bg-surface)]/30'
                                    )}
                                >
                                    <td className="px-6 py-[11px] text-center text-[var(--c-text-dim)] font-mono text-[12px]">{order.runId}</td>
                                    <td className="px-6 py-[11px] text-[var(--c-text)] font-mono text-[12px] font-semibold">{order.orderId}</td>

                                    <td className="px-6 py-[11px] text-center text-[12px]">
                                        <span
                                            className={cn(
                                                'px-2.5 py-1 font-semibold rounded-full border',
                                                order.status === 'SUCCESS'
                                                    ? 'bg-[var(--c-success-bg)] text-[var(--c-success-text)] border-[var(--c-success)]/20'
                                                    : 'bg-[var(--c-error-bg)] text-[var(--c-error-text)] border-[var(--c-error)]/20'
                                            )}
                                        >
                                            {order.status}
                                        </span>
                                    </td>

                                    <td className="px-6 py-[11px] text-center">
                                        <div className="flex items-center justify-center">
                                            {order.retries > 0 && (
                                                <AlertTriangle size={14} className="text-[var(--c-warning)] mr-1.5" />
                                            )}
                                            <span className={cn(
                                                "font-mono",
                                                order.retries > 0 ? "text-[var(--c-warning)] font-semibold" : "text-[var(--c-text-muted)]"
                                            )}>
                                                {order.retries}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-[11px] text-[var(--c-text-dim)] text-right font-mono">
                                        {order.durationMs}ms
                                    </td>

                                    <td className="px-6 py-[11px] text-[var(--c-success)] text-right font-mono">
                                        ${order.cost.toFixed(4)}
                                    </td>

                                    <td className="px-6 py-[11px] text-[var(--c-text-muted)] text-right text-[12px]">
                                        {formatDate(order.syncedAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
