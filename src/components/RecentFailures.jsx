import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function RecentFailures({ count = 0 }) {
    return (
        <div className="bg-[var(--c-raised)] rounded-xl p-6 shadow-lg border border-[var(--c-border-sub)] w-full flex flex-col relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity duration-300 group-hover:bg-rose-500/10"></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-[var(--c-text)] font-semibold text-lg flex items-center">
                    <AlertTriangle className="mr-2 text-rose-400" size={20} />
                    Recent Failures
                </h3>
                <span className="text-xs font-medium px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Last 24h
                </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 relative z-10">
                {count > 0 ? (
                    <>
                        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20">
                            <XCircle className="text-rose-400" size={32} />
                        </div>
                        <div className="text-3xl font-bold text-[var(--c-text)] mb-2">{count}</div>
                        <p className="text-gray-400 text-sm font-medium">Failures detected</p>
                        <p className="text-gray-500 text-xs mt-1">Investigate recent error executions</p>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
                            <CheckCircle2 className="text-emerald-400" size={32} />
                        </div>
                        <div className="text-3xl font-bold text-[var(--c-text)] mb-2">0</div>
                        <p className="text-gray-400 text-sm font-medium">No failures detected</p>
                        <p className="text-gray-500 text-xs mt-1">All workflows are running smoothly</p>
                    </>
                )}
            </div>
        </div>
    );
}
