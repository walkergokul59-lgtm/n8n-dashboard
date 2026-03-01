import React, { useState } from "react";
import { getAIAgentLogs } from "../utils/mock-data";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";

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

    // Use 5 logs from our mock generator
    const rawLogs = getAIAgentLogs().slice(0, 5);

    // Format the mock data into table rows
    const activities = rawLogs.map((log, index) => ({
        id: 19 - index,
        threadId: log.threadId,
        message: log.question,
        fullThread: log.messages, // Grab the full mock thread payload
        cost: `$${log.cost.toFixed(4)}`,
        duration: `${log.durationMs}ms`,
    }));

    // Ensure we have some specific examples if mock data is weird
    if (activities.length === 0) {
        activities.push(
            { id: 19, threadId: "936e6ede-2bc6-4172-ac5c-7da3fd742635", message: "Can I get a replacement hose?", cost: "$0.0040", duration: "34ms" },
            { id: 18, threadId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", message: "How to claim warranty?", cost: "$0.0030", duration: "211ms" },
            { id: 17, threadId: "5f4e3d2c-1b0a-9876-5432-10fedcba0987", message: "Where is my order REF-892?", cost: "$0.0040", duration: "382ms" }
        );
    }

    return (
        <div className="bg-[#1a1f2e] rounded-xl shadow-lg border border-white/5 w-full overflow-hidden mt-6 flex flex-col">
            <div className="p-6 pb-4 border-b border-white/5">
                <h3 className="text-white font-semibold text-lg">Recent Activity</h3>
            </div>

            <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-[#141a21]/80 text-xs uppercase tracking-wider text-gray-400 font-semibold border-b border-white/5">
                            <th className="px-6 py-4 w-16 text-center">ID</th>
                            <th className="px-6 py-4 w-1/3">Thread ID</th>
                            <th className="px-6 py-4">Message</th>
                            <th className="px-6 py-4 w-24 text-right">Cost</th>
                            <th className="px-6 py-4 w-24 text-right">Duration</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium">
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
                                    <td className="px-6 py-4 text-gray-300 font-mono text-xs truncate max-w-[200px]" title={activity.threadId}>
                                        {activity.threadId}
                                    </td>
                                    <td className="px-6 py-4 text-white truncate max-w-[300px]" title={activity.message}>
                                        {activity.message}
                                    </td>
                                    <td className="px-6 py-4 text-emerald-400 text-right font-mono">
                                        {activity.cost}
                                    </td>
                                    <td className="px-6 py-4 text-amber-400 text-right font-mono">
                                        {activity.duration}
                                    </td>
                                </tr>

                                {/* Expanded Row Content */}
                                {expandedRows.has(activity.id) && (
                                    <tr className="bg-[#0f1419] border-b border-white/5 border-t border-t-white/5">
                                        <td colSpan="5" className="p-0">
                                            <div className="px-12 py-6 animate-in slide-in-from-top-2 fade-in duration-200">
                                                <div className="flex items-center mb-4 text-[#00d9ff] font-semibold text-xs tracking-wider uppercase">
                                                    <MessageSquare size={14} className="mr-2" />
                                                    Session Transcript
                                                </div>
                                                <div className="space-y-3 bg-[#141a21]/50 p-4 rounded-lg border border-white/5 mx-4 mb-2">
                                                    {activity.fullThread && activity.fullThread.map((msg, idx) => (
                                                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                                                            <div className={`px-4 py-2 rounded-lg max-w-[80%] text-sm ${msg.role === 'user'
                                                                ? 'bg-[#1a222a] border border-white/10 text-gray-200 rounded-tl-none'
                                                                : 'bg-[#00d9ff]/10 border border-[#00d9ff]/20 text-white rounded-tr-none'
                                                                }`}>
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {!activity.fullThread && <div className="text-gray-500 italic text-sm">No transcript available for this session.</div>}
                                                </div>
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
