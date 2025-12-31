import { useLimaYaml } from "src/hooks/useLimaYaml";
import { ResizableLayout } from "./ResizableLayout";
import { TabsContent } from "./ui/tabs";

export function LimaConfigTabContent({ tabValue, instanceName }: { tabValue: string, instanceName: string }) {
    return (
        <TabsContent value={tabValue} className="h-full">
            <ResizableLayout
                columns={[
                    <ColunmWrapper key="1">
                        <LimaConfigResource instanceName={instanceName} />
                    </ColunmWrapper>,
                    <ColunmWrapper key="2">
                        <span className="font-semibold">Config Column 2</span>
                    </ColunmWrapper>,
                    <ColunmWrapper key="3">
                        <span className="font-semibold">Config Column 3</span>
                    </ColunmWrapper>,
                ]}
                bottom={<div />}
            />
        </TabsContent>
    )
}

function ColunmWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            {children}
        </div>
    )
}

interface LimaConfigResourceProps {
    instanceName: string,
}

export function LimaConfigResource({ instanceName }: LimaConfigResourceProps) {
    const { limaConfig, isLoadingLima } = useLimaYaml(instanceName);
    if (isLoadingLima || !limaConfig) {
        return <span className="font-semibold">Loading Lima Config...</span>
    }
    return (
        <>
            <span className="font-semibold">CPUs:{limaConfig.cpus}</span>
            <span className="font-semibold">Memory:{limaConfig.memory}</span>
            <span className="font-semibold">Disk:{limaConfig.disk}</span>
            <span className="font-semibold">VmType:{limaConfig.vmType}</span>
        </>
    )
}