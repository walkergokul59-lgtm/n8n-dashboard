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
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                isOpen
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
        >
            {isOpen ? <Clock3 size={13} /> : <CheckCircle2 size={13} />}
            {isOpen ? 'Open' : 'Closed'}
        </span>
    );
}

function TicketListItem({ ticket, isActive, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                isActive
                    ? 'border-[var(--c-accent)]/60 bg-[var(--c-accent)]/10'
                    : 'border-[var(--c-border-light)] bg-[var(--c-bg)] hover:border-[var(--c-accent)]/40'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--c-text)]">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-gray-400">{ticket.id}</p>
                </div>
                <StatusBadge status={ticket.status} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-400">
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

    return (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] pb-10">
            <aside className="space-y-5">
                <div className="rounded-xl border border-[var(--c-border-light)] bg-[var(--c-surface)]/80 p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--c-accent)]/15 text-[var(--c-accent)]">
                            <LifeBuoy size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--c-text)]">Support Chat</h2>
                            <p className="text-sm text-gray-400">
                                {isAdmin
                                    ? 'Review, reply to, and resolve client tickets.'
                                    : 'Create one open ticket at a time and chat with support.'}
                            </p>
                        </div>
                    </div>

                    {!isAdmin ? (
                        <div className="mt-4 rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-3 text-sm text-gray-300">
                            {hasOpenTicket
                                ? 'You already have an open support ticket.'
                                : 'No open ticket right now. You can create a new one.'}
                        </div>
                    ) : null}
                </div>

                <div className="rounded-xl border border-[var(--c-border-light)] bg-[var(--c-surface)]/80 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--c-text)]">
                                {isAdmin ? 'Ticket Queue' : 'Your Tickets'}
                            </h3>
                            <p className="text-xs text-gray-400">
                                {isAdmin ? 'Open tickets are pinned first.' : 'Closed tickets stay available in history.'}
                            </p>
                        </div>
                        {!isAdmin && canCreateTicket ? (
                            <button
                                type="button"
                                onClick={() => navigate('/support')}
                                className="inline-flex items-center gap-1 rounded-md border border-[var(--c-accent)]/40 bg-[var(--c-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--c-accent)]"
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
                                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                        statusFilter === filter
                                            ? 'bg-[var(--c-accent)] text-[var(--c-bg)]'
                                            : 'bg-[var(--c-bg)] text-gray-400 hover:text-[var(--c-text)]'
                                    }`}
                                >
                                    {filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>
                    ) : null}

                    {listError ? (
                        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                            {listError}
                        </div>
                    ) : null}

                    {isListLoading ? (
                        <p className="text-sm text-gray-400">Loading tickets...</p>
                    ) : visibleTickets.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[var(--c-border-light)] px-4 py-8 text-center text-sm text-gray-400">
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

            <section className="min-w-0 rounded-xl border border-[var(--c-border-light)] bg-[var(--c-surface)]/80 overflow-hidden">
                {showLoadingPanel ? (
                    <div className="flex min-h-[640px] items-center justify-center px-6 py-10 text-center text-sm text-gray-400">
                        Loading support workspace...
                    </div>
                ) : showCreatePanel ? (
                    <div className="space-y-6 p-6">
                        <div>
                            <h3 className="text-xl font-bold text-[var(--c-text)]">Create a Support Ticket</h3>
                            <p className="mt-1 text-sm text-gray-400">
                                Describe the issue clearly. The admin will receive an email with a direct link to your chat thread.
                            </p>
                        </div>

                        {detailError ? (
                            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                                {detailError}
                            </div>
                        ) : null}
                        {actionMessage ? (
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                {actionMessage}
                            </div>
                        ) : null}

                        <form onSubmit={handleCreateTicket} className="space-y-5">
                            <label className="block space-y-2">
                                <span className="text-sm font-medium text-[var(--c-text-dim)]">Subject *</span>
                                <input
                                    type="text"
                                    required
                                    maxLength={120}
                                    value={newSubject}
                                    onChange={(event) => setNewSubject(event.target.value)}
                                    placeholder="Brief summary of the issue"
                                    className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-accent)]/80"
                                />
                            </label>

                            <label className="block space-y-2">
                                <span className="text-sm font-medium text-[var(--c-text-dim)]">Message *</span>
                                <textarea
                                    required
                                    rows={8}
                                    maxLength={4000}
                                    value={newMessage}
                                    onChange={(event) => setNewMessage(event.target.value)}
                                    placeholder="Explain what is happening, what you expected, and any relevant context."
                                    className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-3 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-accent)]/80"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={isCreatingTicket}
                                className="inline-flex items-center gap-2 rounded-lg bg-[var(--c-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[var(--c-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Send size={16} />
                                {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
                            </button>
                        </form>
                    </div>
                ) : ticketId ? (
                    <div className="flex h-full min-h-[640px] flex-col">
                        <div className="border-b border-[var(--c-border-light)] px-6 py-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-xl font-bold text-[var(--c-text)]">
                                            {selectedTicket?.subject || 'Support Ticket'}
                                        </h3>
                                        {selectedTicket ? <StatusBadge status={selectedTicket.status} /> : null}
                                    </div>
                                    <p className="mt-2 text-sm text-gray-400">
                                        {selectedTicket?.id || ticketId}
                                    </p>
                                </div>

                                {isAdmin && selectedTicket?.status === 'open' ? (
                                    <button
                                        type="button"
                                        onClick={handleCloseTicket}
                                        disabled={isClosingTicket}
                                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isClosingTicket ? 'Closing...' : 'Close Ticket'}
                                    </button>
                                ) : null}
                            </div>

                            {selectedTicket ? (
                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-3">
                                        <p className="text-xs uppercase tracking-wider text-gray-500">Created</p>
                                        <p className="mt-1 text-sm text-[var(--c-text)]">{formatDateTime(selectedTicket.createdAt)}</p>
                                    </div>
                                    <div className="rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-3">
                                        <p className="text-xs uppercase tracking-wider text-gray-500">Last Activity</p>
                                        <p className="mt-1 text-sm text-[var(--c-text)]">{formatDateTime(selectedTicket.updatedAt)}</p>
                                    </div>
                                    <div className="rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-3">
                                        <p className="text-xs uppercase tracking-wider text-gray-500">Client</p>
                                        <p className="mt-1 text-sm text-[var(--c-text)]">{selectedTicket.clientName || 'Client'}</p>
                                    </div>
                                    <div className="rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-3">
                                        <p className="text-xs uppercase tracking-wider text-gray-500">Email</p>
                                        <p className="mt-1 text-sm text-[var(--c-text)]">{selectedTicket.clientEmail || 'Not available'}</p>
                                    </div>
                                </div>
                            ) : null}

                            {detailError ? (
                                <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                                    {detailError}
                                </div>
                            ) : null}
                            {actionMessage ? (
                                <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                                    {actionMessage}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex-1 space-y-4 overflow-auto bg-[var(--c-bg)]/40 px-6 py-6">
                            {isTicketLoading && !selectedTicket ? (
                                <p className="text-sm text-gray-400">Loading ticket...</p>
                            ) : selectedTicket?.messages?.length ? (
                                selectedTicket.messages.map((message) => {
                                    const isAdminMessage = message.authorRole === 'admin';
                                    return (
                                        <div
                                            key={message.id}
                                            className={`flex gap-3 ${isAdminMessage ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {!isAdminMessage ? (
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--c-border-light)] bg-[var(--c-surface)] text-gray-300">
                                                    <User size={16} />
                                                </div>
                                            ) : null}

                                            <div
                                                className={`max-w-[min(720px,100%)] rounded-2xl border px-4 py-3 shadow-sm ${
                                                    isAdminMessage
                                                        ? 'border-[var(--c-accent)]/30 bg-[var(--c-accent)]/10 text-[var(--c-text)]'
                                                        : 'border-[var(--c-border-light)] bg-[var(--c-surface)] text-[var(--c-text)]'
                                                }`}
                                            >
                                                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                                                    <span className="font-semibold text-[var(--c-text-dim)]">{message.authorLabel || 'Support'}</span>
                                                    <span className="text-gray-500">{formatDateTime(message.createdAt)}</span>
                                                </div>
                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
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
                                <div className="rounded-lg border border-dashed border-[var(--c-border-light)] px-4 py-10 text-center text-sm text-gray-400">
                                    No messages yet.
                                </div>
                            )}
                        </div>

                        <div className="border-t border-[var(--c-border-light)] bg-[var(--c-surface)] px-6 py-5">
                            {!canReply ? (
                                <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-4 py-3 text-sm text-gray-400">
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
                                        className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-3 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-accent)]/80"
                                    />
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs text-gray-500">
                                            Messages update automatically every few seconds.
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={isSendingReply}
                                            className="inline-flex items-center gap-2 rounded-lg bg-[var(--c-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[var(--c-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
                            <h3 className="mt-5 text-xl font-bold text-[var(--c-text)]">
                                {isAdmin ? 'Select a ticket' : 'Open a ticket from the list'}
                            </h3>
                            <p className="mt-2 text-sm text-gray-400">
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
