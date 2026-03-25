/* UI redesign: replaced hardcoded colors with CSS vars for theme support */
import React from 'react';

export default function Tooltip({ children, content, position = 'top' }) {
    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const edgeAlignments = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--c-border)] border-r-transparent border-b-transparent border-l-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--c-border)] border-r-transparent border-t-transparent border-l-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--c-border)] border-r-transparent border-b-transparent border-t-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--c-border)] border-t-transparent border-b-transparent border-l-transparent'
    };

    return (
        <div className="relative flex items-center group cursor-help">
            {children}

            <div className={`absolute whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${positions[position]}`}>
                <div className="bg-[var(--bg-elevated)] border border-[var(--c-border)] shadow-xl rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-[var(--c-text)]">
                    {content}
                    <div className={`absolute w-0 h-0 border-[6px] ${edgeAlignments[position]}`} />
                </div>
            </div>
        </div>
    );
}
