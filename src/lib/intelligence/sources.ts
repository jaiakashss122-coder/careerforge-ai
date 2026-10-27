import type { IndustryUpdate } from "@/lib/intelligence/types";

const READ_ON = "2026-10-27";

export const INTELLIGENCE_SNAPSHOT = {
  readOn: READ_ON,
  note: `Every entry below was read from its own source on ${READ_ON}. This is a dated snapshot, not live research: nothing on this page updates by itself, and a change announced after that date will not appear here.`,
};

export const INTELLIGENCE_DISCLAIMER =
  "The what-changed sentence repeats what the linked source states. The why-it-matters sentence is this app's reading of it, written for a learner working toward one of these roles. Check the source before relying on any of it.";

export const INTELLIGENCE_MISSING_DATA = [
  {
    heading: "No salary figures",
    reason:
      "No pay source was read for this snapshot, and an invented range would be worse than none.",
  },
  {
    heading: "No hiring statistics or open roles",
    reason:
      "No job board was queried and no employer survey was opened successfully while building this page, so no count of openings, growth rate, or demand ranking is shown.",
  },
  {
    heading: "No news commentary or opinions",
    reason:
      "Only the source's own statement is repeated. Where a claim could not be confirmed on the page itself, the entry was left out.",
  },
];

export const INDUSTRY_UPDATES: readonly IndustryUpdate[] = [
  {
    id: "openai-decisions-api-ga",
    topic: "llm-applications",
    headline: "OpenAI's Decisions API reached general availability",
    whatChanged:
      "The OpenAI API changelog lists the Decisions API as generally available on 22 October 2026, running with the gpt-6-luna model and supporting up to 400 questions in one request. An earlier entry the same month marks its beta start on 6 October 2026.",
    whyItMatters:
      "Structured choices inside a model response used to mean custom parsing code. When a provider handles that step, part of the glue work in an LLM application disappears and the remaining skill is deciding what should be asked and how the answer is used.",
    sourceName: "OpenAI API changelog",
    sourceKind: "release-notes",
    sourceUrl: "https://developers.openai.com/api/docs/changelog",
    publishedOn: "2026-10-22",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["generative-ai-engineer", "applied-ai-engineer", "ai-automation-engineer"],
    skills: ["llm-applications", "prompt-engineering"],
  },
  {
    id: "openai-response-prompt-caching",
    topic: "llm-applications",
    headline: "Twelve-hour prompt caching added to the Responses API",
    whatChanged:
      "The changelog records a feature entry on 20 October 2026 adding 12-hour prompt caching to v1/responses, described as lowering input pricing.",
    whyItMatters:
      "Long repeated context is what makes an assistant expensive. Caching changes the trade-off between a thorough prompt and its cost, so knowing how caching works is part of keeping a feature affordable.",
    sourceName: "OpenAI API changelog",
    sourceKind: "release-notes",
    sourceUrl: "https://developers.openai.com/api/docs/changelog",
    publishedOn: "2026-10-20",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["generative-ai-engineer", "applied-ai-engineer"],
    skills: ["llm-applications", "prompt-engineering", "retrieval-augmented-generation"],
  },
  {
    id: "openai-agents-sandbox-prewarm",
    topic: "agents",
    headline: "Agent sandboxes can be started ahead of time",
    whatChanged:
      "On 9 October 2026 the changelog added the ability to pre-warm an OpenAI-hosted sandbox before attaching it to an Agents API session, to improve latency, with the same entry stating that only active turns are billed.",
    whyItMatters:
      "Agent work that runs code pays a start-up cost on every turn. Moving that cost before the user asks is a normal systems trick, and an agent that feels slow is often slow here rather than in the model.",
    sourceName: "OpenAI API changelog",
    sourceKind: "release-notes",
    sourceUrl: "https://developers.openai.com/api/docs/changelog",
    publishedOn: "2026-10-09",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["generative-ai-engineer", "ai-automation-engineer", "mlops-engineer"],
    skills: ["ai-agents", "llm-applications"],
  },
  {
    id: "openai-agents-artifact-sdk",
    topic: "agents",
    headline: "A way for sandboxed agents to return files",
    whatChanged:
      "The 16 October 2026 changelog entry for v1/agents adds what OpenAI calls an \"Artifact SDK\" inside sandboxes, plus an Ultrafast mode; a separate entry the same day adds prompt-to-voice and nine new voices to live sessions.",
    whyItMatters:
      "Agents that produce files, reports, or dashboards need a defined way to hand the result back. A first-party path for that output is the difference between a demo and something a colleague can use.",
    sourceName: "OpenAI API changelog",
    sourceKind: "release-notes",
    sourceUrl: "https://developers.openai.com/api/docs/changelog",
    publishedOn: "2026-10-16",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["generative-ai-engineer", "ai-automation-engineer"],
    skills: ["ai-agents", "llm-applications", "http-apis"],
  },
  {
    id: "openai-gpt-6-1-terra",
    topic: "llm-applications",
    headline: "A model aimed at visual reasoning and computer use",
    whatChanged:
      "The changelog's most recent entry, dated 26 October 2026, lists gpt-6.1-terra as a fast model for visual reasoning and computer use.",
    whyItMatters:
      "Reading a screen and acting on it is the capability behind automating a program that has no API. A model added for that job, described by the vendor as fast, makes browser-automation practice projects realistic to attempt rather than only to discuss.",
    sourceName: "OpenAI API changelog",
    sourceKind: "release-notes",
    sourceUrl: "https://developers.openai.com/api/docs/changelog",
    publishedOn: "2026-10-26",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["ai-automation-engineer", "generative-ai-engineer"],
    skills: ["ai-agents", "llm-applications"],
  },
  {
    id: "claude-managed-agents-workflows",
    topic: "agents",
    headline: "Managed agents can use dynamic workflows",
    whatChanged:
      "Claude's platform release notes state on 9 October 2026 that you can now let a Claude Managed Agents agent use dynamic workflows.",
    whyItMatters:
      "A fixed sequence of steps is a script; an agent choosing its next step is harder to test. The industry is moving this decision into hosted services, which shifts the engineer's job toward specifying and checking the work.",
    sourceName: "Claude platform release notes",
    sourceKind: "release-notes",
    sourceUrl: "https://platform.claude.com/docs/en/release-notes/overview",
    publishedOn: "2026-10-09",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["generative-ai-engineer", "applied-ai-engineer", "ai-automation-engineer"],
    skills: ["ai-agents", "ai-evaluation"],
  },
  {
    id: "claude-haiku-5-5",
    topic: "llm-applications",
    headline: "A small model positioned for volume and latency",
    whatChanged:
      "Claude's release notes record the launch of Claude Haiku 5.5 on 7 October 2026, described as their most capable model tuned for high-volume and latency-sensitive work.",
    whyItMatters:
      "Most production traffic does not need the largest model. Choosing between a fast cheap model and a slow capable one is an engineering judgement that interviews probe, and it starts with measuring your own workload.",
    sourceName: "Claude platform release notes",
    sourceKind: "release-notes",
    sourceUrl: "https://platform.claude.com/docs/en/release-notes/overview",
    publishedOn: "2026-10-07",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["applied-ai-engineer", "mlops-engineer"],
    skills: ["llm-applications", "model-evaluation"],
  },
  {
    id: "claude-fast-mode-opus",
    topic: "llm-applications",
    headline: "Fast mode left research preview for a flagship model",
    whatChanged:
      "Claude's release notes state on 15 October 2026 that fast mode is out of research preview for Claude Opus 5.5.",
    whyItMatters:
      "A preview mode becomes a supported option with a contract attached. For anyone pricing a feature, supported latency options are what you can build on rather than hope for.",
    sourceName: "Claude platform release notes",
    sourceKind: "release-notes",
    sourceUrl: "https://platform.claude.com/docs/en/release-notes/overview",
    publishedOn: "2026-10-15",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["applied-ai-engineer", "generative-ai-engineer"],
    skills: ["llm-applications"],
  },
  {
    id: "claude-on-google-cloud",
    topic: "mlops",
    headline: "Claude models offered as an Anthropic-managed service on Google Cloud",
    whatChanged:
      "Claude's release notes record the launch of Claude Models on Google Cloud, listed as Anthropic managed, on 22 October 2026.",
    whyItMatters:
      "Where a model is served decides billing, region, and network path, and therefore what your team can commit to. Model serving is now platform work, which is why MLOps roles list it.",
    sourceName: "Claude platform release notes",
    sourceKind: "release-notes",
    sourceUrl: "https://platform.claude.com/docs/en/release-notes/overview",
    publishedOn: "2026-10-22",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["mlops-engineer", "data-engineer"],
    skills: ["http-apis", "project-structure"],
  },
  {
    id: "claude-api-version-and-sdks",
    topic: "developer-tooling",
    headline: "A new API version with major SDK bumps",
    whatChanged:
      "Claude's release notes announce API version 2026-10-21 on 21 October 2026, along with client SDK and CLI versions that send that API version by default: Python SDK 2.0.0 and TypeScript SDK 1.0.0.",
    whyItMatters:
      "A versioned API plus a major SDK bump means breaking changes somewhere in your code. Reading a provider's version note before upgrading is a small habit that prevents outages.",
    sourceName: "Claude platform release notes",
    sourceKind: "release-notes",
    sourceUrl: "https://platform.claude.com/docs/en/release-notes/overview",
    publishedOn: "2026-10-21",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["applied-ai-engineer", "mlops-engineer", "machine-learning-engineer"],
    skills: ["http-apis", "python-basics", "automated-testing"],
  },
  {
    id: "mlflow-evaluate-lineage",
    topic: "evaluation",
    headline: "Evaluation runs can record what produced them",
    whatChanged:
      "The MLflow release list shows 3.17.2 dated 21 October 2026, recording dataset, scorer, and agent lineage on mlflow.genai.evaluate runs.",
    whyItMatters:
      "A score nobody can trace is a score nobody trusts. Lineage is what lets you answer which data and which judge produced this number, and it is the difference between a notebook result and a reportable result.",
    sourceName: "MLflow releases",
    sourceKind: "project-release",
    sourceUrl: "https://github.com/mlflow/mlflow/releases",
    publishedOn: "2026-10-21",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["machine-learning-engineer", "mlops-engineer", "data-scientist"],
    skills: ["model-evaluation", "ml-fundamentals", "git-github"],
  },
  {
    id: "deepeval-agent-loop-detection",
    topic: "evaluation",
    headline: "Evaluation tools added agent-specific checks",
    whatChanged:
      "DeepEval's 2026 changelog lists deterministic agent loop detection for multi-step traces in July 2026, then voice simulations and component evaluations in August 2026. The changelog labels these entries by month, so the day shown for this entry is the first of the month.",
    whyItMatters:
      "An agent that repeats itself forever is the most common agent failure, and it is testable. Checking one step at a time, rather than only the final answer, is how agent work becomes reviewable.",
    sourceName: "DeepEval changelog",
    sourceKind: "release-notes",
    sourceUrl: "https://deepeval.com/changelog/changelog-2026",
    publishedOn: "2026-07-01",
    datePrecision: "month",
    readOn: READ_ON,
    tracks: ["generative-ai-engineer", "applied-ai-engineer", "machine-learning-engineer"],
    skills: ["ai-evaluation", "ai-agents", "automated-testing"],
  },
  {
    id: "reliabilitybench-paper",
    topic: "evaluation",
    headline: "A paper measuring agent reliability rather than agent capability",
    whatChanged:
      "ReliabilityBench, an arXiv paper submitted 3 January 2026, evaluates agent reliability on three dimensions: consistency under repeated execution, robustness to perturbations, and fault tolerance. Its abstract reports success falling from 96.9% to 88.1% under production-like stress conditions.",
    whyItMatters:
      "An agent that passes once and fails on repeat is not finished. Running the same task several times and reporting the spread, instead of the best run, is a habit that transfers straight into your own project write-ups.",
    sourceName: "arXiv preprint 2601.06112",
    sourceKind: "research-paper",
    sourceUrl: "https://arxiv.org/abs/2601.06112",
    publishedOn: "2026-01-03",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["machine-learning-engineer", "applied-ai-engineer", "data-scientist"],
    skills: ["ai-evaluation", "hypothesis-testing", "model-evaluation"],
  },
  {
    id: "opentelemetry-genai-semconv-move",
    topic: "mlops",
    headline: "Generative AI monitoring conventions moved into the codebase",
    whatChanged:
      "The OpenTelemetry documentation page for generative AI semantic conventions states that these conventions have moved to the OpenTelemetry repository and are no longer maintained on the documentation site. The page shows no publication date, so it is listed here as the current documentation statement rather than as a dated event.",
    whyItMatters:
      "Shared field names are what make traces from different tools comparable. Following the convention instead of inventing your own keeps a monitoring setup explainable to the next engineer.",
    sourceName: "OpenTelemetry documentation",
    sourceKind: "official-documentation",
    sourceUrl: "https://opentelemetry.io/docs/specs/semconv/gen-ai/",
    publishedOn: "",
    datePrecision: "undated",
    readOn: READ_ON,
    tracks: ["mlops-engineer", "machine-learning-engineer", "data-engineer"],
    skills: ["project-structure", "automated-testing", "command-line"],
  },
  {
    id: "mcp-specification",
    topic: "agents",
    headline: "Model Context Protocol as a published specification",
    whatChanged:
      "The Model Context Protocol documentation describes it as an open protocol and lists the specification revision 2025-06-18.",
    whyItMatters:
      "Connecting a model to your tools used to mean a bespoke integration each time. A published protocol is what turns tool access into a skill that transfers between products.",
    sourceName: "Model Context Protocol specification",
    sourceKind: "official-documentation",
    sourceUrl: "https://modelcontextprotocol.io/specification/2025-06-18",
    publishedOn: "2025-06-18",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["ai-automation-engineer", "generative-ai-engineer", "applied-ai-engineer"],
    skills: ["ai-agents", "http-apis", "llm-applications"],
  },
  {
    id: "anthropic-context-engineering",
    topic: "agents",
    headline: "Context engineering written up as its own discipline",
    whatChanged:
      "An Anthropic article published 29 September 2025 argues for curating the smallest high-signal context, and describes compaction, structured notes, and sub-agents as ways to keep long tasks coherent.",
    whyItMatters:
      "Most agent failures are the wrong information in front of the model, not a weak model. This is the clearest published description of a skill that shows up in interviews for applied AI work.",
    sourceName: "Anthropic research article",
    sourceKind: "engineering-blog",
    sourceUrl:
      "https://www.anthropic.com/research/effective-context-engineering-for-ai-agents",
    publishedOn: "2025-09-29",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["generative-ai-engineer", "applied-ai-engineer"],
    skills: ["prompt-engineering", "ai-agents", "retrieval-augmented-generation"],
  },
  {
    id: "iceberg-1-12-0",
    topic: "data-platform",
    headline: "Apache Iceberg 1.12.0 released with a new manifest format",
    whatChanged:
      "The Apache Iceberg release list shows the apache-iceberg-1.12.0 tag dated 30 September 2026. Its headline items are version 4 manifest support, Flink 2.1 additions, and the removal of Spark 3.4 support.",
    whyItMatters:
      "A table format release that drops one engine and adds another is a migration decision someone has to make. Open table formats are the shared layer underneath analytics, ML features, and now AI pipelines.",
    sourceName: "Apache Iceberg releases",
    sourceKind: "project-release",
    sourceUrl: "https://github.com/apache/iceberg/releases",
    publishedOn: "2026-09-30",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["data-engineer", "machine-learning-engineer"],
    skills: ["database-design", "sql-subqueries", "python-basics"],
  },
  {
    id: "duckdb-2-0-lts",
    topic: "data-platform",
    headline: "DuckDB 2.0.0 released as a long-term-support version",
    whatChanged:
      "The DuckDB news list records version 2.0.0 LTS, codenamed Cinnamon Teal, released 21 October 2026, with 1.5.6 released 28 September 2026 as a bug-fix, performance, and security patch release.",
    whyItMatters:
      "A local engine you can point at files turns a question into an answer without a cluster. An LTS release is also the version a team can standardize on, which is what makes it worth learning.",
    sourceName: "DuckDB news",
    sourceKind: "release-notes",
    sourceUrl: "https://duckdb.org/news/",
    publishedOn: "2026-10-21",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["data-analyst", "data-engineer", "data-scientist"],
    skills: ["sql-filtering", "sql-aggregation", "data-cleaning", "exploratory-analysis"],
  },
  {
    id: "ray-2-59-llm-ga",
    topic: "mlops",
    headline: "Ray's LLM data and serving APIs became generally available",
    whatChanged:
      "The Ray release list shows 2.59.0 dated 2 October 2026, marking Ray Data LLM and Ray Serve LLM as generally available, adding external shuffle version 2, and adding token authentication. The prior 2.58.0 release, dated 23 August 2026, added key-value-cache-aware routing and Delta Lake writes.",
    whyItMatters:
      "Batch inference over a large table and serving a model behind a token are two different jobs, and both are now part of one framework. This is the practical core of an MLOps role.",
    sourceName: "Ray releases",
    sourceKind: "project-release",
    sourceUrl: "https://github.com/ray-project/ray/releases",
    publishedOn: "2026-10-02",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["mlops-engineer", "machine-learning-engineer", "data-engineer"],
    skills: ["python-basics", "ml-fundamentals", "http-apis"],
  },
  {
    id: "spark-4-2-0",
    topic: "data-platform",
    headline: "Spark 4.2.0 released, and Scala 2.12 support dropped",
    whatChanged:
      "The Apache Spark downloads page lists Spark 4.2.0 released 14 July 2026, and states that Spark 4 is pre-built with Scala 2.13 with Scala 2.12 support officially dropped.",
    whyItMatters:
      "Dropping a language version forces a dependency audit on every team still on the old build. Reading a project's release page before upgrading is how that audit gets planned instead of discovered.",
    sourceName: "Apache Spark downloads",
    sourceKind: "official-documentation",
    sourceUrl: "https://spark.apache.org/downloads.html",
    publishedOn: "2026-07-14",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["data-engineer", "machine-learning-engineer"],
    skills: ["python-basics", "database-design", "data-cleaning"],
  },
  {
    id: "meta-muse-spark-open",
    topic: "open-models",
    headline: "An open-weights frontier mixture-of-experts model from Meta",
    whatChanged:
      "A Hugging Face blog post published 15 October 2026 announces Meta's Muse Spark Open as an open-weight multimodal mixture-of-experts model. It lists roughly 816 billion total parameters with roughly 42 billion active per token, 256 experts per layer with 8 selected, a context window up to 1 million tokens, text, image, audio and video inputs with text output, and checkpoints in BF16 (about 1.5 TB) and 4-bit NVFP4.",
    whyItMatters:
      "Open weights mean you can run, adapt, and measure a model yourself instead of only calling an API. It also means a real engineering question: what hardware and quantization makes it affordable.",
    sourceName: "Hugging Face blog",
    sourceKind: "engineering-blog",
    sourceUrl: "https://huggingface.co/blog/meta-muse-spark-open",
    publishedOn: "2026-10-15",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["machine-learning-engineer", "mlops-engineer", "data-scientist"],
    skills: ["ml-fundamentals", "model-evaluation", "command-line"],
  },
  {
    id: "copilot-vscode-september-2026",
    topic: "developer-tooling",
    headline: "GitHub Copilot in VS Code moved further into agent work",
    whatChanged:
      "A GitHub changelog post published 1 October 2026 covers VS Code releases v1.136 through v1.140 from September 2026, listing model coordination, scheduled recurring work automations, an agent merge step for pull requests, and starting an agent session from a dev container.",
    whyItMatters:
      "An assistant that takes a scheduled task and opens a merge is a workflow change, not just a shortcut. Reviewing and specifying agent output is quickly becoming part of everyday engineering work.",
    sourceName: "GitHub changelog",
    sourceKind: "release-notes",
    sourceUrl:
      "https://github.blog/changelog/2026-10-01-github-copilot-in-vs-code-september-2026-releases/",
    publishedOn: "2026-10-01",
    datePrecision: "day",
    readOn: READ_ON,
    tracks: ["machine-learning-engineer", "applied-ai-engineer", "data-engineer"],
    skills: ["git-github", "automated-testing", "project-structure"],
  },
];
