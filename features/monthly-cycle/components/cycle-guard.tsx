"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const beforeUnload = (event: BeforeUnloadEvent) => {
  event.preventDefault();
};

const warnBeforeLeavingCycle = (isDirty: boolean) => {
  if (!isDirty) {
    return;
  }
  window.addEventListener("beforeunload", beforeUnload);
  return () => window.removeEventListener("beforeunload", beforeUnload);
};

interface CycleGuardValue {
  /**
   * Runs the action now, or — when the step holds unsaved changes — asks
   * first and only runs it once the coach confirms the discard.
   */
  confirmNavigation: (action: () => void) => void;
  setDirty: (dirty: boolean) => void;
}

const CycleGuardContext = createContext<CycleGuardValue | undefined>(undefined);

/**
 * The workflow shell mounts one guard for the whole cycle, so navigating
 * between steps never loses track of an unsaved form.
 */
export const CycleGuardProvider = ({ children }: { children: ReactNode }) => {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    (() => void) | undefined
  >();
  const dirtyRef = useRef(false);

  const setDirty = useCallback((next: boolean) => {
    dirtyRef.current = next;
    setIsDirty(next);
  }, []);

  const confirmNavigation = useCallback((action: () => void) => {
    if (dirtyRef.current) {
      setPendingAction(() => action);
      return;
    }
    action();
  }, []);

  const discardAndContinue = useCallback(() => {
    dirtyRef.current = false;
    setIsDirty(false);
    const action = pendingAction;
    setPendingAction(undefined);
    action?.();
  }, [pendingAction]);

  useEffect(() => warnBeforeLeavingCycle(isDirty), [isDirty]);

  const value = useMemo(
    () => ({ confirmNavigation, setDirty }),
    [confirmNavigation, setDirty]
  );

  return (
    <CycleGuardContext.Provider value={value}>
      {children}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(undefined);
          }
        }}
        open={pendingAction !== undefined}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This step has changes that have not been saved. Leaving now
              discards them; your previously saved data is untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndContinue}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CycleGuardContext.Provider>
  );
};

export const useCycleGuard = (): CycleGuardValue => {
  const context = useContext(CycleGuardContext);
  if (!context) {
    throw new Error("useCycleGuard must be used inside CycleGuardProvider.");
  }
  return context;
};
