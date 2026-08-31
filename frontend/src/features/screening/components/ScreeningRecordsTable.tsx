import { useNavigate } from "react-router-dom";
import { Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminScreeningItem, ScreeningCondition } from "@/features/screening/types/screening.types";

function riskVariant(risk: string | null) {
  if (risk === "high") return "destructive" as const;
  if (risk === "moderate") return "secondary" as const;
  return "outline" as const;
}

type Props = {
  items: AdminScreeningItem[];
  total: number;
  loading: boolean;
  search: string;
  riskFilter: string;
  conditionFilter: string;
  conditions: ScreeningCondition[];
  onSearchChange: (v: string) => void;
  onRiskFilterChange: (v: string) => void;
  onConditionFilterChange: (v: string) => void;
  hideRiskFilter?: boolean;
  detailPath: (id: string) => string;
};

export default function ScreeningRecordsTable({
  items,
  total,
  loading,
  search,
  riskFilter,
  conditionFilter,
  conditions,
  onSearchChange,
  onRiskFilterChange,
  onConditionFilterChange,
  hideRiskFilter,
  detailPath,
}: Props) {
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="border-input bg-background pl-9 text-foreground placeholder:text-muted-foreground"
            placeholder="Search patient, condition..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {!hideRiskFilter && (
          <Select value={riskFilter} onValueChange={onRiskFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risks</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={conditionFilter} onValueChange={onConditionFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All conditions</SelectItem>
            {conditions.map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No screening records found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow
                  key={s.id}
                  className={s.riskLevel === "high" ? "bg-destructive/5" : undefined}
                >
                  <TableCell>
                    <p className="font-medium">{s.patientName}</p>
                    {s.flagged ? (
                      <Badge variant="destructive" className="mt-1 text-[10px]">
                        Flagged
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{s.condition}</TableCell>
                  <TableCell>{s.score ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={riskVariant(s.riskLevel)} className="capitalize">
                      {s.riskLevel ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{s.assessmentType ?? "—"}</TableCell>
                  <TableCell>{s.testDate ? String(s.testDate).slice(0, 10) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(detailPath(s.id))}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      <p className="mt-3 text-sm text-muted-foreground">{total} total records</p>
    </>
  );
}
