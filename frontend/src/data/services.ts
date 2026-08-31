import { Heart, Brain, Activity, Users, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ServiceData {
  slug: string;
  title: string;
  shortDesc: string;
  icon: LucideIcon;
  fullDescription: string;
  subServices: string[];
}

export const services: ServiceData[] = [
  {
    slug: "addiction-therapy",
    title: "Addiction Therapy",
    shortDesc: "Evidence-based treatment programs for substance abuse and behavioral addictions with personalized recovery plans.",
    icon: Heart,
    fullDescription:
      "Our Addiction Therapy program offers a comprehensive, multi-phase approach to recovery. We combine medical detoxification with psychiatric assessment, psychotherapy, and family therapy to address the root causes of addiction. Our experienced team creates individualized treatment plans that include behavioral and lifestyle modification, recreational and occupational therapy, psychoeducation, relapse prevention strategies, and long-term aftercare support. Whether dealing with substance abuse or behavioral addictions, our compassionate team walks with you every step of the way.",
    subServices: [
      "Medical Detoxification (Detox)",
      "Psychiatric Assessment & Medication",
      "Psychotherapy / Counseling",
      "Family Therapy",
      "Behavioral & Lifestyle Modification",
      "Recreational & Occupational Therapy",
      "Psychoeducation & Relapse Prevention",
      "Aftercare & Follow-Up",
    ],
  },
  {
    slug: "neurodiversity-support",
    title: "Neurodiversity Support (ADHD, Autism)",
    shortDesc: "Specialized care through our Little Soul Project for ADHD, autism spectrum, and other neurological conditions.",
    icon: Brain,
    fullDescription:
      "The Little Soul Project is our dedicated neurodiversity support program designed for children and adults with ADHD, autism spectrum conditions, and other neurological differences. We provide a warm, structured environment where individuals receive personalized therapies including speech and language therapy, occupational therapy, behavioral therapy using Applied Behavior Analysis (ABA), social skills training, play therapy, and art and music therapy. We also offer parent training and family counseling to ensure a supportive environment at home.",
    subServices: [
      "Speech and Language Therapy",
      "Occupational Therapy (OT)",
      "Behavioral Therapy / Applied Behavior Analysis (ABA)",
      "Social Skills Training",
      "Play Therapy",
      "Art and Music Therapy",
      "Parent Training & Family Counseling",
      "Physical Therapy (PT)",
    ],
  },
  {
    slug: "psychological-training",
    title: "Psychological Training",
    shortDesc: "Cognitive behavioral therapy, counseling, and comprehensive mental health training programs for professionals and individuals.",
    icon: Users,
    fullDescription:
      "Our Psychological Training programs are designed for both individuals seeking personal development and professionals looking to enhance their skills. We offer structured mental health training programs, stress management workshops, parenting training, and professional counseling training. These programs are led by experienced psychologists and trainers who use evidence-based methodologies to equip participants with practical tools for mental wellness and professional growth.",
    subServices: [
      "Mental Health Training Programs",
      "Stress Management",
      "Parenting Training",
      "Professional Counseling Training",
    ],
  },
  {
    slug: "psychotic-support",
    title: "Psychotic Support",
    shortDesc: "Comprehensive psychiatric care including evaluation, medication management, therapy, and family psychoeducation.",
    icon: Shield,
    fullDescription:
      "Our Psychotic Support program provides comprehensive care for individuals experiencing psychotic disorders. We begin with a thorough psychiatric evaluation and medication management plan, followed by tailored psychotherapy and counseling sessions. Our team includes specialists in behavioral management, occupational and recreational therapy, and nursing care for continuous monitoring. We also provide psychoeducation for families to help them understand and support their loved ones, along with robust relapse prevention and aftercare planning.",
    subServices: [
      "Psychiatric Evaluation and Medication Management",
      "Psychotherapy / Counseling",
      "Behavioral Management",
      "Occupational and Recreational Therapy",
      "Nursing Care and Monitoring",
      "Psychoeducation for Family",
      "Relapse Prevention & Aftercare",
    ],
  },
  {
    slug: "physiotherapy",
    title: "Physiotherapy",
    shortDesc: "Physical rehabilitation and exercise-based therapy to restore mobility, strength, and overall well-being.",
    icon: Activity,
    fullDescription:
      "Our Physiotherapy department provides expert physical rehabilitation services for patients recovering from injuries, surgeries, or chronic conditions. Our licensed physiotherapists design personalized exercise programs to restore mobility, build strength, reduce pain, and improve overall physical well-being. We use modern equipment and evidence-based techniques to ensure the best outcomes for every patient.",
    subServices: [
      "Physical Therapy (PT) for physical rehabilitation patients",
    ],
  },
];

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return services.find((s) => s.slug === slug);
}
