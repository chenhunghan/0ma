import { useLimaYaml } from "src/hooks/useLimaYaml";
import { ResizableLayout } from "./ResizableLayout";
import { TabsContent } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
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

    return (
        <div className="flex flex-col gap-4 w-full max-w-sm px-4 py-8 mx-auto">
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="cpus">CPUs</Label>
                <Input
                    type="number"
                    id="cpus"
                    value={draftLimaConfig?.cpus || ''}
                    onChange={(e) => handleChange('cpus', Number(e.target.value))}
                    className="w-full"
                />
            </div>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="memory">Memory</Label>
                <Select value={draftLimaConfig?.memory || '4GiB'} onValueChange={(val) => handleChange('memory', val)}>
                    <SelectTrigger id="memory" className="w-full">
                        <SelectValue placeholder="Select memory" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="2GiB">2GiB</SelectItem>
                        <SelectItem value="4GiB">4GiB</SelectItem>
                        <SelectItem value="8GiB">8GiB</SelectItem>
                        <SelectItem value="16GiB">16GiB</SelectItem>
                        <SelectItem value="32GiB">32GiB</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="disk">Disk</Label>
                <Select value={draftLimaConfig?.disk || '100GiB'} onValueChange={(val) => handleChange('disk', val)}>
                    <SelectTrigger id="disk" className="w-full">
                        <SelectValue placeholder="Select disk size" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10GiB">10GiB</SelectItem>
                        <SelectItem value="25GiB">25GiB</SelectItem>
                        <SelectItem value="50GiB">50GiB</SelectItem>
                        <SelectItem value="100GiB">100GiB</SelectItem>
                        <SelectItem value="250GiB">250GiB</SelectItem>
                        <SelectItem value="500GiB">500GiB</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="vmType">VmType</Label>
                <Select value={draftLimaConfig?.vmType || 'vz'} onValueChange={(val) => handleChange('vmType', val)}>
                    <SelectTrigger id="vmType" className="w-full">
                        <SelectValue placeholder="Select VM Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="vz">VZ</SelectItem>
                        <SelectItem value="qemu">QEMU</SelectItem>
                        <SelectItem value="krunkit">Krunkit</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}