import { ResizableLayout } from "./components/ResizableLayout"

export function App() {
    return (
        <ResizableLayout
            columns={[
                <div className="flex h-full w-full items-center justify-center">
                    <span className="font-semibold">Column 1</span>
                </div>,
                <div className="flex h-full w-full items-center justify-center">
                    <span className="font-semibold">Column 2</span>
                </div>,
                <div className="flex h-full w-full items-center justify-center">
                    <span className="font-semibold">Column 3</span>
                </div>,
            ]}
            bottom={
                <div className="flex h-full w-full items-center justify-center">
                    <span className="font-semibold">Three</span>
                </div>
            }
        />
    )
}