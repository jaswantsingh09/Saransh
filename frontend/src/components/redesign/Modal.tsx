'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal — centered dialog over a scrim.
 * Figma dialog surface: rounded 16px (2xl), shadow-lg, white card, close button.
 * Presentational + controlled: pass `open` and `onClose`.
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Max width of the dialog (px). Default 480. */
  maxWidth?: number;
  /** Hide the top-right close button. */
  hideClose?: boolean;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 480,
  hideClose = false,
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const node = (
    <AnimatePresence>
      {open ? (
        <div className="redesign-scope fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative w-full overflow-hidden rounded-rd-2xl bg-surface-card shadow-rd-lg',
              className
            )}
            style={{ maxWidth }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {!hideClose ? (
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-rd-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-secondary"
              >
                <X className="size-4" />
              </button>
            ) : null}

            {(title || description) && (
              <div className="flex flex-col gap-1 px-6 pb-2 pt-6 pr-12">
                {title ? (
                  <h2 className="font-rd-sans text-rd-h4 text-ink-heading">{title}</h2>
                ) : null}
                {description ? (
                  <p className="font-rd-sans text-rd-small text-ink-muted">{description}</p>
                ) : null}
              </div>
            )}

            {children ? <div className="px-6 py-2">{children}</div> : null}

            {footer ? (
              <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-4">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}
