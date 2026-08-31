import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Unauthorized() {
  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-7 w-7 text-muted-foreground" aria-hidden />
          </div>
          <CardTitle>Access not allowed</CardTitle>
          <CardDescription>
            Your account is signed in, but this area requires a different role or permission.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="default">
            <Link to="/">Go to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/login">Switch account</Link>
          </Button>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Need help? Email{" "}
        <a href="mailto:info@lifewaysrehab.com" className="text-primary underline underline-offset-2">
          info@lifewaysrehab.com
        </a>
      </p>
    </div>
  );
}
