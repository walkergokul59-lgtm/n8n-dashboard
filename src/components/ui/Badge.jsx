import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-[var(--c-accent)]/10 text-[var(--c-accent)] hover:bg-[var(--c-accent)]/20": variant === "default",
          "border-transparent bg-[var(--c-hover)] text-[var(--c-text-dim)] hover:bg-[var(--c-hover2)]": variant === "secondary",
          "border-transparent bg-rose-500/10 text-rose-500 hover:bg-rose-500/20": variant === "destructive",
          "border-transparent bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20": variant === "success",
          "border-transparent bg-amber-500/10 text-amber-500 hover:bg-amber-500/20": variant === "warning",
          "text-[var(--c-text)] border-[var(--c-border)]": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
