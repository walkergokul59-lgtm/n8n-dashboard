import React, { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Activity } from "lucide-react";
import { getAIAgentLogs } from "../utils/mock-data";
import { useDashboardData } from "../hooks/useDashboardData";

export default function RecentActivityTable() {
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Toggle row expansion state
    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const mockExecutions = useMemo(() => {
        const raw = getAIAgentLogs().slice(0, 10);
        return {
            data: raw.map((log, index) => ({
                id: 1000 - index,
                workflowId: "1",
                status: index % 10 === 0 ? "failed" : "success",
                timestamp: log.timestamp,
                durationMs: log.durationMs,
            }))
        };
    }, []);

    const mockWorkflows = useMemo(() => ({
        data: [{ id: "1", name: "Mock Workflow", active: true }]
    }), []);

    const fetchMockExecutions = useCallback(() => mockExecutions, [mockExecutions]);
    const fetchMockWorkflows = useCallback(() => mockWorkflows, [mockWorkflows]);

    const { data, isLoading } = useDashboardData(fetchMockExecutions, '/dashboard/recent-executions');
    const { data: workflowsData } = useDashboardData(fetchMockWorkflows, '/dashboard/workflows');

    const activities = Array.isArray(data?.data) ? data.data : [];
    const workflowNameById = useMemo(() => {
        const m = new Map();
        for (const wf of workflowsData?.data || []) {
            if (!wf?.id) continue;
            m.set(String(wf.id), wf.name || String(wf.id));
        }
        return m;
    }, [workflowsData]);

    const formatTs = (iso) => {
        if (!iso) return "-";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="bg-[#1a1f2e] rounded-xl shadow-lg border border-white/5 w-full overflow-hidden mt-6 flex flex-col">
            <div className="p-6 pb-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold text-lg">Recent Executions</h3>
                    {isLoading ? <span className="text-xs text-gray-500">Loading…</span> : null}
                </div>
            </div>

            <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-[#141a21]/80 text-xs uppercase tracking-wider text-gray-400 font-semibold border-b border-white/5">
                            <th className="px-6 py-4 w-16 text-center">ID</th>
                            <th className="px-6 py-4 w-1/3">Workflow</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 w-28 text-right">Duration</th>
                            <th className="px-6 py-4 w-48 text-right">Timestamp</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium">
                        {!isLoading && activities.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                    No executions found for your assigned workflows yet.
                                </td>
                            </tr>
                        ) : null}

                        {activities.map((activity, index) => (
                            <React.Fragment key={activity.id}>
                                <tr
                                    onClick={() => toggleRow(activity.id)}
                                    className={`
                                        cursor-pointer transition-all duration-200 hover:bg-white/10 group
                                        ${index % 2 === 0 ? 'bg-transparent' : 'bg-[#141a21]/30'}
                                        ${expandedRows.has(activity.id) ? 'bg-[#00d9ff]/5' : ''}
                                    `}
                                >
                                    <td className="px-6 py-4 text-center text-[#00d9ff] font-bold flex items-center justify-center">
                                        <div className="mr-2 text-gray-500 transition-transform duration-200 group-hover:text-[#00d9ff]">
                                            {expandedRows.has(activity.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>
                                        {activity.id}
                                    </td>
                                    <td className="px-6 py-4 text-gray-300 font-mono text-xs truncate max-w-[200px]" title={activity.workflowId || ""}>
                                        {activity.workflowId ? (workflowNameById.get(String(activity.workflowId)) || String(activity.workflowId)) : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-white truncate max-w-[300px]" title={activity.status || ""}>
                                        {activity.status || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-amber-400 text-right font-mono">
                                        {Number.isFinite(activity.durationMs) ? `${activity.durationMs}ms` : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-right font-mono text-xs">
                                        {formatTs(activity.timestamp)}
                                    </td>
                                </tr>

                                {/* Expanded Row Content */}
                                {expandedRows.has(activity.id) && (
                                    <tr className="bg-[#0f1419] border-b border-white/5 border-t border-t-white/5">
                                        <td colSpan="5" className="p-0">
                                            <div className="px-12 py-6 animate-in slide-in-from-top-2 fade-in duration-200">
                                                <div className="flex items-center mb-4 text-[#00d9ff] font-semibold text-xs tracking-wider uppercase">
                                                    <Activity size={14} className="mr-2" />
                                                    Execution Details
                                                </div>
                                                <pre className="bg-[#141a21]/50 p-4 rounded-lg border border-white/5 mx-4 mb-2 text-xs text-gray-300 overflow-auto">
                                                    {JSON.stringify(activity, null, 2)}
                                                </pre>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
