import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "src/components/ui/resizable"

export function App() {
    return (
        <ResizablePanelGroup direction="vertical">
            {/* Top Section: Contains the horizontal 3-column split */}
            <ResizablePanel defaultSize={40}>
                {/* Inner Horizontal Group: Splits the top section into 3 columns */}
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={33}>
                        <div className="flex h-full w-full items-center justify-center">
                            <span className="font-semibold">Column 1</span>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={33}>
                        <div className="flex h-full w-full items-center justify-center">
                            <span className="font-semibold">Column 2</span>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={33}>
                        <div className="flex h-full w-full items-center justify-center">
                            <span className="font-semibold">Column 3</span>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle />

            {/* Bottom Section */}
            <ResizablePanel defaultSize={60}>
                <div className="flex h-full w-full items-center justify-center">
                    <span className="font-semibold">Three</span>
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}