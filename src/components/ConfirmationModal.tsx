import React from 'react';
import { AlertTriangle, Loader2, Info, CheckCircle2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
  variant?: 'danger' | 'info' | 'success';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isProcessing = false,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
        case 'success':
            return {
                iconBg: 'bg-emerald-900/10',
                iconBorder: 'border-emerald-900/30',
                iconColor: 'text-emerald-500',
                Icon: CheckCircle2,
                buttonBg: 'bg-emerald-900/20 hover:bg-emerald-900/40',
                buttonColor: 'text-emerald-500',
                buttonBorder: 'border-emerald-900 hover:border-emerald-500'
            };
        case 'info':
            return {
                iconBg: 'bg-blue-900/10',
                iconBorder: 'border-blue-900/30',
                iconColor: 'text-blue-500',
                Icon: Info,
                buttonBg: 'bg-blue-900/20 hover:bg-blue-900/40',
                buttonColor: 'text-blue-500',
                buttonBorder: 'border-blue-900 hover:border-blue-500'
            };
        case 'danger':
        default:
            return {
                iconBg: 'bg-red-900/10',
                iconBorder: 'border-red-900/30',
                iconColor: 'text-red-500',
                Icon: AlertTriangle,
                buttonBg: 'bg-red-900/20 hover:bg-red-900/40',
                buttonColor: 'text-red-500',
                buttonBorder: 'border-red-900 hover:border-red-500'
            };
    }
  };

  const styles = getVariantStyles();
  const Icon = styles.Icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 shadow-2xl w-full max-w-md p-1 animate-in zoom-in-95 duration-200">
        <div className="border border-zinc-900 bg-zinc-900/50 p-6">
            <div className="flex items-start gap-4 mb-4">
            <div className={`p-3 rounded-none border shrink-0 ${styles.iconBg} ${styles.iconBorder}`}>
                <Icon className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white uppercase tracking-wide font-mono">{title}</h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed font-mono">
                {message}
                </p>
            </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 mt-8 font-mono">
            <button
                onClick={onCancel}
                disabled={isProcessing}
                className="w-24 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors"
            >
                [{cancelLabel}]
            </button>
            <button
                onClick={onConfirm}
                disabled={isProcessing}
                className={`w-40 px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed ${styles.buttonBg} ${styles.buttonColor} ${styles.buttonBorder}`}
            >
                {isProcessing ? (
                  <>
                     <Loader2 className="w-3 h-3 animate-spin" />
                     <span>PROCESSING</span>
                  </>
                ) : (
                  confirmLabel
                )}
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};