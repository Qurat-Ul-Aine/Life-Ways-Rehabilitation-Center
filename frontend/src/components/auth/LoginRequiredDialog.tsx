import { Link, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildLoginPath } from "@/lib/authRedirect";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
};

export default function LoginRequiredDialog({
  open,
  onOpenChange,
  title = "Login Required",
  description = "You must sign in to book an appointment.",
}: Props) {
  const location = useLocation();
  const loginHref = buildLoginPath(
    "/login/patient",
    `${location.pathname}${location.hash}`,
  );
  const registerHref = buildLoginPath(
    "/register",
    `${location.pathname}${location.hash}`,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button asChild className="w-full">
            <Link to={loginHref} onClick={() => onOpenChange(false)}>
              Login
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to={registerHref} onClick={() => onOpenChange(false)}>
              Register
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
