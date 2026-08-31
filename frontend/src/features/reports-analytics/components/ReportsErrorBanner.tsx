interface ReportsErrorBannerProps {
  message?: string;
}

export default function ReportsErrorBanner({
  message = "Failed to load report data. Please check your connection and try again.",
}: ReportsErrorBannerProps) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
