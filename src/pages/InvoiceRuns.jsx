/* UI redesign: replaced hardcoded hex/grays with CSS vars, consistent typography and spacing */
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

    const metrics = [
        {
            title: 'TOTAL INVOICES',
            value: '20',
            icon: FileText,
            iconColor: 'text-[var(--c-warning)]',
            iconBg: 'bg-[var(--c-warning)]/10',
            borderColor: 'border-l-[var(--c-warning)]',
        },
        {
            title: 'SUCCESS RATE',
            value: '95%',
            subText: '1 failed',
            icon: CheckCircle2,
            iconColor: 'text-[var(--c-success)]',
            iconBg: 'bg-[var(--c-success)]/10',
            borderColor: 'border-l-[var(--c-success)]',
        },
        {
            title: 'OCR COST',
            value: '$0.24',
            icon: DollarSign,
            iconColor: 'text-[var(--c-success)]',
            iconBg: 'bg-[var(--c-success)]/10',
            borderColor: 'border-l-[var(--c-success)]',
        },
        {
            title: 'AVG PROCESSING',
            value: '2.4s',
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

    return (
        <div className="space-y-6 pb-10">
            <ChromaGrid
                items={metrics}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6"
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
                <div className="p-6 border-b border-[var(--c-border)]">
                    <h3 className="text-[var(--c-text)] font-semibold text-[16px] flex items-center">
                        <FileText className="mr-2 text-[var(--c-accent)]" size={20} />
                        Recent Invoice Runs
                    </h3>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead>
                            <tr className="bg-[var(--bg-surface)] text-[12px] uppercase tracking-wider text-[var(--c-text-muted)] font-semibold border-b border-[var(--c-border)]">
                                <th className="px-6 py-4 w-20 text-center">Run ID</th>
                                <th className="px-6 py-4 w-32">Invoice ID</th>
                                <th className="px-6 py-4 w-40">Source</th>
                                <th className="px-6 py-4 w-32 text-center">Status</th>
                                <th className="px-6 py-4 w-24 text-right">OCR Cost</th>
                                <th className="px-6 py-4 w-36 text-right">Processing Time</th>
                                <th className="px-6 py-4 w-40 text-right">Processed At</th>
                            </tr>
                        </thead>
                        <tbody className="text-[14px] font-medium">
                            {isLoading && runs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-[var(--c-text-muted)]">
                                        Loading invoice runs…
                                    </td>
                                </tr>
                            ) : null}

                            {runs.map((run, index) => (
                                <tr
                                    key={run.runId}
                                    className={cn(
                                        'border-b border-[var(--c-border)] last:border-0 transition-colors duration-200 hover:bg-[var(--c-overlay-hover)]',
                                        index % 2 === 0 ? 'bg-transparent' : 'bg-[var(--bg-surface)]/30'
                                    )}
                                >
                                    <td className="px-6 py-[11px] text-center text-[var(--c-text-dim)] font-mono text-[12px]">{run.runId}</td>
                                    <td className="px-6 py-[11px] text-[var(--c-accent)] font-semibold font-mono text-[12px]">{run.invoiceId}</td>
                                    <td className="px-6 py-[11px]">
                                        <span className="px-2.5 py-1 text-[12px] font-semibold rounded-[6px] bg-[var(--bg-elevated)] text-[var(--c-text-dim)] border border-[var(--c-border)]">
                                            {run.source.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-[11px] text-center text-[12px]">
                                        <span
                                            className={cn(
                                                'px-2.5 py-1 font-semibold rounded-full border',
                                                run.status === 'SUCCESS'
                                                    ? 'bg-[var(--c-success-bg)] text-[var(--c-success-text)] border-[var(--c-success)]/20'
                                                    : 'bg-[var(--c-error-bg)] text-[var(--c-error-text)] border-[var(--c-error)]/20'
                                            )}
                                        >
                                            {run.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-[11px] text-[var(--c-text-dim)] text-right font-mono">${run.ocrCost.toFixed(4)}</td>
                                    <td className="px-6 py-[11px] text-[var(--c-warning)] text-right font-mono">{run.processingTimeMs}ms</td>
                                    <td className="px-6 py-[11px] text-[var(--c-text-muted)] text-right text-[12px]">{formatDate(run.processedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
