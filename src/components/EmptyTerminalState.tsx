import { SquarePlusIcon, TerminalIcon } from "lucide-react"
import { useIsMobile } from "src/hooks/useMediaQuery"
import { Button } from "./ui/button"

export function EmptyTerminalState({ onAdd }: { onAdd: () => void }) {
    const isMobile = useIsMobile()
    return (
        <div className="flex flex-col h-full w-full items-center justify-center gap-4 px-6 animate-in fade-in duration-500">
            {!isMobile && (
                <>
                    <div className="p-4 rounded-full bg-muted/30">
                        <TerminalIcon className="size-8 text-muted-foreground/40" />
                    </div>
                    <div className="text-center max-w-[240px]">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-tight">No active tabs</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5 leading-relaxed">
                            Click the plus icon above or the button below to start
                        </p>
                    </div>
                </>
            )}
            <Button
                variant="outline"
                size={isMobile ? "xs" : "sm"}
                className="mt-1 h-7 px-4 text-[10px] gap-1.5"
                onClick={onAdd}
            >
                <SquarePlusIcon className="size-3" />
                New Tab
            </Button>
        </div>
    )
}