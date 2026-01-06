import { Fragment } from "react"
import { Button } from "src/components/ui/button"
import { XIcon } from "lucide-react"
import { useIsMobile } from "src/hooks/useMediaQuery"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle
} from "src/components/ui/resizable"
import { type Terminal } from "src/services/Terminal"
import { TerminalComponent } from "./TerminalComponent"

interface Props {
    tabId: string,
    terminals: Terminal[],
    onRemove: (tabId: string, terminalId: number) => void
    onSessionCreated: (tabId: string, termId: number, sessionId: string) => void
}

export function TerminalRow({
    tabId,
    terminals,
    onRemove,
    onSessionCreated
}: Props) {
    const isMobile = useIsMobile()

    return (
        <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
            {terminals.map((term, index) => (
                <Fragment key={term.id}>
                    <ResizablePanel defaultSize={100 / terminals.length} minSize={10}>
                        <div
                            className="h-full w-full relative group border border-transparent transition-all duration-200 hover:border-zinc-800"
                        >
                            <div className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <CloseTerminalButton onRemove={() => onRemove(tabId, term.id)} />
                            </div>
                            <div className="h-full w-full overflow-hidden">
                                <TerminalComponent
                                    initialCommand="zsh"
                                    initialArgs={[]}
                                    cwd="~"
                                    sessionId={term.sessionId}
                                    onSessionCreated={(sid) => onSessionCreated(tabId, term.id, sid)}
                                />
                            </div>
                        </div>
                    </ResizablePanel>
                    {index < terminals.length - 1 && <ResizableHandle withHandle={!isMobile} />}
                </Fragment>
            ))}
        </ResizablePanelGroup>
    )
}

function CloseTerminalButton({ onRemove }: { onRemove: () => void }) {
    return (
        <Button
            variant="secondary"
            size="icon-xs"
            className="size-5 bg-background/60 backdrop-blur-xs border border-border/50 shadow-xs hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30"
            onClick={(e) => {
                e.stopPropagation()
                onRemove()
            }}
            title="Close Terminal"
        >
            <XIcon className="size-3" />
        </Button>
    )
}
