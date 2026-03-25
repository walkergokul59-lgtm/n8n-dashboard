/* UI redesign: replaced hardcoded emerald/rose with CSS var status colors */
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function RecentFailures({ count = 0 }) {
    return (
        <div className="bg-[var(--bg-elevated)] rounded-[8px] p-6 shadow-lg border border-[var(--c-border)] w-full flex flex-col relative overflow-hidden group">
            <div className="dark-only absolute top-0 right-0 w-32 h-32 bg-[var(--c-error)]/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity duration-300 group-hover:bg-[var(--c-error)]/10"></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-[var(--c-text)] font-semibold text-[16px] flex items-center">
                    <AlertTriangle className="mr-2 text-[var(--c-error)]" size={20} />
                    Recent Failures
                </h3>
                <span className="text-[12px] font-medium px-2 py-1 rounded-[4px] bg-[var(--c-error-bg)] text-[var(--c-error-text)] border border-[var(--c-error)]/20">
                    Last 24h
                </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 relative z-10">
                {count > 0 ? (
                    <>
                        <div className="w-16 h-16 rounded-full bg-[var(--c-error-bg)] flex items-center justify-center mb-4 border border-[var(--c-error)]/20">
                            <XCircle className="text-[var(--c-error)]" size={32} />
                        </div>
                        <div className="text-[24px] font-semibold text-[var(--c-text)] mb-2">{count}</div>
                        <p className="text-[var(--c-text-muted)] text-[14px] font-medium">Failures detected</p>
                        <p className="text-[var(--c-text-subtle)] text-[12px] mt-1">Investigate recent error executions</p>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 rounded-full bg-[var(--c-success-bg)] flex items-center justify-center mb-4 border border-[var(--c-success)]/20">
                            <CheckCircle2 className="text-[var(--c-success)]" size={32} />
                        </div>
                        <div className="text-[24px] font-semibold text-[var(--c-text)] mb-2">0</div>
                        <p className="text-[var(--c-text-muted)] text-[14px] font-medium">No failures detected</p>
                        <p className="text-[var(--c-text-subtle)] text-[12px] mt-1">All workflows are running smoothly</p>
                    </>
                )}
            </div>
        </div>
    );
}
