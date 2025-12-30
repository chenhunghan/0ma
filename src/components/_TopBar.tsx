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

export function TopBar() {
    return (
        <div className="w-full px-[8px] py-[6px] flex items-center">
            {/* Left side */}
            <div className="flex items-center flex-1">
                <InstanceSelector />
                <CreateInstanceButton className="ml-[6px]" />
            </div>

            {/* Middle side - hidden on mobile */}
            <InstanceName name="my-instance" className="text-xs hidden md:block" />

            {/* Right side */}
            <div className="flex items-center justify-end flex-1">
                <StopInstanceButton />
                <DeleteInstanceButton className="ml-[6px]" />
            </div>
        </div>
    )
}


export function InstanceSelector() {
    return (
        <Select
            defaultValue="apple"
        >
            <SelectTrigger>
                <SelectValue placeholder="Select a Lima instance" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="blueberry">Blueberry</SelectItem>
                    <SelectItem value="grapes">Grapes</SelectItem>
                    <SelectItem value="pineapple">Pineapple</SelectItem>
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

export function InstanceName({ className, name }: { className?: string, name: string }) {
    return (
        <span className={className}>{name}</span>
    )
}
