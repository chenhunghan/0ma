import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useLimaDraft } from "src/hooks/useLimaDraft";
import { Spinner } from "./ui/spinner";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemTitle,
} from "./ui/item";
import { Separator } from "./ui/separator";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";

export function LimaConfigResourceColumn() {
    const { selectedName } = useSelectedInstance();
    const {
        draftConfig,
        actualConfig,
        isLoading,
        updateField
    } = useLimaDraft(selectedName);

    if (isLoading) {
        return <div title="Loading Lima Config..."><Spinner /></div>
    }

    return (
        <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto max-h-full">
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="cpus">CPUs</Label>
                <Input
                    type="number"
                    id="cpus"
                    min={1}
                    max={128}
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
                        <SelectItem value="64GiB">64GiB</SelectItem>
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
            <Separator />
            {/* Read-only Lima Minimum Version */}
            <div className="grid w-full items-center gap-1.5">
                <Item variant="muted">
                    <ItemContent>
                        <ItemTitle>Lima Minimum Version</ItemTitle>
                        <ItemDescription>{actualConfig?.minimumLimaVersion || 'N/A'}</ItemDescription>
                    </ItemContent>
                </Item>
            </div>
        </div>
    )
}