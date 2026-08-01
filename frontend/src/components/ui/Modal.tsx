import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hideCloseButton?: boolean;
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({
  isOpen, onClose, title, description, children, size = 'md', hideCloseButton = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="relative z-50">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40"
            aria-hidden="true"
          />

          {/* Scrollable Container */}
          <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
              {/* Panel */}
              <motion.div
                key="panel"
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 10 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                className={[
                  'w-full pointer-events-auto my-auto relative',
                  'rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border',
                  'flex flex-col overflow-hidden',
                  sizeMap[size],
                ].join(' ')}
              >
            {/* Header */}
            <div style={{ borderColor: 'var(--border)' }} className="flex items-start justify-between px-6 py-5 border-b">
              <div>
                <h2 id="modal-title" style={{ color: 'var(--text)' }} className="text-[15px] font-semibold">
                  {title}
                </h2>
                {description && (
                  <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mt-0.5">{description}</p>
                )}
              </div>
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  style={{ color: 'var(--text-muted)' }}
                  className="ml-4 -mt-0.5 -mr-1 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {children}
            </div>
          </motion.div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
