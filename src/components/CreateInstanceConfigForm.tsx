import { useLimaDraft } from "src/hooks/useLimaDraft";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { Spinner } from "./ui/spinner";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";

export function CreateInstanceConfigForm() {
    const { selectedName } = useSelectedInstance();
    const {
        draftConfig,
        isLoading,
        updateField
    } = useLimaDraft(selectedName);

    if (isLoading) {
        return <div title="Loading Lima Config..."><Spinner /></div>
    }

    return (
        <div className="flex flex-col gap-3 w-full px-4 py-2 lg:px-8 lg:py-2 relative overflow-y-auto max-h-full">
            <div className="flex flex-row items-center gap-4">
                <Label htmlFor="cpus" className="w-20 shrink-0">CPUs</Label>
                <Input
                    type="number"
                    min={1}
                    max={128}
                    id="cpus"
                    value={draftConfig?.cpus || ''}
                    onChange={(e) => updateField('cpus', Number(e.target.value))}
                    className="flex-1"
                    size="sm"
                />
            </div>

            <div className="flex flex-row items-center gap-4">
                <Label htmlFor="memory" className="w-20 shrink-0">Memory</Label>
                <Select value={draftConfig?.memory || '4GiB'} onValueChange={(val) => updateField('memory', val)}>
                    <SelectTrigger id="memory" className="flex-1" size="sm">
                        <SelectValue placeholder="Select memory" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="2GiB">2GiB</SelectItem>
                        <SelectItem value="4GiB">4GiB</SelectItem>
                        <SelectItem value="8GiB">8GiB</SelectItem>
                        <SelectItem value="16GiB">16GiB</SelectItem>
                        <SelectItem value="32GiB">32GiB</SelectItem>
                        <SelectItem value="64GiB">64GiB</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-row items-center gap-4">
                <Label htmlFor="disk" className="w-20 shrink-0">Disk</Label>
                <Select value={draftConfig?.disk || '100GiB'} onValueChange={(val) => updateField('disk', val)}>
                    <SelectTrigger id="disk" className="flex-1" size="sm">
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

            <div className="flex flex-row items-center gap-4">
                <Label htmlFor="vmType" className="w-20 shrink-0">VmType</Label>
                <Select value={draftConfig?.vmType || 'vz'} onValueChange={(val) => updateField('vmType', val)}>
                    <SelectTrigger id="vmType" className="flex-1" size="sm">
                        <SelectValue placeholder="Select VM Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="vz">VZ</SelectItem>
                        <SelectItem value="qemu">QEMU</SelectItem>
                        <SelectItem value="krunkit">Krunkit</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Separator />
        </div>
    )
}