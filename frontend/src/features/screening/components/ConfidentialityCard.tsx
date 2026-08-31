import { Card, CardContent } from "@/components/ui/card";

type Props = {
  message?: string;
};

export default function ConfidentialityCard({
  message = "Confidential — visible only to you and authorised care team members.",
}: Props) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardContent className="space-y-2 p-4 text-center text-xs text-slate-500">
        <p>{message}</p>
      </CardContent>
    </Card>
  );
}
