import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INTERN_AUTH } from "../intern.routes";
import { INTERN_DEPARTMENTS } from "../intern.types";

const requirements = [
  "Currently enrolled in or recently completed a relevant degree program",
  "Minimum commitment of 8–12 weeks full-time or equivalent part-time hours",
  "Strong communication skills and professional conduct",
  "Background check and confidentiality agreement required",
  "Passion for rehabilitation, mental health, or allied health care",
];

const benefits = [
  "Supervised clinical exposure in a real rehabilitation setting",
  "Mentorship from licensed doctors and senior therapists",
  "Structured training logs and attendance tracking",
  "Certificate of completion upon successful internship",
  "Pathway to future employment opportunities",
];

export default function InternshipsPage() {
  return (
    <div className="flex flex-col">
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge variant="secondary" className="mb-4">
              Internship & Training Program
            </Badge>
            <h1 className="font-heading text-3xl font-bold sm:text-4xl md:text-5xl">
              Clinical Internships at Life Ways
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Gain hands-on rehabilitation experience under expert supervision. Our structured
              internship program prepares the next generation of mental health and allied health
              professionals.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to={INTERN_AUTH.signup}>Apply / Sign Up</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to={INTERN_AUTH.login}>Intern Login</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <GraduationCap className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="text-lg">Structured Learning</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Daily training logs, supervised tasks, and reflective learning notes tracked through
              our digital internship portal.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Users className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="text-lg">Assigned Mentor</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Every intern is paired with an approved clinical mentor who guides progress and
              reviews attendance and performance.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Stethoscope className="mb-2 h-8 w-8 text-primary" />
              <CardTitle className="text-lg">Clinical Exposure</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Work across psychiatry, psychology, physiotherapy, addiction recovery, and other
              rehabilitation departments.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="container mx-auto grid gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="font-heading text-2xl font-bold">Departments</h2>
            <p className="mt-2 text-muted-foreground">
              Internships are available across the following clinical and support areas:
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {INTERN_DEPARTMENTS.map((dept) => (
                <li key={dept} className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                  {dept}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold">Requirements</h2>
            <ul className="mt-6 space-y-3">
              {requirements.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-heading text-2xl font-bold">Program Benefits</h2>
            <ul className="mt-6 space-y-3">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Ready to apply?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create your intern account to submit your application. Once approved, you can log in
                to access your dashboard, mentor details, and training logs.
              </p>
              <Button asChild className="w-full">
                <Link to={INTERN_AUTH.signup}>Start Application</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
