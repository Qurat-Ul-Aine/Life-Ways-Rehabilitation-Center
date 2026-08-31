import { createContext, useContext, type ReactNode } from "react";
import { useInternContext } from "./useInternContext";
import type { InternDashboardData } from "@/features/intern/intern.types";

type InternDashboardContextValue = {
  data: InternDashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const InternDashboardContext = createContext<InternDashboardContextValue | undefined>(
  undefined,
);

export function InternDashboardProvider({ children }: { children: ReactNode }) {
  const value = useInternContext();
  return (
    <InternDashboardContext.Provider value={value}>
      {children}
    </InternDashboardContext.Provider>
  );
}

export function useInternDashboardContext() {
  const context = useContext(InternDashboardContext);
  if (!context) {
    throw new Error("useInternDashboardContext must be used within InternDashboardProvider");
  }
  return context;
}
