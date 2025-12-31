import { useLimaYaml } from "src/hooks/useLimaYaml";
import { ResizableLayout } from "./ResizableLayout";
import { TabsContent } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useTauriStore, useTauriStoreValue } from "../providers/tauri-store-provider";
import { LimaConfig } from "src/types/LimaConfig";
import { useCallback, useEffect } from "react";

export function LimaConfigTabContent({ tabValue, instanceName }: { tabValue: string, instanceName: string }) {
    return (
        <TabsContent value={tabValue} className="h-full">
            <ResizableLayout
                columns={[
                    <ColunmWrapper key="1">
                        <LimaConfigResourceColumn instanceName={instanceName} />
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

export function LimaConfigResourceColumn({ instanceName }: LimaConfigResourceProps) {
    // The actual lima config from limactl
    const { limaConfig, isLoadingLima } = useLimaYaml(instanceName);

    const { set } = useTauriStore();
    // The draft lima config from tauri store
    const { data: draftLimaConfig, isLoading: isLoadingLimaConfigDraft } = useTauriStoreValue<LimaConfig>('draftLimaConfig');

    // Initialize draft from actual config if draft is missing
    useEffect(() => {
        if (!isLoadingLimaConfigDraft && limaConfig && !draftLimaConfig) {
            set('draftLimaConfig', limaConfig);
        }
    }, [limaConfig, draftLimaConfig, set, isLoadingLimaConfigDraft]);

    const handleChange = useCallback((field: keyof LimaConfig, value: unknown) => {
        set('draftLimaConfig', { ...draftLimaConfig, [field]: value });
    }, [draftLimaConfig, set]);

    if (isLoadingLima || isLoadingLimaConfigDraft) {
        return <span className="font-semibold">Loading Lima Config...</span>
    }

    const configToDisplay = draftLimaConfig || limaConfig || {};

    return (
        <div className="flex flex-col gap-4 w-full max-w-sm p-4">
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="cpus">CPUs</Label>
                <Input
                    type="number"
                    id="cpus"
                    value={configToDisplay.cpus || ''}
                    onChange={(e) => handleChange('cpus', Number(e.target.value))}
                />
            </div>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="memory">Memory</Label>
                <Input
                    type="text"
                    id="memory"
                    value={configToDisplay.memory || ''}
                    onChange={(e) => handleChange('memory', e.target.value)}
                />
            </div>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="disk">Disk</Label>
                <Input
                    type="text"
                    id="disk"
                    value={configToDisplay.disk || ''}
                    onChange={(e) => handleChange('disk', e.target.value)}
                />
            </div>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="vmType">VmType</Label>
                <Input
                    type="text"
                    id="vmType"
                    value={configToDisplay.vmType || ''}
                    onChange={(e) => handleChange('vmType', e.target.value)}
                />
            </div>
        </div>
    )
}