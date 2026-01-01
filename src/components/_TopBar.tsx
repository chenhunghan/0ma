import { PlusIcon, TrashIcon, StopCircleIcon } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "src/components/ui/select"
import { Button } from "src/components/ui/button"
import { useLimaInstances } from "src/hooks/useLimaInstances";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { Spinner } from "./ui/spinner";

export function TopBar() {

    return (
        <div className="w-full px-[8px] py-[6px] flex items-center">
            {/* Left side */}
            <div className="flex items-center flex-1">
                <InstanceSelector />
                <CreateInstanceButton className="ml-[6px]" />
            </div>

            {/* Middle side - hidden on mobile */}
            <InstanceName className="text-xs hidden md:block" />

            {/* Right side */}
            <div className="flex items-center justify-end flex-1">
                <StopInstanceButton />
                <DeleteInstanceButton className="ml-[6px]" />
            </div>
        </div>
    )
}


export function InstanceSelector() {
    const { instances, isLoading } = useLimaInstances();
    const { setSelectedName, selectedInstance } = useSelectedInstance(instances);

    return (
        <Select
            value={selectedInstance?.name ?? ""}
            onValueChange={setSelectedName}
            disabled={isLoading}
        >
            <SelectTrigger className="w-[180px]">
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <Spinner />
                        <span className="text-muted-foreground">Loading...</span>
                    </div>
                ) : (
                    <SelectValue placeholder="Select a Lima instance" />
                )}
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {instances.map((instance) => (
                        <SelectItem key={instance.name} value={instance.name}>
                            {instance.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}

export function CreateInstanceButton({ className }: { className?: string }) {
    return (
        <Button variant="default" size="icon" aria-label="Create new Lima instance" className={className}>
            <PlusIcon />
        </Button>
    )
}

export function StopInstanceButton() {
    return (
        <Button
            variant="secondary"
            aria-label="Stop Lima instance"
        >
            <StopCircleIcon className="md:hidden" />
            <span className="hidden md:inline">Stop</span>
        </Button>
    )
}

export function DeleteInstanceButton({ className }: { className?: string }) {
    return (
        <Button variant="destructive" size="icon" aria-label="Delete Lima instance" className={className}>
            <TrashIcon />
        </Button>
    )
}

export function InstanceName({ className }: { className?: string }) {
    const { instances, isLoading } = useLimaInstances();
    const { selectedInstance } = useSelectedInstance(instances);
    if (isLoading) {
        return (
            <span className={className} title="Loading Lima instances"><Spinner /></span>
        )
    }
    return (
        <span className={className} title={`Selected Lima instance: ${selectedInstance?.name}`}>{selectedInstance?.name}</span>
    )
}
