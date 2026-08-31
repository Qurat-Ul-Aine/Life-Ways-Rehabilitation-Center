import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  CalendarPlus,
  ChevronDown,
  HelpCircle,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClinicalAnalysis, DoctorRecommendation } from "../recommendation.types";
import {
  formatAvailability,
  formatRankLabel,
  formatRankingFactor,
} from "../utils/recommendationLabels";
import { formatDoctorGender } from "@/features/doctor/utils/doctorGender";

type RecommendationListItemProps = {
  recommendation: DoctorRecommendation;
  clinicalAnalysis?: ClinicalAnalysis | null;
  analysisId?: string | null;
  rank: number;
};

const PLACEHOLDER_IMAGE = "/placeholder-doctor.png";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function RecommendationListItem({
  recommendation,
  clinicalAnalysis,
  analysisId,
  rank,
}: RecommendationListItemProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const doctor = recommendation.doctor;
  const image =
    doctor?.imageUrl && doctor.imageUrl.trim() !== ""
      ? doctor.imageUrl
      : PLACEHOLDER_IMAGE;

  const availability = formatAvailability(doctor?.availability);
  const factors = recommendation.rankingFactors ?? [];
  const isGenderFallback = factors.includes("gender_fallback");

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (rank - 1) * 0.06 }}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        <div className="flex shrink-0 items-center gap-3 sm:w-16 sm:flex-col sm:pt-1">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
              rank === 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            #{rank}
          </div>
          <span className="text-xs font-medium text-muted-foreground sm:text-center">
            {formatRankLabel(rank)}
          </span>
        </div>

        <Avatar className="h-16 w-16 shrink-0 rounded-xl border border-border">
          <AvatarImage src={image} alt={doctor?.name ?? "Doctor"} className="object-cover" />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
            {doctor?.name ? initials(doctor.name) : <UserRound className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-foreground">{doctor?.name ?? "Specialist"}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
                <Stethoscope className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{doctor?.specialization || "Rehabilitation specialist"}</span>
              </div>
              {doctor?.qualification && (
                <p className="mt-1 text-xs text-muted-foreground">{doctor.qualification}</p>
              )}
              {doctor?.gender ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Gender: {formatDoctorGender(doctor.gender)}
                </p>
              ) : null}
            </div>

            <Badge className="shrink-0 tabular-nums text-sm">
              {Math.round(recommendation.score)}% match
            </Badge>
            {isGenderFallback ? (
              <Badge variant="outline" className="shrink-0 text-xs">
                Alternative match
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill
              label="Availability"
              value={availability.label}
              highlight={availability.variant === "available"}
            />
            <StatPill
              label="Experience"
              value={`${doctor?.experience ?? 0} yrs`}
            />
            <StatPill
              label="Patients treated"
              value={String(doctor?.patientsTreated ?? 0)}
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatPill
              label="Success rate"
              value={`${Math.round(doctor?.successRate ?? 0)}%`}
              icon={<Award className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setWhyOpen((open) => !open)}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Why recommended
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", whyOpen && "rotate-180")}
              />
            </Button>
            {doctor?.id && (
              <>
                <Button type="button" size="sm" variant="secondary" asChild>
                  <Link
                    to={`/patient/dashboard/appointments?book=1&doctorId=${encodeURIComponent(doctor.id)}${
                      analysisId ? `&analysisId=${encodeURIComponent(analysisId)}` : ""
                    }`}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Book appointment
                  </Link>
                </Button>
                <Button type="button" size="sm" asChild>
                  <Link to={`/doctors/${doctor.id}`}>View Profile</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {whyOpen && (
        <div className="border-t border-border bg-muted/30 px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold text-foreground">Why we recommended {doctor?.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {recommendation.reason || "This doctor was matched based on your assessment profile."}
          </p>

          {factors.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {factors
                .filter((factor) => factor !== "gender_fallback")
                .map((factor) => (
                <li key={factor} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {formatRankingFactor(factor)}
                </li>
              ))}
            </ul>
          )}

          {clinicalAnalysis?.conditionType && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Detected condition: </span>
              {clinicalAnalysis.conditionType}
            </p>
          )}
        </div>
      )}
    </motion.article>
  );
}

function StatPill({
  label,
  value,
  highlight = false,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 flex items-center gap-1 text-sm font-semibold tabular-nums",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}
