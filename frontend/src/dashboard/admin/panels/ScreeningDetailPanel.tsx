import ScreeningDetailPage from "../pages/ScreeningAdminDetailPage";

type ScreeningDetailPanelProps = {
  backTo?: string;
  readOnlyAssignment?: boolean;
};

/** Admin dashboard panel — screening detail. */
export default function ScreeningDetailPanel(props: ScreeningDetailPanelProps) {
  return <ScreeningDetailPage {...props} />;
}
