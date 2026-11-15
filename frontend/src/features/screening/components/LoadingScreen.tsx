import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ScreeningLayout from "@/features/screening/components/ScreeningLayout";

type Props = {
  step?: number;
  totalSteps?: number;
  title?: string;
  children?: ReactNode;
};

export default function LoadingScreen({ step = 1, totalSteps = 6, title, children }: Props) {
  return (
    <ScreeningLayout step={step} totalSteps={totalSteps} title={title}>
      {children ?? (
        <>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </>
      )}
    </ScreeningLayout>
  );
}
