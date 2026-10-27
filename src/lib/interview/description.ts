import {
  CAREER_TRACKS,
  getCareerTrack,
  type CareerTrackSlug,
} from "@/lib/career/tracks";
import { getSkillName, SKILLS } from "@/lib/skills/catalog";

/**
 * Phrases that a real posting uses for each skill in this app's catalogue.
 *
 * The catalogue has no synonyms of its own, so they live here: a posting says
 * "written and untimed queries" or "window functions" and the reader has to
 * connect both to `sql-aggregation`. Every phrase below is something that
 * appears in postings, not a restatement of the skill name.
 */
const SKILL_PHRASES: Record<string, readonly string[]> = {
  "python-basics": ["python"],
  "python-debugging": ["debugging", "debug", "troubleshoot", "troubleshooting"],
  "problem-solving": ["problem-solving", "problem solving", "analytical thinking"],
  "sql-filtering": ["sql", "written queries", "query writing"],
  "sql-aggregation": [
    "group by",
    "aggregation",
    "aggregations",
    "window function",
    "window functions",
  ],
  "sql-joins": ["joins", "join", "relational queries", "multi-table"],
  "sql-subqueries": ["subquery", "subqueries", "common table expression", "cte"],
  "database-design": [
    "database design",
    "data modeling",
    "data modelling",
    "schema design",
    "star schema",
    "dbt",
    "normalization",
  ],
  "descriptive-statistics": [
    "descriptive statistics",
    "summary statistics",
    "measures of central tendency",
  ],
  probability: ["probability", "bayesian", "bayes"],
  "data-distributions": ["distribution", "distributions", "normality"],
  "data-cleaning": [
    "data cleaning",
    "data cleansing",
    "data wrangling",
    "data quality",
    "data validation",
    "missing data",
  ],
  numpy: ["numpy"],
  pandas: ["pandas"],
  "data-visualization": [
    "data visualization",
    "data visualisation",
    "visualisation",
    "visualization",
    "charting",
    "matplotlib",
    "seaborn",
    "plotly",
  ],
  "exploratory-analysis": [
    "exploratory data analysis",
    "eda",
    "ad hoc analysis",
    "ad-hoc analysis",
  ],
  "hypothesis-testing": [
    "hypothesis testing",
    "a/b testing",
    "ab testing",
    "experimentation",
    "statistical significance",
    "p-value",
  ],
  "ml-fundamentals": [
    "machine learning",
    "supervised learning",
    "unsupervised learning",
  ],
  regression: ["regression", "forecasting", "time series", "time-series"],
  classification: ["classification", "propensity model", "churn model"],
  "model-evaluation": [
    "model evaluation",
    "model performance",
    "cross-validation",
    "cross validation",
    "roc curve",
    "confusion matrix",
  ],
  "feature-engineering": [
    "feature engineering",
    "feature store",
    "feature selection",
  ],
  "scikit-learn": ["scikit-learn", "scikit learn", "sklearn"],
  "git-github": ["git", "github", "gitlab", "version control", "pull request"],
  "command-line": ["command line", "shell", "bash", "unix", "terminal"],
  "http-apis": [
    "api",
    "apis",
    "rest api",
    "restful",
    "webhook",
    "endpoints",
    "graphql",
  ],
  "automated-testing": [
    "unit test",
    "unit tests",
    "automated testing",
    "test coverage",
    "pytest",
    "ci/cd",
    "continuous integration",
  ],
  "project-structure": [
    "code review",
    "clean code",
    "software architecture",
    "modular code",
    "repository structure",
  ],
  "llm-applications": [
    "large language model",
    "llm",
    "generative ai",
    "gpt",
    "foundation model",
    "openai",
    "anthropic",
  ],
  "prompt-engineering": ["prompt engineering", "prompt design", "system prompt"],
  "retrieval-augmented-generation": [
    "retrieval augmented generation",
    "rag",
    "vector database",
    "vector store",
    "embeddings",
    "semantic search",
  ],
  "ai-agents": ["ai agent", "ai agents", "agentic", "tool use", "agent workflow"],
  "ai-evaluation": [
    "llm evaluation",
    "model evaluation framework",
    "eval harness",
    "guardrails",
    "red teaming",
    "hallucination",
  ],
  "business-insights": [
    "business impact",
    "stakeholder",
    "key metrics",
    "kpi",
    "kpis",
    "roi",
    "commercial",
    "business case",
  ],
  "technical-communication": [
    "communication skills",
    "storytelling with data",
    "presentation",
    "written communication",
    "cross-functional",
    "non-technical",
  ],
  "interview-readiness": [],
};

/**
 * Role wording found in a posting's title or description. A posting for a
 * "Data Engineer" names responsibilities, not tracks, so the phrases are what
 * an actual title line contains.
 */
const TRACK_PHRASES: Record<CareerTrackSlug, readonly string[]> = {
  "data-analyst": ["data analyst", "business analyst", "reporting analyst"],
  "business-intelligence-analyst": [
    "business intelligence",
    "bi analyst",
    "bi developer",
    "analytics engineer",
  ],
  "data-scientist": ["data scientist", "research scientist", "statistician"],
  "machine-learning-engineer": [
    "machine learning engineer",
    "ml engineer",
    "ml developer",
  ],
  "applied-ai-engineer": ["applied ai", "ai engineer", "artificial intelligence engineer"],
  "generative-ai-engineer": [
    "generative ai engineer",
    "llm engineer",
    "prompt engineer",
    "ai application engineer",
  ],
  "data-engineer": ["data engineer", "pipeline engineer", "analytics infrastructure"],
  "mlops-engineer": ["mlops", "mlops engineer", "ml platform", "model deployment"],
  "ai-automation-engineer": [
    "automation engineer",
    "workflow automation",
    "rpa",
    "ai automation",
    "integration engineer",
  ],
};

const PREFERRED_MARKERS = [
  "nice to have",
  "nice-to-have",
  "preferred",
  "desirable",
  "bonus",
  "plus point",
  "plus side",
  "would be a plus",
  "a plus",
  "advantageous",
  "not required",
  "optional",
  "ideally",
  "familiarity is",
  "interest in",
] as const;

const REQUIRED_MARKERS = [
  "must",
  "required",
  "requirement",
  "you will",
  "you have",
  "essential",
  "proven",
  "strong",
  "solid",
  "deep",
  "extensive",
  "minimum",
  "at least",
  "experience with",
  "proficient",
  "proficiency",
  "ability to",
  "responsibilit",
  "day to day",
  "day-to-day",
  "you are comfortable",
] as const;

export type DescriptionSkill = {
  slug: string;
  name: string;
  wanted: "required" | "preferred";
  /** The words from the posting that produced this, quoted back verbatim. */
  quoted: string[];
};

export type DescriptionRole = {
  slug: CareerTrackSlug;
  name: string;
  family: string;
  quoted: string[];
};

export type JobDescriptionReading = {
  /** What the reader could not connect to the catalogue, kept as a count. */
  characterCount: number;
  wordCount: number;
  skills: DescriptionSkill[];
  roles: DescriptionRole[];
  /** Wording the reader found but deliberately did not turn into a claim. */
  ignored: string[];
};

function toSearchable(text: string) {
  return text.toLowerCase().replace(/\r\n?/g, "\n");
}

/**
 * A phrase matches only at a word edge, so "ai" inside "maintain" or "r"
 * inside "answer" never counts. Hyphens, dots and plus signs stay inside the
 * word so "c++", "scikit-learn" and "p-value" still match.
 */
function findPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(
    `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
  ).test(haystack);
}

function splitIntoLines(text: string): string[] {
  return text
    .split(/\n|(?<=\.)\s+(?=[A-Z])|(?<=;)\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function lineWording(line: string): "required" | "preferred" | null {
  for (const marker of PREFERRED_MARKERS) {
    if (line.includes(marker)) return "preferred";
  }

  for (const marker of REQUIRED_MARKERS) {
    if (line.includes(marker)) return "required";
  }

  return null;
}

/**
 * Postings put the heading on its own line, so a bullet under "Nice to have"
 * carries no marker of its own. Each line takes the wording of the line above
 * it when it has none, which is the only inheritance this reader does.
 */
function wordingOfEachLine(lines: string[]): ("required" | "preferred" | null)[] {
  let carried: "required" | "preferred" | null = null;

  return lines.map((line) => {
    const own = lineWording(line);

    if (own) {
      carried = own;
      return own;
    }

    return carried;
  });
}

/**
 * Reads one wanted skill out of the posting, keeping the exact words that
 * produced it so the screen can show them instead of asserting a match.
 */
function readSkill(
  slug: string,
  lines: string[],
  wording: ("required" | "preferred" | null)[],
  flat: string,
): DescriptionSkill | null {
  const phrases = SKILL_PHRASES[slug];
  if (!phrases || phrases.length === 0) return null;

  const quoted: string[] = [];
  let wanted: "required" | "preferred" | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    for (const phrase of phrases) {
      if (!findPhrase(line, phrase)) continue;

      if (!quoted.includes(phrase)) quoted.push(phrase);

      const marker = wording[index];

      if (marker === "required") wanted = "required";
      else if (marker === "preferred" && wanted === null) wanted = "preferred";
    }
  }

  if (quoted.length === 0) {
    // A single-block posting with no line breaks still counts, as required.
    for (const phrase of phrases) {
      if (findPhrase(flat, phrase) && !quoted.includes(phrase)) {
        quoted.push(phrase);
      }
    }
  }

  if (quoted.length === 0) return null;

  return {
    slug,
    name: getSkillName(slug),
    wanted: wanted ?? "required",
    quoted,
  };
}

function readRole(slug: CareerTrackSlug, flat: string): DescriptionRole | null {
  const phrases = TRACK_PHRASES[slug];
  const quoted: string[] = [];

  for (const phrase of phrases) {
    if (findPhrase(flat, phrase)) quoted.push(phrase);
  }

  if (quoted.length === 0) return null;

  const track = getCareerTrack(slug);

  return {
    slug,
    name: track?.name ?? slug,
    family: track?.family ?? "",
    quoted,
  };
}

/**
 * Turns pasted text into the skills and roles it names, using only this app's
 * own 36-skill catalogue and 9 career tracks. It never decides whether the
 * learner qualifies and never adds a salary, a hiring count, or a vacancy.
 */
export function readJobDescription(raw: string): JobDescriptionReading {
  const text = raw.trim();
  const flat = toSearchable(text);
  const lines = splitIntoLines(flat);
  const wording = wordingOfEachLine(lines);

  const skills: DescriptionSkill[] = [];
  for (const skill of SKILLS) {
    const read = readSkill(skill.slug, lines, wording, flat);
    if (read) skills.push(read);
  }

  const roles: DescriptionRole[] = [];
  for (const track of CAREER_TRACKS) {
    const read = readRole(track.slug, flat);
    if (read) roles.push(read);
  }

  const words = text.split(/\s+/).filter((word) => word.length > 0);

  const ignored: string[] = [];
  if (/(salary|compensation|pay range|hourly)/i.test(flat)) {
    ignored.push(
      "The posting mentions money. This app does not store or repeat pay figures.",
    );
  }
  if (/(remote|hybrid|onsite|on-site|office)/i.test(flat)) {
    ignored.push(
      "The posting mentions where the work happens. Nothing here checked that.",
    );
  }
  if (/(years? of experience|yoe|senior|junior|mid[- ]level|lead)/i.test(flat)) {
    ignored.push(
      "The posting mentions seniority. This app does not turn it into a verdict on you.",
    );
  }

  return {
    characterCount: text.length,
    wordCount: words.length,
    skills,
    roles,
    ignored,
  };
}

export type SkillPosition = {
  slug: string;
  name: string;
  wanted: "required" | "preferred";
  quoted: string[];
  /** Best level this app has evidence for, or null when there is none. */
  evidencedAs: string | null;
  evidenceNote: string;
  state: "supported" | "partial" | "untested" | "gap";
};

export type GapReport = {
  total: number;
  requiredCount: number;
  preferredCount: number;
  positions: SkillPosition[];
  /** One sentence naming the single most useful thing to do next. */
  focus: string;
  /** How many of the posting's named skills the catalogue could not see. */
  note: string;
};

/**
 * Compares a reading against the records this account already holds. The
 * learner's own scores and completed work decide the label; the posting never
 * claims a gap that the app has no record of, and never claims mastery it has
 * not seen evidence for.
 */
export function buildGapReport({
  reading,
  skillPercents,
  evidenceLevels,
}: {
  reading: JobDescriptionReading;
  skillPercents: Map<string, number>;
  evidenceLevels: Map<string, string>;
}): GapReport {
  const positions: SkillPosition[] = reading.skills.map((skill) => {
    const percent = skillPercents.get(skill.slug);
    const level = evidenceLevels.get(skill.slug);

    let state: SkillPosition["state"];
    let evidenceNote: string;

    if (percent === undefined && !level) {
      state = "untested";
      evidenceNote =
        "Nothing here has a record for this skill: no assessment question answered and no finished work named it.";
    } else if (level === "interview_evidence" || level === "project_evidence") {
      state = "supported";
      evidenceNote = `Your own records place it at ${level === "interview_evidence" ? "a question you answered in a practice interview" : "work you finished in a project"}.${percent === undefined ? "" : ` Your assessment scored it ${percent} of 100.`}`;
    } else if (percent !== undefined && percent >= 70) {
      state = "supported";
      evidenceNote = `Your assessment scored it ${percent} of 100.`;
    } else if (percent !== undefined && percent >= 40) {
      state = "partial";
      evidenceNote = `Your assessment scored it ${percent} of 100, which this app reads as part of the way.`;
    } else if (percent !== undefined) {
      state = "gap";
      evidenceNote = `Your assessment scored it ${percent} of 100, under the line this app treats as shown yet.`;
    } else {
      state = "partial";
      evidenceNote = `You have a record at ${level} for this skill, but no assessment score.`;
    }

    return {
      slug: skill.slug,
      name: skill.name,
      wanted: skill.wanted,
      quoted: skill.quoted,
      evidencedAs: level ?? null,
      evidenceNote,
      state,
    };
  });

  const requiredCount = positions.filter((p) => p.wanted === "required").length;
  const preferredCount = positions.length - requiredCount;
  const firstGap = positions.find((p) => p.wanted === "required" && p.state === "gap");
  const firstUntested = positions.find(
    (p) => p.wanted === "required" && p.state === "untested",
  );

  let focus: string;
  if (firstGap) {
    focus = `The posting asks for ${firstGap.name} and your own assessment scored it under 40 out of 100, so that is the first thing to study before you apply.`;
  } else if (firstUntested) {
    focus = `The posting asks for ${firstUntested.name} and this app has no record of it either way, so a short session on it would tell you more than guessing.`;
  } else if (positions.some((p) => p.state === "partial")) {
    focus =
      "Every skill this posting asks for already has a record above the gap line, so the useful next step is practising answers out loud rather than studying more.";
  } else if (positions.length === 0) {
    focus =
      "This posting names nothing the catalogue knows about, so there is nothing to compare. Paste the responsibilities and requirements section, not only the title.";
  } else {
    const unsupported = positions.filter((p) => p.state !== "supported");
    const requiredLine =
      requiredCount === 0
        ? `This posting marks none of the ${positions.length} skills it names as required.`
        : "Every skill this posting marks as required is one your records back.";
    focus =
      unsupported.length === 0
        ? "All of the skills this posting names are ones your records already support. Read the requirements again with your own notes beside them before you decide."
        : `${requiredLine} ${
            unsupported.length
          } ${
            unsupported.length === 1 ? "skill" : "skills"
          } it lists only as a preference ${
            unsupported.length === 1 ? "has" : "have"
          } no record here yet: ${unsupported
            .map((p) => p.name)
            .join(", ")}. A preferred line is what the employer wishes for, not a gate — decide yourself what it costs you.`;
  }

  return {
    total: positions.length,
    requiredCount,
    preferredCount,
    positions,
    focus,
    note:
      positions.length === 0
        ? "0 of the posting's words matched the 36 skills this app knows. That usually means the text pasted was a title or a summary, not the requirements."
        : `${positions.length} of the 36 skills this app knows appear in the text you pasted, found by the words quoted beside each one. A skill the posting asks for in words the catalogue has never seen stays absent, so an empty row is not proof the posting did not ask for it.`,
  };
}

export const DESCRIPTION_DISCLAIMER =
  "The comparison reads the words you paste. It does not open a link, contact anyone, or check that the posting exists, and it turns no phrase into a claim about your chances.";

export const DESCRIPTION_FIELD_LIMITS = {
  minimum: 80,
  maximum: 6_000,
};

/** Exposed so a test can prove no phrase is invented. */
export const SKILL_PHRASE_CATALOGUE = SKILL_PHRASES;
export const ROLE_PHRASE_CATALOGUE = TRACK_PHRASES;
