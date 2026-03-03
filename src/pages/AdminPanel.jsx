import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';

function unique(values) {
    return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
}

function roleOptions() {
    return ['client', 'admin'];
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

    const addClient = () => {
        const nextId = `client-${Date.now()}`;
        setClients((prev) => [...prev, { id: nextId, name: `New Client ${prev.length + 1}`, workflowIds: [] }]);
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
        return <div className="text-gray-300">Loading admin panel...</div>;
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Admin Panel</h2>
                    <p className="text-sm text-gray-400">Manage users, roles, clients, and workflow access.</p>
                </div>
                <button
                    type="button"
                    onClick={saveAll}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg bg-[#00d9ff] text-[#0f1419] font-semibold disabled:opacity-70"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {saveMessage ? <p className="text-sm text-emerald-400">{saveMessage}</p> : null}

            <section className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Users</h3>
                    <button type="button" onClick={addUser} className="text-xs px-3 py-1 rounded bg-white/10 text-gray-200">
                        Add User
                    </button>
                </div>
                {users.map((user, index) => (
                    <div key={user.id || index} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#141a21] border border-white/10 rounded-lg p-3">
                        <input
                            type="email"
                            value={user.email || ''}
                            onChange={(event) => {
                                const next = [...users];
                                next[index] = { ...next[index], email: event.target.value };
                                setUsers(next);
                            }}
                            placeholder="email"
                            className="bg-[#0f1419] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
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
                            className="bg-[#0f1419] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                        />
                        <select
                            value={user.role || 'client'}
                            onChange={(event) => {
                                const next = [...users];
                                next[index] = { ...next[index], role: event.target.value };
                                setUsers(next);
                            }}
                            className="bg-[#0f1419] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
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
                            className="bg-[#0f1419] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                            disabled={user.role === 'admin'}
                        >
                            <option value="">No client</option>
                            {clientOptions.map((client) => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setUsers((prev) => prev.filter((_, i) => i !== index))}
                            className="bg-rose-500/20 text-rose-300 rounded px-2 py-1.5 text-sm"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </section>

            <section className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Clients</h3>
                    <button type="button" onClick={addClient} className="text-xs px-3 py-1 rounded bg-white/10 text-gray-200">
                        Add Client
                    </button>
                </div>

                {clients.map((client, clientIndex) => (
                    <div key={client.id} className="bg-[#141a21] border border-white/10 rounded-lg p-4 space-y-3">
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
                                className="bg-[#0f1419] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
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
                                className="bg-[#0f1419] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setClients((prev) => prev.filter((_, i) => i !== clientIndex))}
                                className="bg-rose-500/20 text-rose-300 rounded px-2 py-1.5 text-sm"
                            >
                                Remove Client
                            </button>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Allowed Workflows</p>
                            {workflows.length === 0 ? (
                                <p className="text-sm text-gray-500">No workflows discovered yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-auto pr-1">
                                    {workflows.map((workflow) => {
                                        const workflowId = String(workflow.id);
                                        const selected = (client.workflowIds || []).map(String).includes(workflowId);
                                        return (
                                            <label key={workflowId} className="flex items-center gap-2 text-sm text-gray-200">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={(event) => {
                                                        const set = new Set((client.workflowIds || []).map(String));
                                                        if (event.target.checked) set.add(workflowId);
                                                        else set.delete(workflowId);
                                                        const next = [...clients];
                                                        next[clientIndex] = { ...next[clientIndex], workflowIds: [...set] };
                                                        setClients(next);
                                                    }}
                                                />
                                                <span>{workflow.name || workflowId}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}
