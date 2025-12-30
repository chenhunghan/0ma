import { ResizableLayout } from "./components/ResizableLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs"

export function App() {
    return (
        <div className="h-full">
            <Tabs defaultValue="lima" className="h-full">
                <TabsList>
                    <TabsTrigger value="config">Config</TabsTrigger>
                    <TabsTrigger value="lima">Lima</TabsTrigger>
                    <TabsTrigger value="k8s">K8s</TabsTrigger>
                </TabsList>
                <TabsContent value="config" className="h-full">
                    <ResizableLayout
                        columns={[
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">Config Column 1</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">Config Column 2</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">Config Column 3</span>
                            </div>,
                        ]}
                        bottom={
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">Config Bottom</span>
                            </div>
                        }
                    />
                </TabsContent>
                <TabsContent value="lima">
                    <ResizableLayout
                        columns={[
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">Lima Column 1</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">Lima Column 2</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">Lima Column 3</span>
                            </div>,
                        ]}
                        bottom={
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">Lima Bottom</span>
                            </div>
                        }
                    />
                </TabsContent>
                <TabsContent value="k8s">
                    <ResizableLayout
                        columns={[
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">K8s Column 1</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">K8s Column 2</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">K8s Column 3</span>
                            </div>,
                        ]}
                        bottom={
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="font-semibold">K8s Bottom</span>
                            </div>
                        }
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}