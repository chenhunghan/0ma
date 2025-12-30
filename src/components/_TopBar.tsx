import { PlusIcon } from "lucide-react"
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
        <div className="w-full px-[8px] pb-[6px] flex">
            <InstanceSelector />
            <PlusButton className="ml-[6px]" />
            <StopButton className="ml-[6px]" />
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

export function PlusButton({ className }: { className?: string }) {
    return (
        <Button variant="outline" size="icon" aria-label="Create new Lima instance" className={className}>
            <PlusIcon />
        </Button>
    )
}

export function StopButton({ className }: { className?: string }) {
    return (
        <Button variant="outline" className={className}>
            Stop
        </Button>
    )
}
