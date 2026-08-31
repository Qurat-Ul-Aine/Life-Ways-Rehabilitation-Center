import ProgressBar from "@/features/screening/components/ProgressBar";

type Props = {
  sectionIndex: number;
  sectionCount: number;
  sectionTitle: string;
  answered: number;
  total: number;
  percent: number;
};

export default function QuestionnaireStepper({
  sectionIndex,
  sectionCount,
  sectionTitle,
  answered,
  total,
  percent,
}: Props) {
  return (
    <>
      <ProgressBar answered={answered} total={total} percent={percent} />
      <p className="text-sm text-slate-400">
        Section {sectionIndex + 1} of {sectionCount}: {sectionTitle}
      </p>
    </>
  );
}
