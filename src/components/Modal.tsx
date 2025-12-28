import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subTitle?: string;
    icon?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    maxWidth?: string;
    height?: string;
    isProcessing?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    subTitle,
    icon,
    children,
    footer,
    maxWidth = 'max-w-3xl',
    height,
    isProcessing = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4 md:p-10">
            <div className={`bg-zinc-950 border border-zinc-800 shadow-2xl w-full ${maxWidth} ${height || ''} flex flex-col animate-in zoom-in-95 duration-200 p-1`}>
                <div className="border border-zinc-900 bg-zinc-900/50 flex flex-col h-full overflow-hidden">
                    {/* HEADER */}
                    <div className="h-14 border-b border-zinc-800/50 flex items-center justify-between px-6 bg-zinc-900/50 shrink-0">
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div className="p-1.5 bg-zinc-800 rounded border border-zinc-700">
                                    {icon}
                                </div>
                            )}
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-white select-none">{title}</h2>
                                {subTitle && (
                                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest select-none">{subTitle}</div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="p-1 hover:text-white text-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* BODY */}
                    <div className="flex-1 overflow-hidden flex flex-col p-6 min-h-0">
                        {children}
                    </div>

                    {/* FOOTER */}
                    {footer && (
                        <div className="h-16 border-t border-zinc-800/50 flex items-center justify-end px-6 gap-4 bg-zinc-900/50 shrink-0">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
