/* UI redesign: replaced hardcoded grays with CSS vars, StatusBadge icons 14px, consistent typography */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    LifeBuoy,
    MessageSquare,
    Plus,
    Send,
    Shield,
    User,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';

const LIST_POLL_INTERVAL_MS = 15000;
const THREAD_POLL_INTERVAL_MS = 5000;

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

function sortTickets(left, right) {
    if (left.status !== right.status) {
        return left.status === 'open' ? -1 : 1;
    }
    return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
}

async function readErrorMessage(response, fallback) {
    const payload = await response.json().catch(() => ({}));
    return payload?.error || fallback;
}

function StatusBadge({ status }) {
    const isOpen = status === 'open';
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${
                isOpen
                    ? 'border-[var(--c-warning)]/30 bg-[var(--c-warning-bg)] text-[var(--c-warning-text)]'
                    : 'border-[var(--c-success)]/30 bg-[var(--c-success-bg)] text-[var(--c-success-text)]'
            }`}
        >
            {isOpen ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}
            {isOpen ? 'Open' : 'Closed'}
        </span>
    );
}

function TicketListItem({ ticket, isActive, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-[8px] border px-4 py-3 text-left transition ${
                isActive
                    ? 'border-[var(--c-accent)]/60 bg-[var(--c-accent)]/10'
                    : 'border-[var(--c-border)] bg-[var(--bg-base)] hover:border-[var(--c-accent)]/40'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[var(--c-text)]">{ticket.subject}</p>
                    <p className="mt-1 text-[12px] text-[var(--c-text-muted)]">{ticket.id}</p>
                </div>
                <StatusBadge status={ticket.status} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-[var(--c-text-muted)]">
                <span className="truncate">{ticket.clientName || ticket.clientEmail || 'Client'}</span>
                <span>{formatDateTime(ticket.updatedAt)}</span>
            </div>
        </button>
    );
}

export default function SupportChat() {
    const { apiFetch, user } = useAuth();
    const navigate = useNavigate();
    const { ticketId } = useParams();
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [statusFilter, setStatusFilter] = useState('open');
    const [newSubject, setNewSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [replyMessage, setReplyMessage] = useState('');
    const [listError, setListError] = useState('');
    const [detailError, setDetailError] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [isListLoading, setIsListLoading] = useState(true);
    const [isTicketLoading, setIsTicketLoading] = useState(false);
    const [isCreatingTicket, setIsCreatingTicket] = useState(false);
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [isClosingTicket, setIsClosingTicket] = useState(false);

    const isAdmin = user?.role === 'admin';
    const sortedTickets = useMemo(() => [...tickets].sort(sortTickets), [tickets]);
    const openTicket = useMemo(
        () => sortedTickets.find((ticket) => ticket.status === 'open') || null,
        [sortedTickets]
    );
    const visibleTickets = useMemo(() => {
        if (!isAdmin || statusFilter === 'all') return sortedTickets;
        return sortedTickets.filter((ticket) => ticket.status === statusFilter);
    }, [isAdmin, sortedTickets, statusFilter]);

    const fetchTickets = useCallback(async ({ showSpinner = false } = {}) => {
        if (showSpinner) setIsListLoading(true);
        try {
            const response = await apiFetch('/api/support', {
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Could not load support tickets.'));
            }

            const payload = await response.json();
            setTickets(Array.isArray(payload?.tickets) ? payload.tickets : []);
            setListError('');
        } catch (error) {
            setListError(error?.message || 'Could not load support tickets.');
        } finally {
            if (showSpinner) setIsListLoading(false);
        }
    }, [apiFetch]);

    const fetchTicket = useCallback(async (nextTicketId, { showSpinner = false } = {}) => {
        if (!nextTicketId) {
            setSelectedTicket(null);
            setDetailError('');
            return;
        }

        if (showSpinner) setIsTicketLoading(true);
        try {
            const response = await apiFetch(`/api/support/${encodeURIComponent(nextTicketId)}`, {
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Could not load support ticket.'));
            }

            const payload = await response.json();
            setSelectedTicket(payload?.ticket || null);
            setDetailError('');
        } catch (error) {
            setSelectedTicket(null);
            setDetailError(error?.message || 'Could not load support ticket.');
        } finally {
            if (showSpinner) setIsTicketLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        void fetchTickets({ showSpinner: true });
    }, [fetchTickets]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            void fetchTickets();
        }, LIST_POLL_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [fetchTickets]);

    useEffect(() => {
        if (isAdmin || ticketId) return;
        if (openTicket?.id) {
            navigate(`/support/${encodeURIComponent(openTicket.id)}`, { replace: true });
        }
    }, [isAdmin, navigate, openTicket?.id, ticketId]);

    useEffect(() => {
        if (!ticketId) {
            setSelectedTicket(null);
            setDetailError('');
            return;
        }
        void fetchTicket(ticketId, { showSpinner: true });
    }, [fetchTicket, ticketId]);

    useEffect(() => {
        if (!ticketId) return undefined;
        const intervalId = setInterval(() => {
            void fetchTicket(ticketId);
        }, THREAD_POLL_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [fetchTicket, ticketId]);

    const handleCreateTicket = async (event) => {
        event.preventDefault();
        setActionMessage('');
        setDetailError('');
        setIsCreatingTicket(true);

        try {
            const response = await apiFetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    subject: newSubject,
                    message: newMessage,
                }),
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Could not create support ticket.'));
            }

            const payload = await response.json();
            const createdTicket = payload?.ticket || null;
            const notification = payload?.notification || null;
            setNewSubject('');
            setNewMessage('');
            if (notification?.delivered) {
                const count = notification.adminCount || 1;
                setActionMessage(`Support ticket created. ${count > 1 ? `${count} admin` : 'Admin'} notification email${count > 1 ? 's' : ''} sent.`);
                setDetailError('');
            } else if (notification?.attempted) {
                setActionMessage('Support ticket created.');
                const failedResults = (notification.results || []).filter((r) => !r.delivered);
                setDetailError(
                    failedResults.length > 0
                        ? `Admin notification email${failedResults.length > 1 ? 's' : ''} failed to send.`
                        : 'Support ticket created, but admin notification emails were not sent.'
                );
            } else {
                setActionMessage('Support ticket created.');
                setDetailError('');
            }
            await fetchTickets();

            if (createdTicket?.id) {
                navigate(`/support/${encodeURIComponent(createdTicket.id)}`, { replace: true });
            }
        } catch (error) {
            setDetailError(error?.message || 'Could not create support ticket.');
        } finally {
            setIsCreatingTicket(false);
        }
    };

    const handleSendReply = async (event) => {
        event.preventDefault();
        if (!ticketId) return;

        setActionMessage('');
        setDetailError('');
        setIsSendingReply(true);

        try {
            const response = await apiFetch(`/api/support/${encodeURIComponent(ticketId)}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ message: replyMessage }),
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Could not send reply.'));
            }

            const payload = await response.json();
            setSelectedTicket(payload?.ticket || null);
            setReplyMessage('');
            setActionMessage('Reply sent.');
            await fetchTickets();
        } catch (error) {
            setDetailError(error?.message || 'Could not send reply.');
        } finally {
            setIsSendingReply(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!ticketId) return;

        setActionMessage('');
        setDetailError('');
        setIsClosingTicket(true);

        try {
            const response = await apiFetch(`/api/support/${encodeURIComponent(ticketId)}/close`, {
                method: 'POST',
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, 'Could not close support ticket.'));
            }

            const payload = await response.json();
            setSelectedTicket(payload?.ticket || null);
            setActionMessage('Ticket closed.');
            await fetchTickets();
        } catch (error) {
            setDetailError(error?.message || 'Could not close support ticket.');
        } finally {
            setIsClosingTicket(false);
        }
    };

    const hasOpenTicket = Boolean(openTicket);
    const canCreateTicket = !isAdmin && !hasOpenTicket;
    const canReply = Boolean(selectedTicket && selectedTicket.status === 'open');
    const showCreatePanel = canCreateTicket && !ticketId && !isListLoading;
    const showLoadingPanel = isListLoading && !ticketId;

    const inputClass = "w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--bg-base)] px-3 h-9 text-[14px] text-[var(--c-text)] outline-none focus:border-[var(--c-accent)] focus:ring-2 focus:ring-[var(--c-accent)]/20";
    const textareaClass = "w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--bg-base)] px-3 py-3 text-[14px] text-[var(--c-text)] outline-none focus:border-[var(--c-accent)] focus:ring-2 focus:ring-[var(--c-accent)]/20";

    return (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] pb-10">
            <aside className="space-y-5">
                <div className="rounded-[8px] border border-[var(--c-border)] bg-[var(--bg-surface)] p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[var(--c-accent)]/15 text-[var(--c-accent)]">
                            <LifeBuoy size={20} />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-semibold text-[var(--c-text)]">Support Chat</h2>
                            <p className="text-[14px] text-[var(--c-text-muted)]">
                                {isAdmin
                                    ? 'Review, reply to, and resolve client tickets.'
                                    : 'Create one open ticket at a time and chat with support.'}
                            </p>
                        </div>
                    </div>

                    {!isAdmin ? (
                        <div className="mt-4 rounded-[6px] border border-[var(--c-border)] bg-[var(--bg-base)] px-3 py-3 text-[14px] text-[var(--c-text-dim)]">
                            {hasOpenTicket
                                ? 'You already have an open support ticket.'
                                : 'No open ticket right now. You can create a new one.'}
                        </div>
                    ) : null}
                </div>

                <div className="rounded-[8px] border border-[var(--c-border)] bg-[var(--bg-surface)] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-[14px] font-semibold text-[var(--c-text)]">
                                {isAdmin ? 'Ticket Queue' : 'Your Tickets'}
                            </h3>
                            <p className="text-[12px] text-[var(--c-text-muted)]">
                                {isAdmin ? 'Open tickets are pinned first.' : 'Closed tickets stay available in history.'}
                            </p>
                        </div>
                        {!isAdmin && canCreateTicket ? (
                            <button
                                type="button"
                                onClick={() => navigate('/support')}
                                className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--c-accent)]/40 bg-[var(--c-accent)]/10 px-3 h-8 text-[12px] font-semibold text-[var(--c-accent)]"
                            >
                                <Plus size={14} />
                                New Ticket
                            </button>
                        ) : null}
                    </div>

                    {isAdmin ? (
                        <div className="mb-4 flex gap-2">
                            {['open', 'closed', 'all'].map((filter) => (
                                <button
                                    key={filter}
                                    type="button"
                                    onClick={() => setStatusFilter(filter)}
                                    className={`rounded-[6px] px-3 h-8 text-[12px] font-semibold transition ${
                                        statusFilter === filter
                                            ? 'bg-[var(--c-accent)] text-white'
                                            : 'bg-[var(--bg-base)] text-[var(--c-text-muted)] hover:text-[var(--c-text)]'
                                    }`}
                                >
                                    {filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>
                    ) : null}

                    {listError ? (
                        <div className="mb-4 rounded-[6px] border border-[var(--c-error)]/30 bg-[var(--c-error-bg)] px-3 py-2 text-[14px] text-[var(--c-error-text)]">
                            {listError}
                        </div>
                    ) : null}

                    {isListLoading ? (
                        <p className="text-[14px] text-[var(--c-text-muted)]">Loading tickets...</p>
                    ) : visibleTickets.length === 0 ? (
                        <div className="rounded-[6px] border border-dashed border-[var(--c-border)] px-4 py-8 text-center text-[14px] text-[var(--c-text-muted)]">
                            {isAdmin ? 'No support tickets match this filter.' : 'No support tickets yet.'}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {visibleTickets.map((ticket) => (
                                <TicketListItem
                                    key={ticket.id}
                                    ticket={ticket}
                                    isActive={ticket.id === ticketId}
                                    onClick={() => navigate(`/support/${encodeURIComponent(ticket.id)}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            <section className="min-w-0 rounded-[8px] border border-[var(--c-border)] bg-[var(--bg-surface)] overflow-hidden">
                {showLoadingPanel ? (
                    <div className="flex min-h-[640px] items-center justify-center px-6 py-10 text-center text-[14px] text-[var(--c-text-muted)]">
                        Loading support workspace...
                    </div>
                ) : showCreatePanel ? (
                    <div className="space-y-6 p-6">
                        <div>
                            <h3 className="text-[20px] font-semibold text-[var(--c-text)]">Create a Support Ticket</h3>
                            <p className="mt-1 text-[14px] text-[var(--c-text-muted)]">
                                Describe the issue clearly. The admin will receive an email with a direct link to your chat thread.
                            </p>
                        </div>

                        {detailError ? (
                            <div className="rounded-[6px] border border-[var(--c-error)]/30 bg-[var(--c-error-bg)] px-4 py-3 text-[14px] text-[var(--c-error-text)]">
                                {detailError}
                            </div>
                        ) : null}
                        {actionMessage ? (
                            <div className="rounded-[6px] border border-[var(--c-success)]/30 bg-[var(--c-success-bg)] px-4 py-3 text-[14px] text-[var(--c-success-text)]">
                                {actionMessage}
                            </div>
                        ) : null}

                        <form onSubmit={handleCreateTicket} className="space-y-5">
                            <label className="block space-y-2">
                                <span className="text-[13px] font-medium text-[var(--c-text-dim)]">Subject *</span>
                                <input
                                    type="text"
                                    required
                                    maxLength={120}
                                    value={newSubject}
                                    onChange={(event) => setNewSubject(event.target.value)}
                                    placeholder="Brief summary of the issue"
                                    className={inputClass}
                                />
                            </label>

                            <label className="block space-y-2">
                                <span className="text-[13px] font-medium text-[var(--c-text-dim)]">Message *</span>
                                <textarea
                                    required
                                    rows={8}
                                    maxLength={4000}
                                    value={newMessage}
                                    onChange={(event) => setNewMessage(event.target.value)}
                                    placeholder="Explain what is happening, what you expected, and any relevant context."
                                    className={textareaClass}
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={isCreatingTicket}
                                className="inline-flex items-center gap-2 rounded-[6px] bg-[var(--c-accent)] px-4 h-9 text-[14px] font-semibold text-white transition hover:bg-[var(--c-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Send size={16} />
                                {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
                            </button>
                        </form>
                    </div>
                ) : ticketId ? (
                    <div className="flex h-full min-h-[640px] flex-col">
                        <div className="border-b border-[var(--c-border)] px-6 py-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-[20px] font-semibold text-[var(--c-text)]">
                                            {selectedTicket?.subject || 'Support Ticket'}
                                        </h3>
                                        {selectedTicket ? <StatusBadge status={selectedTicket.status} /> : null}
                                    </div>
                                    <p className="mt-2 text-[14px] text-[var(--c-text-muted)]">
                                        {selectedTicket?.id || ticketId}
                                    </p>
                                </div>

                                {isAdmin && selectedTicket?.status === 'open' ? (
                                    <button
                                        type="button"
                                        onClick={handleCloseTicket}
                                        disabled={isClosingTicket}
                                        className="rounded-[6px] border border-[var(--c-success)]/30 bg-[var(--c-success-bg)] px-4 h-9 text-[14px] font-semibold text-[var(--c-success-text)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isClosingTicket ? 'Closing...' : 'Close Ticket'}
                                    </button>
                                ) : null}
                            </div>

                            {selectedTicket ? (
                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-[6px] border border-[var(--c-border)] bg-[var(--bg-base)] px-3 py-3">
                                        <p className="text-[12px] uppercase tracking-wider text-[var(--c-text-subtle)]">Created</p>
                                        <p className="mt-1 text-[14px] text-[var(--c-text)]">{formatDateTime(selectedTicket.createdAt)}</p>
                                    </div>
                                    <div className="rounded-[6px] border border-[var(--c-border)] bg-[var(--bg-base)] px-3 py-3">
                                        <p className="text-[12px] uppercase tracking-wider text-[var(--c-text-subtle)]">Last Activity</p>
                                        <p className="mt-1 text-[14px] text-[var(--c-text)]">{formatDateTime(selectedTicket.updatedAt)}</p>
                                    </div>
                                    <div className="rounded-[6px] border border-[var(--c-border)] bg-[var(--bg-base)] px-3 py-3">
                                        <p className="text-[12px] uppercase tracking-wider text-[var(--c-text-subtle)]">Client</p>
                                        <p className="mt-1 text-[14px] text-[var(--c-text)]">{selectedTicket.clientName || 'Client'}</p>
                                    </div>
                                    <div className="rounded-[6px] border border-[var(--c-border)] bg-[var(--bg-base)] px-3 py-3">
                                        <p className="text-[12px] uppercase tracking-wider text-[var(--c-text-subtle)]">Email</p>
                                        <p className="mt-1 text-[14px] text-[var(--c-text)]">{selectedTicket.clientEmail || 'Not available'}</p>
                                    </div>
                                </div>
                            ) : null}

                            {detailError ? (
                                <div className="mt-4 rounded-[6px] border border-[var(--c-error)]/30 bg-[var(--c-error-bg)] px-4 py-3 text-[14px] text-[var(--c-error-text)]">
                                    {detailError}
                                </div>
                            ) : null}
                            {actionMessage ? (
                                <div className="mt-4 rounded-[6px] border border-[var(--c-success)]/30 bg-[var(--c-success-bg)] px-4 py-3 text-[14px] text-[var(--c-success-text)]">
                                    {actionMessage}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex-1 space-y-4 overflow-auto bg-[var(--bg-base)]/40 px-6 py-6">
                            {isTicketLoading && !selectedTicket ? (
                                <p className="text-[14px] text-[var(--c-text-muted)]">Loading ticket...</p>
                            ) : selectedTicket?.messages?.length ? (
                                selectedTicket.messages.map((message) => {
                                    const isAdminMessage = message.authorRole === 'admin';
                                    return (
                                        <div
                                            key={message.id}
                                            className={`flex gap-3 ${isAdminMessage ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {!isAdminMessage ? (
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--c-border)] bg-[var(--bg-surface)] text-[var(--c-text-dim)]">
                                                    <User size={16} />
                                                </div>
                                            ) : null}

                                            <div
                                                className={`max-w-[min(720px,100%)] rounded-2xl border px-4 py-3 shadow-sm ${
                                                    isAdminMessage
                                                        ? 'border-[var(--c-accent)]/30 bg-[var(--c-accent)]/10 text-[var(--c-text)]'
                                                        : 'border-[var(--c-border)] bg-[var(--bg-surface)] text-[var(--c-text)]'
                                                }`}
                                            >
                                                <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
                                                    <span className="font-semibold text-[var(--c-text-dim)]">{message.authorLabel || 'Support'}</span>
                                                    <span className="text-[var(--c-text-subtle)]">{formatDateTime(message.createdAt)}</span>
                                                </div>
                                                <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{message.body}</p>
                                            </div>

                                            {isAdminMessage ? (
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--c-accent)]/30 bg-[var(--c-accent)]/10 text-[var(--c-accent)]">
                                                    <Shield size={16} />
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-[6px] border border-dashed border-[var(--c-border)] px-4 py-10 text-center text-[14px] text-[var(--c-text-muted)]">
                                    No messages yet.
                                </div>
                            )}
                        </div>

                        <div className="border-t border-[var(--c-border)] bg-[var(--bg-surface)] px-6 py-5">
                            {!canReply ? (
                                <div className="flex items-center gap-2 rounded-[6px] border border-[var(--c-border)] bg-[var(--bg-base)] px-4 py-3 text-[14px] text-[var(--c-text-muted)]">
                                    <AlertCircle size={16} />
                                    This ticket is closed. New messages are disabled.
                                </div>
                            ) : (
                                <form onSubmit={handleSendReply} className="space-y-3">
                                    <textarea
                                        rows={4}
                                        maxLength={4000}
                                        required
                                        value={replyMessage}
                                        onChange={(event) => setReplyMessage(event.target.value)}
                                        placeholder={isAdmin ? 'Reply to the client...' : 'Add more details for support...'}
                                        className={textareaClass}
                                    />
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[12px] text-[var(--c-text-subtle)]">
                                            Messages update automatically every few seconds.
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={isSendingReply}
                                            className="inline-flex items-center gap-2 rounded-[6px] bg-[var(--c-accent)] px-4 h-9 text-[14px] font-semibold text-white transition hover:bg-[var(--c-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Send size={16} />
                                            {isSendingReply ? 'Sending...' : 'Send Reply'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-[640px] items-center justify-center px-6 py-10 text-center">
                        <div className="max-w-md">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-accent)]/10 text-[var(--c-accent)]">
                                <MessageSquare size={24} />
                            </div>
                            <h3 className="mt-5 text-[20px] font-semibold text-[var(--c-text)]">
                                {isAdmin ? 'Select a ticket' : 'Open a ticket from the list'}
                            </h3>
                            <p className="mt-2 text-[14px] text-[var(--c-text-muted)]">
                                {isAdmin
                                    ? 'Choose a client ticket from the queue to open the support chat and resolve the issue.'
                                    : 'Pick one of your previous tickets from the left, or create a new one if nothing is open.'}
                            </p>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
