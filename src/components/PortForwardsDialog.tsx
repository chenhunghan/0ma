import { useState } from "react";
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { useLimaDraft } from "src/hooks/useLimaDraft";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./ui/accordion";

export function PortForwardsDialog() {
    const { selectedName } = useSelectedInstance();
    const { draftConfig, updateField } = useLimaDraft(selectedName);
    const [isOpen, setIsOpen] = useState(false);

    const portForwards = draftConfig?.portForwards || [];
    const hasInvalid = portForwards.some(p => !p.guestPort || !p.hostPort || !p.proto);

    const updatePF = (index: number, field: string, value: any) => {
        const newPFs = [...portForwards];
        newPFs[index] = { ...newPFs[index], [field]: value };
        updateField('portForwards', newPFs);
    };

    const addPF = () => {
        updateField('portForwards', [...portForwards, {
            guestPort: 8080,
            hostPort: 8080,
            proto: 'tcp',
            guestIPMustBeZero: true,
            hostIP: '127.0.0.1'
        }]);
    };

    const removePF = (index: number) => {
        const newPFs = [...portForwards];
        newPFs.splice(index, 1);
        updateField('portForwards', newPFs);
    };

    return (
        <div className="grid w-full items-center gap-1.5">
            <Dialog
                open={isOpen}
                onOpenChange={(open) => {
                    if (!open && hasInvalid) return;
                    setIsOpen(open);
                }}
            >
                <div className="flex items-center justify-between">
                    <Label className="mb-0.5">Port Forwards</Label>
                    <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                        {(!portForwards || portForwards.length === 0)
                            ? <PlusIcon className="size-2.5 mr-[4px]" />
                            : <PencilIcon className="size-2.5 mr-[4px]" />
                        }
                    </DialogTrigger>
                </div>

                <DialogContent
                    className="sm:max-w-md"
                    showCloseButton={!hasInvalid}
                >
                    <DialogHeader>
                        <DialogTitle>Configure Port Forwards</DialogTitle>
                        <DialogDescription>
                            Map ports from the guest VM to the host machine.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
                        {portForwards.map((pf, idx) => (
                            <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removePF(idx)}
                                >
                                    <Trash2Icon className="size-3 text-destructive" />
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Guest Port</Label>
                                        <Input
                                            type="number"
                                            value={pf.guestPort}
                                            onChange={(e) => updatePF(idx, 'guestPort', parseInt(e.target.value) || 0)}
                                            className="h-7 text-[11px]"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Host Port</Label>
                                        <Input
                                            type="number"
                                            value={pf.hostPort}
                                            onChange={(e) => updatePF(idx, 'hostPort', parseInt(e.target.value) || 0)}
                                            className="h-7 text-[11px]"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Protocol</Label>
                                    <Select
                                        value={pf.proto || 'tcp'}
                                        onValueChange={(val) => updatePF(idx, 'proto', val)}
                                    >
                                        <SelectTrigger className="h-7 text-[11px] w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tcp">TCP</SelectItem>
                                            <SelectItem value="udp">UDP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="xs"
                            className="border-dashed"
                            onClick={addPF}
                        >
                            <PlusIcon className="size-3 mr-1" /> Add Port Forward
                        </Button>
                    </div>
                    {hasInvalid && (
                        <p className="text-[10px] text-destructive font-medium animate-pulse">
                            All port forwards must have guest/host ports and a protocol.
                        </p>
                    )}
                    <DialogFooter>
                        <DialogClose
                            disabled={hasInvalid}
                            render={<Button variant="outline" size="sm" />}
                        >
                            Done
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>

                {portForwards.length > 0 && (
                    <Accordion className="w-full">
                        {portForwards.map((pf, idx) => (
                            <AccordionItem value={`pf-${idx}`} key={idx} className="border-border/40">
                                <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-muted px-1 rounded text-foreground/70 uppercase">{pf.proto || 'tcp'}</span>
                                        <span className="font-mono text-[10px]">{pf.guestPort}</span>
                                        <span className="text-muted-foreground/50">→</span>
                                        <span className="font-mono text-[10px]">{pf.hostPort}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-2 bg-muted/10">
                                    <div className="flex flex-col gap-1 text-[10px] font-mono text-muted-foreground/80 bg-zinc-950/50 p-2 rounded border border-border/20">
                                        <div className="flex justify-between items-start">
                                            <span className="shrink-0">Guest IP (Must Be Zero):</span>
                                            <span className="text-foreground/70 ml-4 text-right">{pf.guestIPMustBeZero ? 'true' : 'false'}</span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="shrink-0">Host IP:</span>
                                            <span className="text-foreground/70 break-all ml-4 text-right">{pf.hostIP || '127.0.0.1'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Protocol:</span>
                                            <span className="text-foreground/70 uppercase">{pf.proto || 'tcp'}</span>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </Dialog>
        </div>
    );
}
