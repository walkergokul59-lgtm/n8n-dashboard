import React from 'react';

/**
 * A reusable Hover Tooltip wrapper.
 * Triggers a fully animated floating pane on hover revealing nested text/children.
 * 
 * @param {ReactNode} children - The trigger element (e.g. an icon).
 * @param {string} content - Text to display inside the tooltip.
 * @param {string} position - 'top' | 'bottom' | 'left' | 'right' (default: top).
 */
export default function Tooltip({ children, content, position = 'top' }) {
    // Tailwind position mappings
    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    // Caret/Arrow position mappings
    const edgeAlignments = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-white/10 border-r-transparent border-b-transparent border-l-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-white/10 border-r-transparent border-t-transparent border-l-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-white/10 border-r-transparent border-b-transparent border-t-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-white/10 border-t-transparent border-b-transparent border-l-transparent'
    };

    return (
        <div className="relative flex items-center group cursor-help">
            {children}

            <div className={`absolute whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${positions[position]}`}>
                <div className="bg-[#1a222a] border border-white/10 shadow-xl rounded-md px-3 py-1.5 text-xs font-medium text-gray-200">
                    {content}
                    {/* SVG/CSS Caret Arrow pointing to the target */}
                    <div className={`absolute w-0 h-0 border-[6px] ${edgeAlignments[position]}`} />
                </div>
            </div>
        </div>
    );
}
