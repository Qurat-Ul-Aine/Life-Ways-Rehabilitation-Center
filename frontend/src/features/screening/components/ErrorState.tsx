import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import ScreeningLayout from "@/features/screening/components/ScreeningLayout";

type Props = {
  message: string;
  step?: number;
  totalSteps?: number;
  title?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
};

export default function ErrorState({
  message,
  step = 1,
  totalSteps = 6,
  title = "Something went wrong",
  action,
  children,
}: Props) {
  return (
    <ScreeningLayout step={step} totalSteps={totalSteps} title={title}>
      <p className="text-destructive">{message}</p>
      {children}
      {action ? (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      ) : null}
    </ScreeningLayout>
  );
}
