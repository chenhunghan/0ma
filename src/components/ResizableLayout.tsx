import { ReactNode, Fragment } from "react"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "src/components/ui/resizable"
import { useIsMobile } from "src/hooks/useMediaQuery"

interface ResizableLayoutProps {
    columns: ReactNode[]
    bottom: ReactNode
}

export function ResizableLayout({ columns, bottom }: ResizableLayoutProps) {
    const isMobile = useIsMobile()

    return (
        <ResizablePanelGroup direction="vertical">
            {/* Top Section: Contains the columns (grid vertically on mobile, horizontally on desktop) */}
            <ResizablePanel defaultSize={40} minSize={10}>
                <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
                    {columns.map((column, index) => (
                        <Fragment key={index}>
                            <ResizablePanel defaultSize={100 / columns.length} minSize={10}>
                                {column}
                            </ResizablePanel>
                            {index < columns.length - 1 && <ResizableHandle />}
                        </Fragment>
                    ))}
                </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle />

            {/* Bottom Section */}
            <ResizablePanel defaultSize={60} minSize={8}>
                {bottom}
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}