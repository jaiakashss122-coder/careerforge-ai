import { getTrackSkills } from "@/lib/assessment/career-fit";
import type { CareerTrackSlug } from "@/lib/career/tracks";
import { PROJECT_TEMPLATES } from "@/lib/projects/templates";

export type CareerRoleProfile = {
  slug: CareerTrackSlug;
  responsibilities: readonly string[];
  tools: readonly string[];
  interviewTopics: readonly string[];
  entryBar: readonly string[];
  progression: string;
};

export const CAREER_ROLE_PROFILES: Record<
  CareerTrackSlug,
  CareerRoleProfile
> = {
  "data-analyst": {
    slug: "data-analyst",
    responsibilities: [
      "Turn a business question into a query someone else can check.",
      "Clean and join tables, then work out which parts of the data can be trusted.",
      "Report the answer in writing, with the number first and the caveats after it.",
      "Repeat the same report on a schedule and notice when it stops making sense.",
    ],
    tools: ["SQL", "spreadsheets", "Python or R for analysis", "a BI dashboard tool"],
    interviewTopics: [
      "Writing a query with a join, a filter and a group-by on a whiteboard.",
      "Explaining a metric's exact definition and how it can mislead.",
      "A case question: sales fell last month, what do you check first?",
      "How you told a stakeholder that their assumption was wrong.",
    ],
    entryBar: [
      "You can write the query yourself instead of asking someone else for the extract.",
      "You have one example where your answer changed what somebody did.",
      "You can explain why your number is a limit of the data, not the truth.",
    ],
    progression:
      "Usually into senior analyst work on one business area, then toward product analytics, BI development, or data science once the statistics and modelling are genuinely yours.",
  },
  "business-intelligence-analyst": {
    slug: "business-intelligence-analyst",
    responsibilities: [
      "Agree metric definitions across teams and write them down so they stop drifting.",
      "Model the data so the same number can be reused in many reports.",
      "Build and maintain dashboards people open during real decisions.",
      "Investigate why a number moved before anybody blames the dashboard.",
    ],
    tools: ["SQL", "a BI tool", "a modelling layer or views", "spreadsheet checks", "version control"],
    interviewTopics: [
      "Designing a star schema for a small business and defending the keys.",
      "Handling a metric two teams define differently.",
      "Making a dashboard load quickly enough that people use it.",
      "Deciding what not to put on the first screen.",
    ],
    entryBar: [
      "You have specified a report well enough that someone else could rebuild it.",
      "You can explain a data model to a non-technical person without naming tables.",
      "You have caught a wrong number before a stakeholder did.",
    ],
    progression:
      "Toward analytics engineering, BI development, or data engineering when modelling and pipeline work become the part you enjoy.",
  },
  "data-scientist": {
    slug: "data-scientist",
    responsibilities: [
      "Convert a vague question into something measurable and testable.",
      "Prepare data, build a baseline, then a model, and compare them fairly.",
      "Run experiments and state the uncertainty instead of the headline number.",
      "Present evidence and a recommendation, including the case for doing nothing.",
    ],
    tools: ["Python", "SQL", "statistics", "notebooks", "an experiment or modelling library"],
    interviewTopics: [
      "Choosing an evaluation measure and explaining why the obvious one is wrong.",
      "Designing an A/B test: sample size, duration, and what would ruin it.",
      "Handling imbalance, missing values, and leakage.",
      "Explaining a model's result to someone who will not read the code.",
    ],
    entryBar: [
      "You have beaten a simple baseline and can say what made the difference.",
      "You can describe one model you built and the three ways it fails.",
      "You have written an honest limitations section you stand behind.",
    ],
    progression:
      "Toward senior or staff data science in one domain, or toward machine learning engineering if the shipping mattered more than the modelling.",
  },
  "machine-learning-engineer": {
    slug: "machine-learning-engineer",
    responsibilities: [
      "Turn a model into software with an interface, tests, and error handling.",
      "Make training and inference repeatable from a clean checkout.",
      "Watch a model in use and notice when its inputs stop looking like the training data.",
      "Own latency, cost, and reliability for the feature you shipped.",
    ],
    tools: ["Python", "software testing tools", "git and CI", "containers", "one cloud or serving stack"],
    interviewTopics: [
      "Coding: data structures, and writing a function another person can test.",
      "Serving design: batching, caching, timeouts, and what happens when the model is down.",
      "Reproducibility: seeds, data versioning, and configuration.",
      "Monitoring: the first signal that something is quietly wrong.",
    ],
    entryBar: [
      "You have a repository someone else can run without asking you questions.",
      "You wrote the tests for the failure cases, not only the happy path.",
      "You can point at a real run you reproduced, not only a notebook result.",
    ],
    progression:
      "Toward senior ML platform or inference work, or toward MLOps when pipelines and reliability became the interesting part.",
  },
  "applied-ai-engineer": {
    slug: "applied-ai-engineer",
    responsibilities: [
      "Decide where a model helps a product and where a plain rule is better.",
      "Write the checkable definition of a good answer, then measure the outputs against it.",
      "Handle cost, latency, and the failure cases a demo never reaches.",
      "Ship the feature behind a flag and keep it useful when the model changes.",
    ],
    tools: ["Python or TypeScript", "an HTTP API layer", "provider SDKs", "evaluation scripts", "logging"],
    interviewTopics: [
      "Designing a model-backed feature end to end, including the parts you would not automate.",
      "Evaluating quality without ground-truth labels.",
      "Cost and latency trade-offs, and what you would cache.",
      "Handling output that is confidently wrong.",
    ],
    entryBar: [
      "You can show an evaluation you ran and a decision it changed.",
      "You have handled a failure path in code, not only in a plan.",
      "You can say when a simpler rule beats the model.",
    ],
    progression:
      "Deeper into product ownership of AI features, or toward generative AI engineering when retrieval and agent design became the core of the job.",
  },
  "generative-ai-engineer": {
    slug: "generative-ai-engineer",
    responsibilities: [
      "Design prompts, retrieval, and tool calls for one narrow job.",
      "Build test sets and score outputs instead of eyeballing a few good examples.",
      "Chain steps together and decide what to do when a step produces junk.",
      "Document which model, settings, and date produced an answer.",
    ],
    tools: ["Python or TypeScript", "a retrieval store", "provider APIs", "an evaluation harness", "version control"],
    interviewTopics: [
      "Retrieval design: chunking, matching, and why an answer cited the wrong passage.",
      "Building a rubric and scoring outputs with it.",
      "Agent design: when a tool call should stop.",
      "Guardrails and what they cannot prevent.",
    ],
    entryBar: [
      "You have a results sheet for a set of inputs, including the ones that failed.",
      "You can explain one change you made after measuring rather than guessing.",
      "You know what the underlying model costs and how slow it is.",
    ],
    progression:
      "Toward applied AI or ML platform roles once you want the system around the model, or toward product work once the user outcome matters most.",
  },
  "data-engineer": {
    slug: "data-engineer",
    responsibilities: [
      "Move data from a source to a warehouse on a schedule that holds.",
      "Model tables so an analyst can answer a question without asking you.",
      "Add checks that fail loudly when a source changes shape.",
      "Keep runs repeatable so reprocessing one day does not double rows.",
    ],
    tools: ["SQL", "Python", "the command line", "an orchestration tool", "a warehouse or Postgres"],
    interviewTopics: [
      "Modelling: keys, slowly changing dimensions, and what you would denormalise.",
      "Idempotency and backfills after a bad load.",
      "Handling late, duplicated, or schema-changed data.",
      "Making a pipeline observable: how you would know it broke at 3am.",
    ],
    entryBar: [
      "You have built a load that is safe to run twice.",
      "You wrote a check that caught a real problem.",
      "Someone else has used your table to answer something without your help.",
    ],
    progression:
      "Toward analytics engineering, platform engineering, or MLOps when feature and model data became the interesting part.",
  },
  "mlops-engineer": {
    slug: "mlops-engineer",
    responsibilities: [
      "Make training reproducible with configuration, versions, and a run log.",
      "Automate deployment and rollback for a model-backed service.",
      "Monitor inputs and results, and define what counts as drift.",
      "Cut the time between a data scientist finishing work and users getting it.",
    ],
    tools: ["Python", "containers", "CI", "an orchestration or workflow tool", "monitoring"],
    interviewTopics: [
      "Designing a training and deployment path for one model, including rollback.",
      "Reproducibility: seeds, data snapshots, and configuration.",
      "Testing a model service when the output is not exact.",
      "Alerting on quality instead of uptime.",
    ],
    entryBar: [
      "You can name which run produced which result.",
      "You have automated a step you used to do by hand.",
      "You have defined a check that would notice a model getting worse.",
    ],
    progression:
      "Toward ML platform engineering or data infrastructure, once owning the system rather than the model is the whole job.",
  },
  "ai-automation-engineer": {
    slug: "ai-automation-engineer",
    responsibilities: [
      "Find a repeated task and describe every step, including the judgement calls.",
      "Wire tools, APIs, and models together so the work runs without you.",
      "Add safety: dry runs, approvals, limits, and an obvious way to stop it.",
      "Check the output of the automation instead of assuming it worked.",
    ],
    tools: ["Python or a scripting language", "HTTP APIs", "one workflow or automation platform", "logs", "spreadsheet or database access"],
    interviewTopics: [
      "Walking through an automation you built and what it does when half of it fails.",
      "Deciding which steps should stay manual, and defending that.",
      "Permissions: what the automation is allowed to touch and how you limit it.",
      "Verifying output at volume rather than on one example.",
    ],
    entryBar: [
      "You have run one automation on real work and can say what it saved.",
      "You built the stop condition before you needed it.",
      "You can show the log of what it changed.",
    ],
    progression:
      "Toward applied AI engineering or integration work, once the systems around the model matter more than the model itself.",
  },
};

export function getRoleProfile(slug: CareerTrackSlug): CareerRoleProfile {
  return CAREER_ROLE_PROFILES[slug];
}

export function getRoleSkills(slug: CareerTrackSlug) {
  return getTrackSkills(slug);
}

export function getRolePortfolioProjectSlugs(slug: CareerTrackSlug) {
  return PROJECT_TEMPLATES.filter((template) =>
    template.trackSlugs.includes(slug),
  ).map((template) => ({ slug: template.slug, title: template.title, level: template.level }));
}

export const CAREER_ROLE_PROFILE_DISCLAIMER =
  "These profiles describe what the work consists of and what you would be asked about. They contain no salary figures, no hiring statistics, and no claims about current openings.";
