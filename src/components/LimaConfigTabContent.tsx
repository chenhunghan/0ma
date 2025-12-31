import { ResizableLayout } from "./ResizableLayout";
import { TabsContent } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useLimaDraft } from "src/hooks/useLimaDraft";

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
    const {
        draftConfig,
        isDirty,
        isLoading,
        updateField
    } = useLimaDraft(instanceName);

    if (isLoading) {
        return <span className="font-semibold">Loading Lima Config...</span>
    }

    return (
        <div className="flex flex-col gap-4 w-full max-w-sm px-4 py-8 mx-auto relative">
            {isDirty && (
                <div className="absolute top-2 right-4 text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 font-bold uppercase tracking-wider rounded border border-yellow-500/20 animate-pulse">
                    Dirty
                </div>
            )}
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="cpus">CPUs</Label>
                <Input
                    type="number"
                    id="cpus"
                    value={draftConfig?.cpus || ''}
                    onChange={(e) => updateField('cpus', Number(e.target.value))}
                    className="w-full"
                />
            </div>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="memory">Memory</Label>
                <Select value={draftConfig?.memory || '4GiB'} onValueChange={(val) => updateField('memory', val)}>
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
                <Select value={draftConfig?.disk || '100GiB'} onValueChange={(val) => updateField('disk', val)}>
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
                <Select value={draftConfig?.vmType || 'vz'} onValueChange={(val) => updateField('vmType', val)}>
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