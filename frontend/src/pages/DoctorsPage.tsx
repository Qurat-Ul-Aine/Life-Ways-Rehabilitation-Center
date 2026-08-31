import { useState, useMemo, useEffect } from "react";
import DoctorCard from "@/components/DoctorCard";
import { fetchDoctorsFromAPI } from "@/data/doctors";
import type { Doctor } from "@/data/doctors";
import { Search } from "lucide-react";

const DoctorsPage = () => {
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [query, setQuery] = useState("");
  const [spec, setSpec] = useState("All");

  useEffect(() => {
    fetchDoctorsFromAPI().then(setAllDoctors);
  }, []);

  const specs = useMemo(
    () => ["All", ...Array.from(new Set(allDoctors.map((d) => d.specialty)))],
    [allDoctors]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allDoctors.filter(
      (d) =>
        (spec === "All" || d.specialty === spec) &&
        (!q || d.name.toLowerCase().includes(q))
    );
  }, [query, spec, allDoctors]);

  return (
    <div className="flex flex-col">
      <section className="bg-section-alt py-16">
        <div className="container mx-auto px-4 text-center">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">
            Our Specialists
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mt-3 mb-4">
            Find Your Doctor
          </h1>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            Browse experienced psychiatrists, psychologists, therapists and medical professionals at Life Ways.
          </p>
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4 space-y-8">
          <div className="flex flex-wrap gap-4 items-center justify-center max-w-3xl mx-auto bg-card p-4 rounded-2xl border border-border shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm min-w-[150px]"
            >
              {specs.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((doctor, index) => (
                <DoctorCard key={doctor.id} doctor={doctor} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              No doctors found matching your search.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DoctorsPage;