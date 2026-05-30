import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (value: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value);
  }, []);

  const toggle = useCallback(() => {
    setOpenState((prev) => !prev);
  }, []);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({ open, setOpen, toggle }),
    [open, setOpen, toggle],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return ctx;
}
