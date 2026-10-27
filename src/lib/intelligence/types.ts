import type { CareerTrackSlug } from "@/lib/career/tracks";

export const INTELLIGENCE_TOPICS = [
  "llm-applications",
  "agents",
  "evaluation",
  "data-platform",
  "mlops",
  "open-models",
  "developer-tooling",
] as const;

export type IntelligenceTopic = (typeof INTELLIGENCE_TOPICS)[number];

export const INTELLIGENCE_TOPIC_ORDER: readonly IntelligenceTopic[] = [
  "llm-applications",
  "agents",
  "evaluation",
  "open-models",
  "data-platform",
  "mlops",
  "developer-tooling",
];

export type IntelligenceTopicMeta = {
  label: string;
  description: string;
};

export const INTELLIGENCE_TOPIC_META: Record<
  IntelligenceTopic,
  IntelligenceTopicMeta
> = {
  "llm-applications": {
    label: "Applications built on large models",
    description:
      "Chat, reasoning, and voice features that a product exposes to its users.",
  },
  agents: {
    label: "Agents and tool use",
    description:
      "Model-driven work that calls tools, runs code, or completes multi-step tasks.",
  },
  evaluation: {
    label: "Evaluation and reliability checks",
    description:
      "Ways to measure whether a model or agent actually works, instead of assuming it does.",
  },
  "data-platform": {
    label: "Data platforms and pipelines",
    description:
      "Storage formats, query engines, and the plumbing that moves data.",
  },
  mlops: {
    label: "Serving, monitoring, and ML operations",
    description:
      "Running trained systems in production and watching what they do.",
  },
  "open-models": {
    label: "Open-weights models",
    description:
      "Models whose weights are published so you can run or adapt them yourself.",
  },
  "developer-tooling": {
    label: "Developer tools and coding assistants",
    description:
      "Editors, command-line tools, and assistants that change day-to-day work.",
  },
};

export const INTELLIGENCE_SOURCE_KINDS = [
  "official-documentation",
  "release-notes",
  "project-release",
  "engineering-blog",
  "research-paper",
] as const;

export type IntelligenceSourceKind =
  (typeof INTELLIGENCE_SOURCE_KINDS)[number];

export const INTELLIGENCE_SOURCE_KIND_LABELS: Record<
  IntelligenceSourceKind,
  string
> = {
  "official-documentation": "Official documentation",
  "release-notes": "Vendor release notes",
  "project-release": "Open-source project release",
  "engineering-blog": "Engineering blog",
  "research-paper": "Research paper",
};

export const INTELLIGENCE_DATE_PRECISIONS = ["day", "month", "undated"] as const;

export type IntelligenceDatePrecision =
  (typeof INTELLIGENCE_DATE_PRECISIONS)[number];

export type IndustryUpdate = {
  id: string;
  topic: IntelligenceTopic;
  headline: string;
  whatChanged: string;
  whyItMatters: string;
  sourceName: string;
  sourceKind: IntelligenceSourceKind;
  sourceUrl: string;
  publishedOn: string;
  datePrecision: IntelligenceDatePrecision;
  readOn: string;
  tracks: CareerTrackSlug[];
  skills: string[];
};

export const ATTENTION_LEVELS = ["learn-now", "learn-later", "monitor"] as const;

export type AttentionLevel = (typeof ATTENTION_LEVELS)[number];

export type AttentionMeta = {
  label: string;
  meaning: string;
};

export const ATTENTION_META: Record<AttentionLevel, AttentionMeta> = {
  "learn-now": {
    label: "Learn now",
    meaning:
      "It is about the direction your workspace already points to, or about a skill your own assessment scored under 60 out of 100 — the line this app treats as not shown yet.",
  },
  "learn-later": {
    label: "Learn later",
    meaning:
      "Adjacent to your direction, or a role you have tried but are not heading toward yet.",
  },
  monitor: {
    label: "Just monitor it",
    meaning:
      "Nothing in your records connects to this yet, so it is worth knowing about rather than studying.",
  },
};
