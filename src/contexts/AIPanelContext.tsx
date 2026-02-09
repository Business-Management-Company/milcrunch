import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type AIPanelContextValue = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

const AIPanelContext = createContext<AIPanelContextValue | null>(null);

export function AIPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value: AIPanelContextValue = { isOpen, toggle, open, close };
  return (
    <AIPanelContext.Provider value={value}>
      {children}
    </AIPanelContext.Provider>
  );
}

export function useAIPanel() {
  const ctx = useContext(AIPanelContext);
  if (!ctx) {
    return {
      isOpen: false,
      toggle: () => {},
      open: () => {},
      close: () => {},
    };
  }
  return ctx;
}
