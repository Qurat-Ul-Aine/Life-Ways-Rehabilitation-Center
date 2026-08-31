"use strict";

const STANDARD_OPTIONS = [
  { label: "Never", score: 0 },
  { label: "Less than monthly", score: 2 },
  { label: "Monthly", score: 5 },
  { label: "Weekly", score: 10 },
  { label: "Daily or almost daily", score: 15 },
];

const CONDITIONS = [
  {
    slug: "alcohol",
    name: "Alcohol Use",
    description: "Screening for alcohol consumption patterns and related risk.",
    icon: "wine",
    sort_order: 1,
    sections: [
      {
        title: "Alcohol Consumption",
        questions: [
          "How often do you have a drink containing alcohol?",
          {
            text: "How many drinks do you have on a typical day?",
            skipWhenFirstIsNever: true,
          },
          {
            text: "How often do you have 5 or more drinks on one occasion?",
            skipWhenFirstIsNever: true,
          },
        ],
      },
    ],
    guidance: {
      LOW: {
        title: "Low Alcohol Risk",
        description: "Your responses show minimal signs of alcohol misuse.",
        explanation: "Current patterns suggest low concern for alcohol-related harm.",
        recommendations: [
          "Maintain healthy drinking habits",
          "Monitor intake during stressful periods",
          "Stay informed about safe consumption limits",
        ],
      },
      MEDIUM: {
        title: "Moderate Alcohol Risk",
        description: "Some behaviors may indicate risky alcohol use.",
        explanation: "Your answers suggest patterns that warrant closer attention.",
        recommendations: [
          "Consider speaking with a healthcare professional",
          "Track your drinking frequency",
          "Explore support resources if needed",
        ],
      },
      HIGH: {
        title: "High Alcohol Risk",
        description: "Your responses suggest possible alcohol dependency.",
        explanation: "Significant indicators of harmful alcohol use were identified.",
        recommendations: [
          "Seek professional evaluation promptly",
          "Contact our care team for a follow-up appointment",
          "Consider addiction recovery support services",
        ],
      },
    },
  },
  {
    slug: "drug",
    name: "Drug Use",
    description: "Assessment of non-prescribed substance use patterns.",
    icon: "pill",
    sort_order: 2,
    sections: [
      {
        title: "Usage Pattern",
        questions: [
          "How often do you use non-prescribed drugs?",
          { text: "Do you use more than intended?", skipWhenFirstIsNever: true },
          { text: "Do you feel cravings?", skipWhenFirstIsNever: true },
        ],
      },
    ],
    guidance: {
      LOW: {
        title: "Low Drug Use Risk",
        description: "Your responses show minimal signs of substance misuse.",
        explanation: "No significant substance use concerns were identified.",
        recommendations: ["Continue making healthy choices", "Avoid non-prescribed substances"],
      },
      MEDIUM: {
        title: "Moderate Drug Use Risk",
        description: "Some signs may indicate problematic drug use.",
        explanation: "Patterns suggest moderate substance-related concern.",
        recommendations: [
          "Consider seeking guidance or support",
          "Speak with a counselor about your substance use",
        ],
      },
      HIGH: {
        title: "High Drug Use Risk",
        description: "Your responses suggest significant concerns related to drug use.",
        explanation: "Indicators of harmful substance use require professional attention.",
        recommendations: [
          "Please seek professional help immediately",
          "Book an urgent appointment with our clinical team",
        ],
      },
    },
  },
  {
    slug: "mental",
    name: "Psychological Issues",
    description: "Screening for anxiety, depression, and emotional wellbeing.",
    icon: "brain",
    sort_order: 3,
    sections: [
      {
        title: "Emotional State",
        questions: [
          "How often do you feel sad or low?",
          "How often do you feel anxious?",
          "Do you lose interest in activities?",
        ],
      },
      {
        title: "Daily Functioning",
        questions: [
          "Do you have trouble sleeping?",
          "Do you feel low energy?",
          "Do emotions affect your daily life?",
        ],
      },
    ],
    guidance: {
      LOW: {
        title: "Low Mental Health Risk",
        description: "Your responses show minimal emotional distress.",
        explanation: "Current emotional wellbeing appears stable.",
        recommendations: [
          "Continue practicing self-care and stress management",
          "Maintain social connections and healthy routines",
        ],
      },
      MEDIUM: {
        title: "Moderate Mental Health Risk",
        description: "Some symptoms may indicate anxiety or depression.",
        explanation: "Moderate emotional distress was detected in your responses.",
        recommendations: [
          "Consider speaking with a mental health professional",
          "Monitor mood changes over the next few weeks",
        ],
      },
      HIGH: {
        title: "High Mental Health Risk",
        description: "Your responses suggest significant emotional distress.",
        explanation: "Indicators of clinically significant anxiety or depression were found.",
        recommendations: [
          "Seek professional mental health support promptly",
          "Book an appointment with a psychiatrist or psychologist",
          "Contact crisis support if you feel unsafe",
        ],
      },
    },
  },
  {
    slug: "neuro",
    name: "Neurodivergent Conditions",
    description: "Screening for attention, focus, and neurodevelopmental patterns.",
    icon: "sparkles",
    sort_order: 4,
    sections: [
      {
        title: "Attention",
        questions: [
          "Do you struggle to focus?",
          "Do you get distracted easily?",
          "Do you forget tasks?",
        ],
      },
    ],
    guidance: {
      LOW: {
        title: "Low Neurodivergent Risk",
        description: "Your responses show minimal attention-related concerns.",
        explanation: "No significant neurodevelopmental indicators were identified.",
        recommendations: ["Continue current coping strategies", "Maintain structured routines"],
      },
      MEDIUM: {
        title: "Moderate Neurodivergent Risk",
        description: "Some attention-related challenges were reported.",
        explanation: "Patterns may benefit from further neuropsychological evaluation.",
        recommendations: [
          "Consider a formal neuropsychological assessment",
          "Discuss symptoms with a specialist",
        ],
      },
      HIGH: {
        title: "High Neurodivergent Risk",
        description: "Significant attention and focus challenges were reported.",
        explanation: "Responses suggest need for comprehensive neurodevelopmental evaluation.",
        recommendations: [
          "Seek specialist neuropsychiatric evaluation",
          "Book a consultation with our clinical team",
        ],
      },
    },
  },
  {
    slug: "neuropsychiatric",
    name: "Neuropsychiatric Problems",
    description: "Assessment for cognitive, mood, and neuropsychiatric symptoms.",
    icon: "activity",
    sort_order: 5,
    sections: [
      {
        title: "Cognitive & Mood",
        questions: [
          "Do you experience sudden mood changes?",
          "Do you have difficulty with memory or concentration?",
          "Do symptoms interfere with work or relationships?",
        ],
      },
    ],
    guidance: {
      LOW: {
        title: "Low Neuropsychiatric Risk",
        description: "Minimal neuropsychiatric symptoms reported.",
        explanation: "Responses do not indicate significant neuropsychiatric concern.",
        recommendations: ["Maintain healthy sleep and stress management habits"],
      },
      MEDIUM: {
        title: "Moderate Neuropsychiatric Risk",
        description: "Some neuropsychiatric symptoms were reported.",
        explanation: "Further clinical evaluation may be beneficial.",
        recommendations: [
          "Schedule a consultation with a neuropsychiatrist",
          "Keep a symptom diary for two weeks",
        ],
      },
      HIGH: {
        title: "High Neuropsychiatric Risk",
        description: "Significant neuropsychiatric symptoms were reported.",
        explanation: "Responses warrant urgent professional assessment.",
        recommendations: [
          "Seek neuropsychiatric evaluation promptly",
          "Contact our clinical team for follow-up",
        ],
      },
    },
  },
];

const INTRO_CONFIG = {
  title: "Take an Online Screening Test",
  subtitle:
    "A guided health assessment to help you understand symptoms and find appropriate support at Life Ways Rehabilitation Center.",
  purpose:
    "This confidential screening helps identify potential concerns related to substance use, psychological wellbeing, and neurodevelopmental or neuropsychiatric symptoms. Results provide a risk summary and personalised guidance — not a clinical diagnosis.",
  confidentialityNote:
    "Your responses and results are stored securely. Linked results are visible only to you, your assigned doctor, and authorised staff. Anonymous sessions remain accessible via your result link only.",
  instructions: [
    "Choose whether the assessment is for yourself or someone else.",
    "Select one condition area to assess during this session.",
    "Answer every required question honestly based on recent experiences.",
    "Review your confidential result and recommended next steps.",
    "Book a follow-up with our clinical team if you have concerns.",
  ],
  scoringExplanation:
    "Each answer carries a weighted score based on frequency and severity (0 = Never, up to 15 = Daily or almost daily). Your total score is compared to condition-specific thresholds: Low Risk (below medium threshold), Moderate Risk (at or above medium), and High Risk (at or above high threshold). Default thresholds are 20 (moderate) and 40 (high), configurable per condition by administrators.",
  disclaimer:
    "This screening is not a medical diagnosis. Results are confidential and intended for informational purposes only. Always consult a qualified healthcare professional for clinical evaluation.",
  estimatedMinutes: "5–10 min",
  stats: [
    { value: "20 million+", label: "Americans suffer from a substance use disorder" },
    { value: "40 million", label: "adults in the U.S. have an anxiety disorder" },
    { value: "1 in 5", label: "adults have been diagnosed with depression" },
  ],
  bulletPoints: [
    "Becoming aware of symptoms you may be experiencing",
    "Understanding your current risk level",
    "Finding the right help and support for you",
  ],
};

async function upsertConditionMetadata(prisma, cond) {
  const condition = await prisma.screening_conditions.upsert({
    where: { slug: cond.slug },
    update: {
      name: cond.name,
      description: cond.description,
      icon: cond.icon,
      sort_order: cond.sort_order,
      is_active: true,
    },
    create: {
      slug: cond.slug,
      name: cond.name,
      description: cond.description,
      icon: cond.icon,
      sort_order: cond.sort_order,
      is_active: true,
    },
  });

  for (const [riskLevel, guide] of Object.entries(cond.guidance)) {
    await prisma.screening_risk_guidance.upsert({
      where: {
        condition_id_risk_level: {
          condition_id: condition.id,
          risk_level: riskLevel,
        },
      },
      update: {
        title: guide.title,
        description: guide.description,
        explanation: guide.explanation ?? guide.description,
        recommendations: guide.recommendations,
      },
      create: {
        condition_id: condition.id,
        risk_level: riskLevel,
        title: guide.title,
        description: guide.description,
        explanation: guide.explanation ?? guide.description,
        recommendations: guide.recommendations,
      },
    });
  }

  return condition;
}

async function createQuestionsForCondition(prisma, condition, cond) {
  let sortOrder = 0;
  const createdQuestionIds = [];
  const skipWhenNever = { hideWhen: ["Never"] };

  for (const section of cond.sections) {
    for (const questionDef of section.questions) {
      const text = typeof questionDef === "string" ? questionDef : questionDef.text;
      const useSkipNever =
        typeof questionDef === "object" &&
        questionDef.skipWhenFirstIsNever &&
        createdQuestionIds.length > 0;

      const skip_logic = useSkipNever
        ? { dependsOn: createdQuestionIds[0], ...skipWhenNever }
        : null;

      const created = await prisma.screening_questions.create({
        data: {
          condition_id: condition.id,
          section_title: section.title,
          question_text: text,
          question_type: "single_choice",
          options: STANDARD_OPTIONS,
          sort_order: sortOrder++,
          is_required: true,
          scoring_weight: 1,
          skip_logic,
        },
      });
      createdQuestionIds.push(created.id);
    }
    createdQuestionIds.length = 0;
  }
}

async function syncQuestionSkipLogic(prisma, condition, cond) {
  const existing = await prisma.screening_questions.findMany({
    where: { condition_id: condition.id },
    orderBy: { sort_order: "asc" },
  });
  if (existing.length === 0) return;

  let sortIndex = 0;
  for (const section of cond.sections) {
    const sectionIds = [];
    for (const questionDef of section.questions) {
      const row = existing[sortIndex];
      if (!row) break;

      const text = typeof questionDef === "string" ? questionDef : questionDef.text;
      const useSkipNever =
        typeof questionDef === "object" &&
        questionDef.skipWhenFirstIsNever &&
        sectionIds.length > 0;

      sectionIds.push(row.id);

      const skip_logic = useSkipNever
        ? { dependsOn: sectionIds[0], hideWhen: ["Never"] }
        : null;

      await prisma.screening_questions.update({
        where: { id: row.id },
        data: {
          question_text: text,
          section_title: section.title,
          skip_logic,
        },
      });
      sortIndex += 1;
    }
  }
}

/** Upsert intro, condition names, guidance, and skip logic without deleting questions. */
async function syncScreeningContent(prisma) {
  await prisma.screening_config.upsert({
    where: { key: "intro" },
    update: { value: INTRO_CONFIG },
    create: { key: "intro", value: INTRO_CONFIG },
  });

  for (const cond of CONDITIONS) {
    const condition = await upsertConditionMetadata(prisma, cond);
    const questionCount = await prisma.screening_questions.count({
      where: { condition_id: condition.id },
    });
    if (questionCount === 0) {
      await createQuestionsForCondition(prisma, condition, cond);
    } else {
      await syncQuestionSkipLogic(prisma, condition, cond);
    }
  }
}

async function seedScreening(prisma) {
  await prisma.screening_config.upsert({
    where: { key: "intro" },
    update: { value: INTRO_CONFIG },
    create: { key: "intro", value: INTRO_CONFIG },
  });

  for (const cond of CONDITIONS) {
    const condition = await upsertConditionMetadata(prisma, cond);

    await prisma.screening_questions.deleteMany({ where: { condition_id: condition.id } });
    await createQuestionsForCondition(prisma, condition, cond);
  }

  console.log("✅ Screening conditions, questions, and guidance seeded.");
}

module.exports = { seedScreening, syncScreeningContent, INTRO_CONFIG };
