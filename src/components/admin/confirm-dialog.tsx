'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';

export type ConfirmOptions = {
  title: string;
  description?: string;
  /** The button that goes ahead. Say what it does ("Remove section"), not "OK". */
  confirmLabel?: string;
  /** Draw the button red, for deleting. */
  destructive?: boolean;
};

/**
 * An in-page replacement for window.confirm. Browsers and embedded webviews (the Claude desktop app's browser pane, for one)
 * can block native dialogs, in which case confirm() answers "no" without showing anything, and a button that asks
 * first appears to do nothing at all.
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   const remove = async () => { if (!(await confirm({ title: 'Remove it?', destructive: true }))) return; ... };
 *   return <>... {confirmDialog}</>;
 *
 * `confirm` resolves true on the confirm button and false on Cancel, Escape or a click outside. Ask again while one is
 * open and the first is answered "no".
 */
export function useConfirm(): { confirm: (options: ConfirmOptions) => Promise<boolean>; confirmDialog: ReactNode } {
  const [asking, setAsking] = useState<ConfirmOptions | null>(null);
  const answer = useRef<((yes: boolean) => void) | null>(null);
  // The words stay up while the dialog fades out, instead of going blank.
  const shown = useRef<ConfirmOptions | null>(null);
  if (asking) shown.current = asking;

  const settle = (yes: boolean) => {
    answer.current?.(yes);
    answer.current = null;
    setAsking(null);
  };

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        answer.current?.(false);
        answer.current = resolve;
        setAsking(options);
      }),
    [],
  );

  const text = shown.current;
  const confirmDialog = (
    <AlertDialog open={!!asking} onOpenChange={(open) => !open && settle(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text?.title}</AlertDialogTitle>
          {text?.description && <AlertDialogDescription>{text.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className={text?.destructive ? buttonVariants({ variant: 'destructive' }) : undefined} onClick={() => settle(true)}>
            {text?.confirmLabel ?? 'Yes, go ahead'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, confirmDialog };
}
