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

    // Sorting state: column key and direction ('asc' or 'desc')
    const [sortConfig, setSortConfig] = useState({ key: 'syncedAt', direction: 'desc' });

    // Top KPI Metrics
    const metrics = [
        {
            title: 'ORDERS SYNCED',
            value: '20',
            icon: CheckCircle2,
            iconColor: 'text-[#00d9ff]',
            iconBg: 'bg-[#00d9ff]/10',
            borderColor: 'border-l-[#00d9ff]',
        },
        {
            title: 'RETRY VOLUME',
            value: '19',
            subText: 'Auto-recovered',
            icon: RefreshCw,
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-500/10',
            borderColor: 'border-l-amber-500',
        },
        {
            title: 'SYNC LATENCY',
            value: '450ms',
            icon: Clock,
            iconColor: 'text-amber-400',
            iconBg: 'bg-amber-400/10',
            borderColor: 'border-l-amber-400',
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

    // Sorting Logic
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
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? (
            <ArrowUp size={14} className="ml-1 text-[#00d9ff]" />
        ) : (
            <ArrowDown size={14} className="ml-1 text-[#00d9ff]" />
        );
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#00d9ff] tracking-tight">Order Sync</h1>
                <p className="text-gray-400 text-sm mt-1">E-commerce to Warehouse sync logs.</p>
            </div>

            {/* Metrics Header with ChromaGrid Overlay */}
            <ChromaGrid
                items={metrics}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                renderItem={(metric, i, handleCardMove) => (
                    <div
                        key={i}
                        onMouseMove={handleCardMove}
                        className="group relative h-full w-full"
                        style={{ '--spotlight-color': 'rgba(255,255,255,0.08)' }}
                    >
                        <div
                            className={cn(
                                'h-full bg-[var(--c-raised)] rounded-xl p-6 flex flex-col justify-between border-l-2 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden',
                                metric.borderColor,
                                'border-y border-r border-y-white/5 border-r-white/5'
                            )}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h3 className="text-gray-400 text-xs font-bold tracking-wider uppercase">{metric.title}</h3>
                                <div className={cn('p-2 rounded-lg border border-[var(--c-border-sub)]', metric.iconBg, metric.iconColor)}>
                                    <metric.icon size={20} strokeWidth={2.5} />
                                </div>
                            </div>

                            <div className="relative z-10 mt-2">
                                <div className="text-3xl font-bold text-[var(--c-text)] mb-2 tracking-tight">{metric.value}</div>
                                {metric.subText && <span className="text-gray-500 font-medium text-sm">{metric.subText}</span>}
                            </div>
                        </div>

                        <div
                            className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-20 opacity-0 group-hover:opacity-100 rounded-xl"
                            style={{
                                background: 'radial-gradient(circle 250px at var(--mouse-x, 0) var(--mouse-y, 0), var(--spotlight-color), transparent 80%)'
                            }}
                        />
                    </div>
                )}
            />

            {/* Order Sync Data Table */}
            <div className="bg-[var(--c-raised)] rounded-xl shadow-lg border border-[var(--c-border-sub)] w-full overflow-hidden flex flex-col">
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead>
                            <tr className="bg-[var(--c-surface)]/80 text-xs uppercase tracking-wider text-gray-400 font-semibold border-b border-[var(--c-border-sub)]">
                                <th onClick={() => handleSort('runId')} className="px-6 py-4 w-20 text-center cursor-pointer hover:bg-white/5 group transition-colors">
                                    <div className="flex items-center justify-center">Run ID <SortIcon columnKey="runId" /></div>
                                </th>
                                <th onClick={() => handleSort('orderId')} className="px-6 py-4 w-32 cursor-pointer hover:bg-white/5 group transition-colors">
                                    <div className="flex items-center">Order ID <SortIcon columnKey="orderId" /></div>
                                </th>
                                <th onClick={() => handleSort('status')} className="px-6 py-4 w-32 text-center cursor-pointer hover:bg-white/5 group transition-colors">
                                    <div className="flex items-center justify-center">Status <SortIcon columnKey="status" /></div>
                                </th>
                                <th onClick={() => handleSort('retries')} className="px-6 py-4 w-28 text-center cursor-pointer hover:bg-white/5 group transition-colors">
                                    <div className="flex items-center justify-center">Retries <SortIcon columnKey="retries" /></div>
                                </th>
                                <th onClick={() => handleSort('durationMs')} className="px-6 py-4 w-32 text-right cursor-pointer hover:bg-white/5 group transition-colors">
                                    <div className="flex items-center justify-end">Duration <SortIcon columnKey="durationMs" /></div>
                                </th>
                                <th onClick={() => handleSort('cost')} className="px-6 py-4 w-28 text-right cursor-pointer hover:bg-white/5 group transition-colors">
                                    <div className="flex items-center justify-end">Cost <SortIcon columnKey="cost" /></div>
                                </th>
                                <th onClick={() => handleSort('syncedAt')} className="px-6 py-4 w-40 text-right cursor-pointer hover:bg-white/5 group transition-colors">
                                    <div className="flex items-center justify-end">Synced At <SortIcon columnKey="syncedAt" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium">
                            {sortedOrders.map((order, index) => (
                                <tr
                                    key={order.runId}
                                    className={cn(
                                        'border-b border-[var(--c-border-sub)] last:border-0 transition-colors duration-200 hover:bg-white/5',
                                        index % 2 === 0 ? 'bg-transparent' : 'bg-[var(--c-surface)]/30'
                                    )}
                                >
                                    <td className="px-6 py-4 text-center text-gray-300 font-mono text-xs">{order.runId}</td>
                                    <td className="px-6 py-4 text-[var(--c-text)] font-mono text-xs font-bold">{order.orderId}</td>

                                    <td className="px-6 py-4 text-center text-xs">
                                        <span
                                            className={cn(
                                                'px-2.5 py-1 font-bold rounded-full border',
                                                order.status === 'SUCCESS'
                                                    ? 'bg-[#00d9ff]/10 text-[#00d9ff] border-[#00d9ff]/20'
                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            )}
                                        >
                                            {order.status}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center">
                                            {order.retries > 0 && (
                                                <AlertTriangle size={14} className="text-amber-500 mr-1.5" />
                                            )}
                                            <span className={cn(
                                                "font-mono",
                                                order.retries > 0 ? "text-amber-500 font-bold" : "text-gray-400"
                                            )}>
                                                {order.retries}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 text-gray-300 text-right font-mono">
                                        {order.durationMs}ms
                                    </td>

                                    <td className="px-6 py-4 text-emerald-400 text-right font-mono">
                                        ${order.cost.toFixed(4)}
                                    </td>

                                    <td className="px-6 py-4 text-gray-400 text-right text-xs">
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

