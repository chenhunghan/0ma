import { ReactNode, Fragment } from "react"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "src/components/ui/resizable"

interface ResizableLayoutProps {
    columns: ReactNode[]
    bottom: ReactNode
}

export function ResizableLayout({ columns, bottom }: ResizableLayoutProps) {
    return (
        <ResizablePanelGroup direction="vertical">
            {/* Top Section: Contains the horizontal split for columns */}
            <ResizablePanel defaultSize={40}>
                <ResizablePanelGroup direction="horizontal">
                    {columns.map((column, index) => (
                        <Fragment key={index}>
                            <ResizablePanel defaultSize={100 / columns.length}>
                                {column}
                            </ResizablePanel>
                            {index < columns.length - 1 && <ResizableHandle />}
                        </Fragment>
                    ))}
                </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle />

            {/* Bottom Section */}
            <ResizablePanel defaultSize={60}>
                {bottom}
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}