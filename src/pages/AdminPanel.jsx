/* UI redesign: replaced hardcoded colors with CSS vars, standardized input/button heights, consistent typography */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';

function unique(values) {
    return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
}

function roleOptions() {
    return ['client', 'admin'];
}

function approvalStatusOptions() {
    return ['pending', 'approved', 'rejected'];
}

function WorkflowMultiSelectDropdown({
    workflows,
    selectedWorkflowIds,
    isOpen,
    searchTerm,
    onToggleOpen,
    onSearchChange,
    onToggleWorkflow,
    onSelectAllVisible,
    onClearAll,
}) {
    const selectedSet = new Set((selectedWorkflowIds || []).map(String));
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    const filteredWorkflows = workflows.filter((workflow) => {
        if (!normalizedSearch) return true;
        const name = String(workflow?.name || '').toLowerCase();
        const id = String(workflow?.id || '').toLowerCase();
        return name.includes(normalizedSearch) || id.includes(normalizedSearch);
    });

    return (
        <div className="relative">
            <button
                type="button"
                onClick={onToggleOpen}
                className="w-full text-left bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[6px] px-3 h-9 flex items-center text-[14px] text-[var(--c-text)] hover:border-[var(--c-accent)] transition-colors"
            >
                {selectedSet.size > 0 ? `${selectedSet.size} workflow(s) selected` : 'Select workflows'}
            </button>

            {isOpen ? (
                <div className="absolute z-30 mt-2 w-full bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[8px] shadow-xl">
                    <div className="p-2 border-b border-[var(--c-border)]">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Search workflows"
                            className="w-full bg-[var(--bg-surface)] border border-[var(--c-border)] rounded-[6px] px-2 h-8 text-[13px] text-[var(--c-text)]"
                        />
                    </div>

                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--c-border)]">
                        <button
                            type="button"
                            onClick={onSelectAllVisible}
                            className="text-[12px] text-[var(--c-accent)] hover:underline"
                        >
                            Select visible
                        </button>
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="text-[12px] text-[var(--c-error-text)] hover:underline"
                        >
                            Clear
                        </button>
                    </div>

                    <div className="max-h-56 overflow-auto p-2 space-y-1">
                        {filteredWorkflows.length === 0 ? (
                            <p className="text-[12px] text-[var(--c-text-muted)] px-1 py-2">No workflows match search.</p>
                        ) : (
                            filteredWorkflows.map((workflow) => {
                                const workflowId = String(workflow.id);
                                const selected = selectedSet.has(workflowId);
                                return (
                                    <label key={workflowId} className="flex items-center gap-2 text-[13px] text-[var(--c-text-dim)] px-1 py-1 rounded hover:bg-[var(--c-overlay-hover)]">
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => onToggleWorkflow(workflowId)}
                                        />
                                        <span className="truncate">{workflow.name || workflowId}</span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function AdminPanel() {
    const { apiFetch } = useAuth();
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [saveMessage, setSaveMessage] = useState('');
    const [openWorkflowPickerFor, setOpenWorkflowPickerFor] = useState('');
    const [workflowSearchByClientId, setWorkflowSearchByClientId] = useState({});

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [rbacRes, workflowsRes] = await Promise.all([
                    apiFetch('/api/admin/rbac', { headers: { Accept: 'application/json' } }),
                    apiFetch('/api/dashboard/workflows', { headers: { Accept: 'application/json' } }),
                ]);

                if (!rbacRes.ok) throw new Error((await rbacRes.json().catch(() => ({})))?.error || 'Failed to load RBAC');
                if (!workflowsRes.ok) throw new Error((await workflowsRes.json().catch(() => ({})))?.error || 'Failed to load workflows');

                const rbac = await rbacRes.json();
                const workflowPayload = await workflowsRes.json();

                if (!mounted) return;
                setUsers(Array.isArray(rbac?.users) ? rbac.users : []);
                setClients(Array.isArray(rbac?.clients) ? rbac.clients : []);
                setWorkflows(Array.isArray(workflowPayload?.data) ? workflowPayload.data : []);
            } catch (err) {
                if (mounted) setError(err?.message || 'Failed to load admin data');
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        void load();
        return () => {
            mounted = false;
        };
    }, [apiFetch]);

    const clientOptions = useMemo(() => clients.map((client) => ({ id: client.id, name: client.name })), [clients]);
    const pendingApprovalsCount = useMemo(
        () => users.filter((user) => user.role !== 'admin' && user.approvalStatus === 'pending').length,
        [users]
    );

    const addClient = () => {
        const nextId = `client-${Date.now()}`;
        setClients((prev) => [...prev, { id: nextId, name: `New Client ${prev.length + 1}`, workflowIds: [], tier: 'free', tierSetAt: null }]);
    };

    const updateClient = (idx, patch) => {
        setClients((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    };

    const addUser = () => {
        setUsers((prev) => [
            ...prev,
            {
                id: `user-${Date.now()}`,
                email: '',
                password: 'changeme',
                role: 'client',
                clientId: clientOptions[0]?.id || '',
                approvalStatus: 'approved',
            },
        ]);
    };

    const saveAll = async () => {
        setError('');
        setSaveMessage('');
        setIsSaving(true);
        try {
            const payload = {
                users: users.map((user) => ({
                    ...user,
                    email: String(user.email || '').trim().toLowerCase(),
                    password: String(user.password || ''),
                    role: roleOptions().includes(user.role) ? user.role : 'client',
                    approvalStatus: approvalStatusOptions().includes(user.approvalStatus) ? user.approvalStatus : 'approved',
                })).filter((user) => user.email),
                clients: clients.map((client) => ({
                    ...client,
                    workflowIds: unique(client.workflowIds),
                })),
            };

            const response = await apiFetch('/api/admin/rbac', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const fail = await response.json().catch(() => ({}));
                throw new Error(fail?.error || 'Save failed');
            }

            const saved = await response.json();
            setUsers(saved?.users || []);
            setClients(saved?.clients || []);
            setSaveMessage('Access mapping saved');
        } catch (err) {
            setError(err?.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="text-[var(--c-text-muted)] text-[14px]">Loading admin panel...</div>;
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[20px] font-semibold text-[var(--c-text)]">Admin Panel</h2>
                    <p className="text-[14px] text-[var(--c-text-muted)]">Manage users, roles, clients, and workflow access.</p>
                </div>
                <button
                    type="button"
                    onClick={saveAll}
                    disabled={isSaving}
                    className="h-9 px-4 rounded-[6px] bg-[var(--c-accent)] text-[var(--c-bg)] text-[14px] font-semibold disabled:opacity-70"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {error ? <p className="text-[13px] text-[var(--c-error-text)]">{error}</p> : null}
            {saveMessage ? <p className="text-[13px] text-[var(--c-success-text)]">{saveMessage}</p> : null}
            <p className="text-[13px] text-[var(--c-warning-text)]">Pending client approvals: {pendingApprovalsCount}</p>

            <section className="bg-[var(--bg-elevated)] border border-[var(--c-border)] rounded-[8px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[var(--c-text)] text-[16px] font-semibold">Users</h3>
                    <button type="button" onClick={addUser} className="text-[12px] h-8 px-3 rounded-[6px] bg-[var(--c-hover)] border border-[var(--c-border)] text-[var(--c-text-dim)]">
                        Add User
                    </button>
                </div>
                {users.map((user, index) => (
                    <div key={user.id || index} className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-[var(--bg-surface)] border border-[var(--c-border)] rounded-[8px] p-3">
                        <input
                            type="email"
                            value={user.email || ''}
                            onChange={(event) => {
                                const next = [...users];
                                next[index] = { ...next[index], email: event.target.value };
                                setUsers(next);
                            }}
                            placeholder="email"
                            className="bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[6px] px-2 h-9 text-[13px] text-[var(--c-text)]"
                        />
                        <input
                            type="text"
                            value={user.password || ''}
                            onChange={(event) => {
                                const next = [...users];
                                next[index] = { ...next[index], password: event.target.value };
                                setUsers(next);
                            }}
                            placeholder="password"
                            className="bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[6px] px-2 h-9 text-[13px] text-[var(--c-text)]"
                        />
                        <select
                            value={user.role || 'client'}
                            onChange={(event) => {
                                const next = [...users];
                                next[index] = { ...next[index], role: event.target.value };
                                setUsers(next);
                            }}
                            className="bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[6px] px-2 h-9 text-[13px] text-[var(--c-text)]"
                        >
                            {roleOptions().map((role) => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                        <select
                            value={user.clientId || ''}
                            onChange={(event) => {
                                const next = [...users];
                                next[index] = { ...next[index], clientId: event.target.value };
                                setUsers(next);
                            }}
                            className="bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[6px] px-2 h-9 text-[13px] text-[var(--c-text)]"
                            disabled={user.role === 'admin'}
                        >
                            <option value="">No client</option>
                            {clientOptions.map((client) => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                        <select
                            value={user.approvalStatus || 'approved'}
                            onChange={(event) => {
                                const next = [...users];
                                next[index] = { ...next[index], approvalStatus: event.target.value };
                                setUsers(next);
                            }}
                            className="bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[6px] px-2 h-9 text-[13px] text-[var(--c-text)]"
                            disabled={user.role === 'admin'}
                        >
                            {approvalStatusOptions().map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setUsers((prev) => prev.filter((_, i) => i !== index))}
                            className="bg-[var(--c-error-bg)] text-[var(--c-error-text)] rounded-[6px] h-9 px-2 text-[13px] font-medium"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </section>

            <section className="bg-[var(--bg-elevated)] border border-[var(--c-border)] rounded-[8px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[var(--c-text)] text-[16px] font-semibold">Clients</h3>
                    <button type="button" onClick={addClient} className="text-[12px] h-8 px-3 rounded-[6px] bg-[var(--c-hover)] border border-[var(--c-border)] text-[var(--c-text-dim)]">
                        Add Client
                    </button>
                </div>

                {clients.map((client, clientIndex) => (
                    <div key={client.id} className="bg-[var(--bg-surface)] border border-[var(--c-border)] rounded-[8px] p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                                type="text"
                                value={client.id || ''}
                                onChange={(event) => {
                                    const next = [...clients];
                                    next[clientIndex] = { ...next[clientIndex], id: event.target.value };
                                    setClients(next);
                                }}
                                placeholder="client id"
                                className="bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[6px] px-2 h-9 text-[13px] text-[var(--c-text)]"
                            />
                            <input
                                type="text"
                                value={client.name || ''}
                                onChange={(event) => {
                                    const next = [...clients];
                                    next[clientIndex] = { ...next[clientIndex], name: event.target.value };
                                    setClients(next);
                                }}
                                placeholder="client name"
                                className="bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[6px] px-2 h-9 text-[13px] text-[var(--c-text)]"
                            />
                            <button
                                type="button"
                                onClick={() => setClients((prev) => prev.filter((_, i) => i !== clientIndex))}
                                className="bg-[var(--c-error-bg)] text-[var(--c-error-text)] rounded-[6px] h-9 px-2 text-[13px] font-medium"
                            >
                                Remove Client
                            </button>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex flex-col gap-1">
                                <p className="text-[12px] uppercase tracking-wider text-[var(--c-text-muted)]">Subscription Tier</p>
                                <select
                                    value={client.tier || 'free'}
                                    onChange={(event) => {
                                        const newTier = event.target.value;
                                        updateClient(clientIndex, {
                                            tier: newTier,
                                            tierSetAt: newTier !== 'free' ? new Date().toISOString() : null,
                                        });
                                    }}
                                    className="bg-[var(--bg-base)] border border-[var(--c-border)] rounded-[6px] px-2 h-9 text-[13px] text-[var(--c-text)]"
                                >
                                    <option value="free">Free</option>
                                    <option value="platinum">Platinum</option>
                                    <option value="gold">Gold</option>
                                </select>
                            </div>
                            {client.tier && client.tier !== 'free' && client.tierSetAt && (
                                <p className="text-[12px] text-[var(--c-warning-text)] self-end pb-1.5">
                                    Expires: {new Date(new Date(client.tierSetAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </p>
                            )}
                        </div>

                        <div>
                            <p className="text-[12px] uppercase tracking-wider text-[var(--c-text-muted)] mb-2">Allowed Workflows</p>
                            {workflows.length === 0 ? (
                                <p className="text-[14px] text-[var(--c-text-muted)]">No workflows discovered yet.</p>
                            ) : (
                                <WorkflowMultiSelectDropdown
                                    workflows={workflows}
                                    selectedWorkflowIds={client.workflowIds || []}
                                    isOpen={openWorkflowPickerFor === client.id}
                                    searchTerm={workflowSearchByClientId[client.id] || ''}
                                    onToggleOpen={() => {
                                        setOpenWorkflowPickerFor((current) => (current === client.id ? '' : client.id));
                                    }}
                                    onSearchChange={(value) => {
                                        setWorkflowSearchByClientId((prev) => ({ ...prev, [client.id]: value }));
                                    }}
                                    onToggleWorkflow={(workflowId) => {
                                        const selectedSet = new Set((client.workflowIds || []).map(String));
                                        if (selectedSet.has(workflowId)) selectedSet.delete(workflowId);
                                        else selectedSet.add(workflowId);
                                        const next = [...clients];
                                        next[clientIndex] = { ...next[clientIndex], workflowIds: [...selectedSet] };
                                        setClients(next);
                                    }}
                                    onSelectAllVisible={() => {
                                        const searchTerm = String(workflowSearchByClientId[client.id] || '').trim().toLowerCase();
                                        const visible = workflows
                                            .filter((workflow) => {
                                                if (!searchTerm) return true;
                                                const name = String(workflow?.name || '').toLowerCase();
                                                const id = String(workflow?.id || '').toLowerCase();
                                                return name.includes(searchTerm) || id.includes(searchTerm);
                                            })
                                            .map((workflow) => String(workflow.id));
                                        const selectedSet = new Set((client.workflowIds || []).map(String));
                                        for (const id of visible) selectedSet.add(id);
                                        const next = [...clients];
                                        next[clientIndex] = { ...next[clientIndex], workflowIds: [...selectedSet] };
                                        setClients(next);
                                    }}
                                    onClearAll={() => {
                                        const next = [...clients];
                                        next[clientIndex] = { ...next[clientIndex], workflowIds: [] };
                                        setClients(next);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}
