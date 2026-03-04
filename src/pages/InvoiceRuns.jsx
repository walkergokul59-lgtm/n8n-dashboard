import React from 'react';
import { FileText, CheckCircle2, DollarSign, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getInvoiceRuns } from '../utils/mock-data';
import ChromaGrid from '../components/ChromaGrid';
import { useDashboardData } from '../hooks/useDashboardData';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function InvoiceRuns() {
    const { data: invoices, isLoading } = useDashboardData(getInvoiceRuns);
    const runs = Array.isArray(invoices) ? invoices : [];

    // Top KPI Metrics
    const metrics = [
        {
            title: 'TOTAL INVOICES',
            value: '20',
            icon: FileText,
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-500/10',
            borderColor: 'border-l-amber-500',
        },
        {
            title: 'SUCCESS RATE',
            value: '95%',
            subText: '1 failed',
            icon: CheckCircle2,
            iconColor: 'text-emerald-400',
            iconBg: 'bg-emerald-400/10',
            borderColor: 'border-l-emerald-400',
        },
        {
            title: 'OCR COST',
            value: '$0.24',
            icon: DollarSign,
            iconColor: 'text-emerald-400',
            iconBg: 'bg-emerald-400/10',
            borderColor: 'border-l-emerald-400',
        },
        {
            title: 'AVG PROCESSING',
            value: '2.4s',
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

    return (
        <div className="space-y-6 pb-10">
            {/* Metrics Header */}
            <ChromaGrid
                items={metrics}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6"
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

            {/* Invoice Data Table */}
            <div className="bg-[var(--c-raised)] rounded-xl shadow-lg border border-[var(--c-border-sub)] w-full overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[var(--c-border-sub)]">
                    <h3 className="text-[var(--c-text)] font-semibold text-lg flex items-center">
                        <FileText className="mr-2 text-primary" size={20} />
                        Recent Invoice Runs
                    </h3>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead>
                            <tr className="bg-[var(--c-surface)]/80 text-xs uppercase tracking-wider text-gray-400 font-semibold border-b border-[var(--c-border-sub)]">
                                <th className="px-6 py-4 w-20 text-center">Run ID</th>
                                <th className="px-6 py-4 w-32">Invoice ID</th>
                                <th className="px-6 py-4 w-40">Source</th>
                                <th className="px-6 py-4 w-32 text-center">Status</th>
                                <th className="px-6 py-4 w-24 text-right">OCR Cost</th>
                                <th className="px-6 py-4 w-36 text-right">Processing Time</th>
                                <th className="px-6 py-4 w-40 text-right">Processed At</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium">
                            {isLoading && runs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                                        Loading invoice runs…
                                    </td>
                                </tr>
                            ) : null}

                            {runs.map((run, index) => (
                                <tr
                                    key={run.runId}
                                    className={cn(
                                        'border-b border-[var(--c-border-sub)] last:border-0 transition-colors duration-200 hover:bg-white/5',
                                        index % 2 === 0 ? 'bg-transparent' : 'bg-[var(--c-surface)]/30'
                                    )}
                                >
                                    <td className="px-6 py-4 text-center text-gray-300 font-mono text-xs">{run.runId}</td>
                                    <td className="px-6 py-4 text-[#00d9ff] font-bold font-mono text-xs">{run.invoiceId}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#2a3441] text-gray-300 border border-[var(--c-border-light)]">
                                            {run.source.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs">
                                        <span
                                            className={cn(
                                                'px-2.5 py-1 font-bold rounded-full border',
                                                run.status === 'SUCCESS'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            )}
                                        >
                                            {run.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-300 text-right font-mono">${run.ocrCost.toFixed(4)}</td>
                                    <td className="px-6 py-4 text-amber-400 text-right font-mono">{run.processingTimeMs}ms</td>
                                    <td className="px-6 py-4 text-gray-400 text-right text-xs">{formatDate(run.processedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
