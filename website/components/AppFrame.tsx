interface AppFrameProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function AppFrame({ children, title = "0ma", className = "" }: AppFrameProps) {
  return (
    // Outer: border + rounded corners + shadow (not clipped)
    <div
      className="rounded-[10px] border border-[oklch(1_0_0/15%)]"
      style={{
        boxShadow: `
          0 4px 6px -1px oklch(0 0 0 / 20%),
          0 25px 50px -12px oklch(0 0 0 / 40%)
        `,
      }}
    >
      {/* Inner: clips content to rounded corners */}
      <div className={`rounded-[9px] bg-background overflow-hidden ${className}`}>
        {/* macOS title bar */}
        <div className="flex items-center px-4 h-9 bg-[oklch(0.18_0.005_285.8)] border-b border-[oklch(1_0_0/8%)] relative">
          <div className="flex gap-2 items-center">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dea123]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
          </div>
          <span className="text-[11px] text-muted-foreground/60 absolute left-1/2 -translate-x-1/2">
            {title}
          </span>
        </div>
        {/* Content */}
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}
