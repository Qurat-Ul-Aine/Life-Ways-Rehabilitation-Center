import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LoginRequiredDialog from "./LoginRequiredDialog";
import { useLoginGate } from "@/hooks/useLoginGate";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  dialogTitle?: string;
  dialogDescription?: string;
  onAllowedClick?: () => void;
  unstyled?: boolean;
  className?: string;
};

export default function AuthGatedButton({
  children,
  dialogTitle,
  dialogDescription,
  onAllowedClick,
  unstyled = false,
  className,
  onClick,
  ...rest
}: Props) {
  const {
    canAccessPatientFeatures,
    requirePatientAuth,
    loginDialogOpen,
    setLoginDialogOpen,
  } = useLoginGate();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (canAccessPatientFeatures) {
      onAllowedClick?.();
      return;
    }

    requirePatientAuth();
  };

  const content = unstyled ? (
    <button type="button" className={className} onClick={handleClick} {...rest}>
      {children}
    </button>
  ) : (
    <Button type="button" className={cn(className)} onClick={handleClick} {...rest}>
      {children}
    </Button>
  );

  return (
    <>
      {content}
      <LoginRequiredDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        title={dialogTitle}
        description={dialogDescription}
      />
    </>
  );
}
