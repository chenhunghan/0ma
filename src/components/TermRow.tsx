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
    onSessionCreated: (tabId: string, termId: number, sessionId: string) => void
}

export function TerminalRow({
    tabId,
    terminals,
    onSessionCreated
}: Props) {
    const isMobile = useIsMobile()

    return (
        <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
            {terminals.map((term, index) => (
                <Fragment key={term.id}>
                    <ResizablePanel defaultSize={100 / terminals.length} minSize={10}>
                        <div
                            className="h-full w-full relative group"
                        >
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


