import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  message: string;
  children?: ReactNode;
};

export default function EmptyState({ message, children }: Props) {
  return (
    <Card className="border-dashed border-slate-800 bg-slate-900 p-6 text-center">
      <CardContent className="p-0">
        <p className="text-sm text-slate-400">{message}</p>
        {children}
      </CardContent>
    </Card>
  );
}
