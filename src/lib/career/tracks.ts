export const CAREER_TRACK_SLUGS = [
  "data-analyst",
  "business-intelligence-analyst",
  "data-scientist",
  "machine-learning-engineer",
  "applied-ai-engineer",
  "generative-ai-engineer",
  "data-engineer",
  "mlops-engineer",
  "ai-automation-engineer",
] as const;

export type CareerTrackSlug = (typeof CAREER_TRACK_SLUGS)[number];

export type CareerTrack = {
  slug: CareerTrackSlug;
  name: string;
  family: "Analytics" | "Data science" | "AI engineering" | "Data platform";
  summary: string;
};

export const CAREER_TRACKS: readonly CareerTrack[] = [
  {
    slug: "data-analyst",
    name: "Data Analyst",
    family: "Analytics",
    summary:
      "Turns data into clear business answers using SQL, spreadsheets, statistics, and dashboards.",
  },
  {
    slug: "business-intelligence-analyst",
    name: "Business Intelligence Analyst",
    family: "Analytics",
    summary:
      "Builds trusted reporting models and dashboards that help teams monitor and make decisions.",
  },
  {
    slug: "data-scientist",
    name: "Data Scientist",
    family: "Data science",
    summary:
      "Investigates questions with statistics and machine learning, then communicates evidence and recommendations.",
  },
  {
    slug: "machine-learning-engineer",
    name: "Machine Learning Engineer",
    family: "AI engineering",
    summary:
      "Builds, evaluates, and ships machine learning systems with production software engineering practices.",
  },
  {
    slug: "applied-ai-engineer",
    name: "Applied AI Engineer",
    family: "AI engineering",
    summary:
      "Integrates models into reliable products, focusing on evaluation, latency, cost, and user value.",
  },
  {
    slug: "generative-ai-engineer",
    name: "Generative AI / LLM Engineer",
    family: "AI engineering",
    summary:
      "Designs LLM-powered applications such as assistants, retrieval systems, and agent workflows.",
  },
  {
    slug: "data-engineer",
    name: "Data Engineer",
    family: "Data platform",
    summary:
      "Builds ingestion, transformation, and storage pipelines that make reliable data available to others.",
  },
  {
    slug: "mlops-engineer",
    name: "MLOps Engineer",
    family: "Data platform",
    summary:
      "Automates deployment, monitoring, and lifecycle management for machine learning systems.",
  },
  {
    slug: "ai-automation-engineer",
    name: "AI Automation Engineer",
    family: "AI engineering",
    summary:
      "Connects models, tools, and business workflows to automate repeatable work safely.",
  },
] as const;

export function getCareerTrack(slug: string | null | undefined) {
  return CAREER_TRACKS.find((track) => track.slug === slug) ?? null;
}

export function isCareerTrackSlug(value: string): value is CareerTrackSlug {
  return CAREER_TRACK_SLUGS.includes(value as CareerTrackSlug);
}
