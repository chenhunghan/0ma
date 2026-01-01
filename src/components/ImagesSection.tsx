export function ImageSection({ dialog, children }: { dialog: React.ReactNode, children?: React.ReactNode }) {
    return <div className="grid w-full items-center gap-1.5">
        {dialog}
        {children}
    </div>
}   