type Props = {
  recommendations: string[];
};

export default function RecommendationCard({ recommendations }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 font-semibold text-white">Recommended Actions</h3>
      <ul className="space-y-2 text-sm text-slate-300">
        {recommendations.map((rec) => (
          <li key={rec} className="flex gap-2">
            <span className="text-primary">•</span>
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
