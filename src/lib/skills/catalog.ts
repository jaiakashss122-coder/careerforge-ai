export type SkillCategory =
  | "programming"
  | "sql"
  | "data-science"
  | "machine-learning"
  | "software-development"
  | "ai-engineering"
  | "career";

export type SkillDefinition = {
  slug: string;
  name: string;
  category: SkillCategory;
  description: string;
};

/**
 * Mirrors supabase/migrations/20261023000200_seed_skills.sql so client
 * preview mode and roadmap generation can use the same catalogue without a
 * network request. Database ids are always resolved on the server.
 */
export const SKILLS: readonly SkillDefinition[] = [
  {
    slug: "python-basics",
    name: "Python basics",
    category: "programming",
    description:
      "Variables, types, conditions, loops, functions, and collections.",
  },
  {
    slug: "python-debugging",
    name: "Debugging Python",
    category: "programming",
    description:
      "Reading tracebacks, isolating faults, and fixing small programs.",
  },
  {
    slug: "problem-solving",
    name: "Programming problem solving",
    category: "programming",
    description:
      "Breaking a problem into steps and implementing a correct solution.",
  },
  {
    slug: "sql-filtering",
    name: "SQL filtering and sorting",
    category: "sql",
    description:
      "SELECT, WHERE, ORDER BY, and NULL-aware filtering.",
  },
  {
    slug: "sql-aggregation",
    name: "SQL aggregation",
    category: "sql",
    description: "GROUP BY, HAVING, and aggregate functions.",
  },
  {
    slug: "sql-joins",
    name: "SQL joins",
    category: "sql",
    description: "Combining tables with inner, left, and related joins.",
  },
  {
    slug: "sql-subqueries",
    name: "SQL subqueries",
    category: "sql",
    description: "Nested queries and multi-step analytical questions.",
  },
  {
    slug: "database-design",
    name: "Relational database design",
    category: "sql",
    description:
      "Tables, keys, relationships, normalization, and integrity.",
  },
  {
    slug: "descriptive-statistics",
    name: "Descriptive statistics",
    category: "data-science",
    description: "Center, spread, and shape of data.",
  },
  {
    slug: "probability",
    name: "Probability fundamentals",
    category: "data-science",
    description:
      "Events, conditional probability, and common distributions.",
  },
  {
    slug: "data-distributions",
    name: "Data types and distributions",
    category: "data-science",
    description:
      "Recognising variable types and distributional patterns.",
  },
  {
    slug: "data-cleaning",
    name: "Data cleaning",
    category: "data-science",
    description:
      "Missing values, duplicates, types, and validity checks.",
  },
  {
    slug: "numpy",
    name: "NumPy fundamentals",
    category: "data-science",
    description:
      "Arrays, vectorized operations, and numeric computing.",
  },
  {
    slug: "pandas",
    name: "pandas fundamentals",
    category: "data-science",
    description:
      "DataFrames, selection, grouping, joins, and transformation.",
  },
  {
    slug: "data-visualization",
    name: "Data visualization",
    category: "data-science",
    description:
      "Choosing and building charts that communicate evidence.",
  },
  {
    slug: "exploratory-analysis",
    name: "Exploratory data analysis",
    category: "data-science",
    description: "Structured investigation before modelling.",
  },
  {
    slug: "hypothesis-testing",
    name: "Hypothesis testing",
    category: "data-science",
    description: "Sampling, uncertainty, and basic statistical tests.",
  },
  {
    slug: "ml-fundamentals",
    name: "Machine learning fundamentals",
    category: "machine-learning",
    description: "Supervised and unsupervised learning concepts.",
  },
  {
    slug: "regression",
    name: "Regression",
    category: "machine-learning",
    description:
      "Predicting numeric targets and interpreting baselines.",
  },
  {
    slug: "classification",
    name: "Classification",
    category: "machine-learning",
    description:
      "Predicting categories and evaluating class decisions.",
  },
  {
    slug: "model-evaluation",
    name: "Model evaluation",
    category: "machine-learning",
    description:
      "Splits, metrics, cross-validation, leakage, and overfitting.",
  },
  {
    slug: "feature-engineering",
    name: "Feature engineering",
    category: "machine-learning",
    description:
      "Preparing informative inputs without leaking target information.",
  },
  {
    slug: "scikit-learn",
    name: "scikit-learn workflows",
    category: "machine-learning",
    description:
      "Pipelines, estimators, and reproducible model training.",
  },
  {
    slug: "git-github",
    name: "Git and GitHub",
    category: "software-development",
    description:
      "Version control, branches, commits, and pull requests.",
  },
  {
    slug: "command-line",
    name: "Command line",
    category: "software-development",
    description: "Navigating and running tools from a terminal.",
  },
  {
    slug: "http-apis",
    name: "HTTP and APIs",
    category: "software-development",
    description: "Requests, responses, JSON, and API integration.",
  },
  {
    slug: "automated-testing",
    name: "Automated testing",
    category: "software-development",
    description:
      "Unit tests, test cases, and trustworthy feedback.",
  },
  {
    slug: "project-structure",
    name: "Project structure",
    category: "software-development",
    description:
      "Reading and organising maintainable codebases.",
  },
  {
    slug: "llm-applications",
    name: "LLM application development",
    category: "ai-engineering",
    description:
      "Building applications on top of language model APIs.",
  },
  {
    slug: "prompt-engineering",
    name: "Prompt engineering",
    category: "ai-engineering",
    description:
      "Designing instructions, context, and evaluation-driven prompts.",
  },
  {
    slug: "retrieval-augmented-generation",
    name: "RAG systems",
    category: "ai-engineering",
    description:
      "Retrieval, grounding, and citation-aware generation.",
  },
  {
    slug: "ai-agents",
    name: "AI agents and tools",
    category: "ai-engineering",
    description:
      "Tool use, workflow control, and reliable agent boundaries.",
  },
  {
    slug: "ai-evaluation",
    name: "AI evaluation and reliability",
    category: "ai-engineering",
    description:
      "Testing, measuring, and monitoring model-powered systems.",
  },
  {
    slug: "business-insights",
    name: "Business insight communication",
    category: "career",
    description:
      "Turning analysis into clear decisions and recommendations.",
  },
  {
    slug: "technical-communication",
    name: "Technical communication",
    category: "career",
    description:
      "Explaining technical work clearly in writing and interviews.",
  },
  {
    slug: "interview-readiness",
    name: "Interview readiness",
    category: "career",
    description:
      "Communicating evidence for technical and behavioural interviews.",
  },
] as const;

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  programming: "Programming",
  sql: "SQL and databases",
  "data-science": "Data science foundations",
  "machine-learning": "Machine learning",
  "software-development": "Software development",
  "ai-engineering": "AI engineering",
  career: "Career and communication",
};

export const SKILL_CATEGORY_ORDER: readonly SkillCategory[] = [
  "programming",
  "sql",
  "data-science",
  "machine-learning",
  "software-development",
  "ai-engineering",
  "career",
];

export function getSkill(slug: string) {
  return SKILLS.find((skill) => skill.slug === slug) ?? null;
}

export function getSkillName(slug: string) {
  return getSkill(slug)?.name ?? slug;
}

export function getSkillCategory(slug: string): SkillCategory | null {
  return getSkill(slug)?.category ?? null;
}

export function listSkillsByCategory(category: SkillCategory) {
  return SKILLS.filter((skill) => skill.category === category);
}
