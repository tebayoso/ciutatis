import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalSearchTriggerProps {
  onClick?: () => void;
  className?: string;
  placeholder?: string;
  showShortcut?: boolean;
}

export function GlobalSearchTrigger({
  onClick,
  className,
  placeholder = "Search...",
  showShortcut = true,
}: GlobalSearchTriggerProps) {
  const [isMac] = useState(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 rounded-md border border-border/80 bg-accent/40 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={placeholder}
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
      <span className="truncate text-[13px]">{placeholder}</span>
      {showShortcut && (
        <kbd className="ml-1 hidden shrink-0 rounded border border-border bg-background px-1 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      )}
    </button>
  );
}
