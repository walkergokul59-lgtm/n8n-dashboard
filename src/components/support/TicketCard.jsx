import { StatusBadge } from './StatusBadge';

function formatDateTime(value) {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function TicketCard({ ticket, isActive, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                isActive
                    ? 'border-[var(--c-accent)] bg-[var(--c-accent)]/5'
                    : 'border-[var(--c-border)] bg-[var(--c-surface)] hover:border-[var(--c-accent)]/40 hover:bg-[var(--c-hover)]'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isActive ? 'text-[var(--c-accent)]' : 'text-[var(--c-text)]'}`}>
                        {ticket.subject}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 font-medium">#{ticket.id}</p>
                </div>
                <StatusBadge status={ticket.status} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                <span className="truncate">{ticket.clientName || ticket.clientEmail || 'Client'}</span>
                <span>{formatDateTime(ticket.updatedAt)}</span>
            </div>
        </button>
    );
}
