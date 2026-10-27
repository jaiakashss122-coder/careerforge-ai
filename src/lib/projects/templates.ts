import type { ProjectTemplate } from "./types";

/**
 * Dataset guidance names public sources by name rather than by URL so the
 * guidance cannot go stale or point somewhere that no longer exists.
 */
export const PROJECT_TEMPLATES: readonly ProjectTemplate[] = [
  {
    slug: "personal-expense-analysis",
    title: "Personal expense analysis",
    level: "foundation",
    summary:
      "Load your own transaction history, clean it, and answer three spending questions with charts.",
    motivation:
      "Your first project should use data you already understand, so you can tell a wrong answer from a right one. Working with your own transactions forces you to handle messy categories, dates, and duplicates without a tutorial holding your hand.",
    problemStatement:
      "Where does my money actually go each month, and which two categories changed the most over the last six months?",
    trackSlugs: ["data-analyst", "business-intelligence-analyst"],
    prerequisiteSkillSlugs: ["python-basics"],
    requiresCompletedProjects: 0,
    skillSlugs: [
      "python-basics",
      "pandas",
      "data-cleaning",
      "data-visualization",
      "descriptive-statistics",
    ],
    estimatedHours: 10,
    datasetGuidance: {
      source:
        "A CSV export of your own bank or card transactions, with names and account numbers removed before the file enters the repository.",
      note: "Never commit real financial data. Keep the raw file out of version control and commit a small synthetic sample instead so the notebook still runs for a reviewer.",
      alternatives: [
        "A synthetic transaction CSV you generate yourself with a seeded random script",
        "A public household spending dataset from the UCI Machine Learning Repository",
      ],
    },
    milestones: [
      {
        key: "scope",
        title: "Write the question and success criteria",
        description:
          "Write down the three questions you will answer and what a usable answer looks like. Commit this before you touch the data.",
        evidenceHint: "Link to the committed README section that states them.",
        estimatedMinutes: 45,
      },
      {
        key: "ingest",
        title: "Load the data and record its shape",
        description:
          "Read the CSV into pandas, log row and column counts, date range, and how many values are missing per column.",
        evidenceHint: "Link to the notebook or script that prints the summary.",
        estimatedMinutes: 90,
      },
      {
        key: "clean",
        title: "Clean and document every decision",
        description:
          "Fix types, parse dates, remove duplicates, and normalise categories. Write one line per decision explaining why.",
        evidenceHint: "Link to the cleaning module and its decision log.",
        estimatedMinutes: 150,
      },
      {
        key: "analyse",
        title: "Answer the three questions",
        description:
          "Produce one figure per question with labelled axes and a one-sentence reading of what it shows.",
        evidenceHint: "Link to the analysis notebook or exported figures.",
        estimatedMinutes: 180,
      },
      {
        key: "tests",
        title: "Add checks for the cleaning step",
        description:
          "Write tests that fail if a date fails to parse, a duplicate survives, or a category is unmapped.",
        evidenceHint: "Link to the test file and its passing output.",
        estimatedMinutes: 90,
      },
      {
        key: "publish",
        title: "Write the README and publish",
        description:
          "Explain the question, the method, the answer, and the limitations. Push to GitHub with a runnable setup section.",
        evidenceHint: "Link to the public repository.",
        estimatedMinutes: 90,
      },
    ],
    folderStructure: [
      "README.md",
      "requirements.txt",
      "data/sample_transactions.csv",
      "data/.gitignore",
      "notebooks/01_exploration.ipynb",
      "src/clean.py",
      "src/analyse.py",
      "tests/test_clean.py",
      "figures/",
    ],
    testingChecklist: [
      "Dates parse for every row, and an unparseable date raises instead of becoming null",
      "Duplicate transactions are removed and the count is asserted",
      "Every raw category maps to a known category, and unknown values fail loudly",
      "Monthly totals in the output match a hand-checked total for one month",
    ],
    metrics: [
      "Rows loaded versus rows kept after cleaning",
      "Percentage of transactions with a resolved category",
      "Month-over-month change for the top spending categories",
    ],
    interviewQuestions: [
      "How did you decide which transactions were duplicates?",
      "Which cleaning decision would most change your conclusion if you got it wrong?",
      "Why did you pick those chart types for these three questions?",
      "What would break if someone ran this on two years of data instead of six months?",
    ],
    portfolioChecklist: [
      "README states the question, the answer, and the limitations in the first screen",
      "Repository runs from a clean clone using the documented steps",
      "No real personal or financial data is committed",
      "Figures are readable without reading the code",
    ],
  },
  {
    slug: "sql-business-insights",
    title: "SQL business insights report",
    level: "foundation",
    summary:
      "Answer five business questions against a relational database using SQL only, then defend each query.",
    motivation:
      "Most analyst work starts in SQL, not in Python. Writing queries that survive joins, nulls, and grouping is the skill interviewers test first, and a report of five defended queries is concrete evidence you can do it.",
    problemStatement:
      "Which customers, products, and months drive revenue, and where is the data quality weak enough to change the answer?",
    trackSlugs: ["data-analyst", "business-intelligence-analyst"],
    prerequisiteSkillSlugs: ["sql-filtering", "sql-aggregation"],
    requiresCompletedProjects: 0,
    skillSlugs: [
      "sql-filtering",
      "sql-aggregation",
      "sql-joins",
      "sql-subqueries",
      "business-insights",
    ],
    estimatedHours: 12,
    datasetGuidance: {
      source:
        "A local PostgreSQL or SQLite database loaded with a public sample schema such as the Chinook or Northwind sample databases.",
      note: "Commit the schema and the load script, not the database file. A reviewer should be able to recreate your database before running your queries.",
      alternatives: [
        "The DVD Rental sample database distributed with PostgreSQL tutorials",
        "A schema you design yourself and populate with a seeded generator script",
      ],
    },
    milestones: [
      {
        key: "schema",
        title: "Map the schema and keys",
        description:
          "Draw the tables, primary keys, and foreign keys. Note which joins can drop or duplicate rows.",
        evidenceHint: "Link to the schema diagram or the notes file.",
        estimatedMinutes: 90,
      },
      {
        key: "questions",
        title: "Write five business questions",
        description:
          "Each question must name the decision it supports. Reject any question you cannot act on.",
        evidenceHint: "Link to the committed question list.",
        estimatedMinutes: 45,
      },
      {
        key: "queries",
        title: "Write and comment each query",
        description:
          "One file per question. Explain the join strategy and how nulls are handled above each query.",
        evidenceHint: "Link to the queries directory.",
        estimatedMinutes: 240,
      },
      {
        key: "verify",
        title: "Verify every result independently",
        description:
          "Recompute at least two answers a second way, such as a subquery instead of a join, and confirm they agree.",
        evidenceHint: "Link to the verification queries and their output.",
        estimatedMinutes: 120,
      },
      {
        key: "quality",
        title: "Document data quality limits",
        description:
          "Find and record the nulls, orphan keys, and duplicates that would change your conclusions.",
        evidenceHint: "Link to the data quality section.",
        estimatedMinutes: 90,
      },
      {
        key: "report",
        title: "Publish the insight report",
        description:
          "Write the findings with the query, the number, and the caveat side by side. Push to GitHub.",
        evidenceHint: "Link to the public repository.",
        estimatedMinutes: 120,
      },
    ],
    folderStructure: [
      "README.md",
      "schema/load.sql",
      "schema/diagram.md",
      "queries/01_revenue_by_month.sql",
      "queries/02_top_customers.sql",
      "queries/03_product_mix.sql",
      "queries/04_repeat_rate.sql",
      "queries/05_data_quality.sql",
      "verification/",
      "report/findings.md",
    ],
    testingChecklist: [
      "Each query runs against a freshly loaded database with no manual edits",
      "Row counts before and after every join are recorded and explained",
      "At least two answers are reproduced by a second, independent query",
      "Null handling is explicit in every aggregation",
    ],
    metrics: [
      "Revenue by month and the percentage change between periods",
      "Share of revenue from the top ten customers",
      "Count of orphan foreign keys and null values in the columns you rely on",
    ],
    interviewQuestions: [
      "When would a left join change this answer, and why did you not use one here?",
      "How do nulls affect your averages, and what did you do about it?",
      "Walk me through how you confirmed this number is correct.",
      "Which of your five findings is least trustworthy, and why?",
    ],
    portfolioChecklist: [
      "A reviewer can load the database and rerun every query from the README",
      "Each finding shows the query next to the number",
      "Data quality limits are stated, not hidden",
      "No query depends on manual spreadsheet steps",
    ],
  },
  {
    slug: "data-cleaning-pipeline",
    title: "Reproducible data cleaning pipeline",
    level: "foundation",
    summary:
      "Turn a deliberately messy public dataset into a validated, documented, reusable clean dataset.",
    motivation:
      "Cleaning is where most real analysis time goes, and it is the part beginners skip. A pipeline that validates its own output is the difference between a notebook that worked once and code a team could run weekly.",
    problemStatement:
      "Can I convert this messy source into a validated dataset that fails loudly when the input changes?",
    trackSlugs: ["data-analyst", "data-engineer", "data-scientist"],
    prerequisiteSkillSlugs: ["python-basics", "pandas"],
    requiresCompletedProjects: 0,
    skillSlugs: [
      "data-cleaning",
      "pandas",
      "automated-testing",
      "project-structure",
      "command-line",
    ],
    estimatedHours: 14,
    datasetGuidance: {
      source:
        "Any open government or city data portal release with known quality problems, such as a municipal inspections or permits extract.",
      note: "Pick a dataset with at least one date column, one free-text column, and visible missing values. Record the download date and file version in the README.",
      alternatives: [
        "A messy survey export from the UCI Machine Learning Repository",
        "A public Kaggle dataset known for missing values, provided you record the version you used",
      ],
    },
    milestones: [
      {
        key: "profile",
        title: "Profile the raw data",
        description:
          "Report types, missing counts, cardinality, and suspicious values for every column.",
        evidenceHint: "Link to the profiling output.",
        estimatedMinutes: 120,
      },
      {
        key: "contract",
        title: "Write the output data contract",
        description:
          "Define the column names, types, allowed ranges, and nullability your clean dataset guarantees.",
        evidenceHint: "Link to the contract file.",
        estimatedMinutes: 90,
      },
      {
        key: "transform",
        title: "Build the transformation steps",
        description:
          "Write small, separately testable functions. No step should do two unrelated things.",
        evidenceHint: "Link to the transformation module.",
        estimatedMinutes: 240,
      },
      {
        key: "validate",
        title: "Enforce the contract at the end",
        description:
          "Add a validation step that raises when the output violates the contract, and prove it by feeding in bad data.",
        evidenceHint: "Link to the validation code and a failing-input example.",
        estimatedMinutes: 120,
      },
      {
        key: "cli",
        title: "Make it runnable from the command line",
        description:
          "One command takes an input path and an output path and reports what it changed.",
        evidenceHint: "Link to the CLI entry point and a sample run log.",
        estimatedMinutes: 120,
      },
      {
        key: "publish",
        title: "Document and publish",
        description:
          "README covers the source, the contract, every decision, and how to run it. Push to GitHub.",
        evidenceHint: "Link to the public repository.",
        estimatedMinutes: 120,
      },
    ],
    folderStructure: [
      "README.md",
      "pyproject.toml",
      "data/raw/.gitignore",
      "data/sample_raw.csv",
      "src/pipeline/profile.py",
      "src/pipeline/transform.py",
      "src/pipeline/validate.py",
      "src/pipeline/cli.py",
      "contracts/clean_schema.md",
      "tests/test_transform.py",
      "tests/test_validate.py",
    ],
    testingChecklist: [
      "Each transformation function has a test with a hand-written input and expected output",
      "Validation raises on a null in a non-nullable column",
      "Validation raises on an out-of-range value",
      "Running the pipeline twice on the same input produces identical output",
    ],
    metrics: [
      "Rows in, rows out, and rows dropped with a reason for each drop",
      "Null percentage per column before and after",
      "Pipeline runtime on the full dataset",
    ],
    interviewQuestions: [
      "Why did you drop those rows instead of imputing them?",
      "How would you know tomorrow if the upstream source changed its format?",
      "Which transformation is most likely to be wrong, and how would you catch it?",
      "What makes this pipeline reproducible rather than just repeatable?",
    ],
    portfolioChecklist: [
      "One documented command runs the whole pipeline",
      "The data contract is written down, not implied",
      "Tests pass from a clean clone",
      "Raw data is excluded from version control",
    ],
  },
  {
    slug: "exploratory-analysis-dashboard",
    title: "Exploratory analysis and dashboard",
    level: "core",
    summary:
      "Run a structured exploration of a public dataset, then publish an interactive dashboard with a written interpretation.",
    motivation:
      "Analysts are hired to find what matters and explain it to people who will not read your code. This project separates exploration from presentation, which is the habit that stops dashboards from becoming decoration.",
    problemStatement:
      "What are the three most decision-relevant patterns in this dataset, and how should a non-technical reader act on them?",
    trackSlugs: ["data-analyst", "business-intelligence-analyst", "data-scientist"],
    prerequisiteSkillSlugs: ["pandas", "data-cleaning", "descriptive-statistics"],
    requiresCompletedProjects: 1,
    skillSlugs: [
      "exploratory-analysis",
      "data-visualization",
      "descriptive-statistics",
      "data-distributions",
      "business-insights",
    ],
    estimatedHours: 18,
    datasetGuidance: {
      source:
        "A public dataset with at least one date column, one categorical column, and one numeric outcome, such as an open transport, energy, or public health release.",
      note: "Choose a domain you can reason about. If you cannot say whether a number looks wrong, you cannot explore the data honestly.",
      alternatives: [
        "A World Bank or national statistics office indicator extract",
        "An open city bike-share or transit ridership release",
      ],
    },
    milestones: [
      {
        key: "questions",
        title: "Write the exploration plan",
        description:
          "List what you expect to find and what would surprise you, before you plot anything.",
        evidenceHint: "Link to the committed plan.",
        estimatedMinutes: 60,
      },
      {
        key: "univariate",
        title: "Examine every variable alone",
        description:
          "Distribution, outliers, and missingness for each column, with a note on what each implies.",
        evidenceHint: "Link to the exploration notebook.",
        estimatedMinutes: 180,
      },
      {
        key: "relationships",
        title: "Examine relationships",
        description:
          "Test the relationships your plan predicted. Record the ones that did not hold.",
        evidenceHint: "Link to the relationship analysis.",
        estimatedMinutes: 180,
      },
      {
        key: "findings",
        title: "Select three decision-relevant findings",
        description:
          "For each, state the pattern, the strength of the evidence, and the action it supports.",
        evidenceHint: "Link to the findings document.",
        estimatedMinutes: 120,
      },
      {
        key: "dashboard",
        title: "Build the dashboard",
        description:
          "One view per finding, with a plain-language title and a caption stating the limitation.",
        evidenceHint: "Link to the dashboard code and a screenshot.",
        estimatedMinutes: 300,
      },
      {
        key: "deploy",
        title: "Deploy and document",
        description:
          "Publish the dashboard, link it from the README, and explain what it does not show.",
        evidenceHint: "Link to the deployed dashboard.",
        estimatedMinutes: 120,
      },
    ],
    folderStructure: [
      "README.md",
      "requirements.txt",
      "data/.gitignore",
      "notebooks/01_univariate.ipynb",
      "notebooks/02_relationships.ipynb",
      "src/load.py",
      "src/figures.py",
      "app/dashboard.py",
      "tests/test_load.py",
      "docs/findings.md",
    ],
    testingChecklist: [
      "Data loading is tested against a small committed fixture",
      "Every aggregation shown in the dashboard is checked against a direct calculation",
      "The dashboard renders with an empty filter selection without crashing",
      "Figures regenerate from a clean clone with one command",
    ],
    metrics: [
      "Share of rows excluded from each view and why",
      "Effect size or percentage difference for each headline finding",
      "Dashboard load time with the full dataset",
    ],
    interviewQuestions: [
      "Which of your expectations was wrong, and what did you do about it?",
      "How do you know this pattern is not an artefact of missing data?",
      "Why is this the right chart for a non-technical reader?",
      "What decision would you refuse to support with this dashboard?",
    ],
    portfolioChecklist: [
      "The dashboard is deployed and the link works",
      "Each view states its limitation in plain language",
      "Exploration notebooks are separate from the presentation layer",
      "README names the dataset version and download date",
    ],
  },
  {
    slug: "churn-prediction",
    title: "Customer churn prediction",
    level: "core",
    summary:
      "Build a churn classifier against a documented baseline, with leakage checks and an honest evaluation.",
    motivation:
      "This is the most common modelling interview topic, and the most common place beginners cheat without meaning to. Beating a stated baseline and proving you have no leakage is what separates a real model from an accidental one.",
    problemStatement:
      "Can I predict which customers will churn next period well enough to beat the baseline, and what does the model cost when it is wrong?",
    trackSlugs: ["data-scientist", "machine-learning-engineer", "data-analyst"],
    prerequisiteSkillSlugs: [
      "pandas",
      "descriptive-statistics",
      "ml-fundamentals",
    ],
    requiresCompletedProjects: 1,
    skillSlugs: [
      "classification",
      "model-evaluation",
      "feature-engineering",
      "scikit-learn",
      "ml-fundamentals",
    ],
    estimatedHours: 22,
    datasetGuidance: {
      source:
        "A public churn dataset with customer attributes and a churn label, such as the widely used telecom customer churn dataset.",
      note: "Record the exact dataset version. Check the column list for anything recorded after the churn decision, because those columns are leakage and must be removed.",
      alternatives: [
        "A bank customer attrition dataset from a public repository",
        "A subscription dataset you construct from your own synthetic generator with a known signal",
      ],
    },
    milestones: [
      {
        key: "framing",
        title: "Frame the problem and the cost",
        description:
          "Define the prediction window, the positive class, and the real cost of a false positive versus a false negative.",
        evidenceHint: "Link to the framing document.",
        estimatedMinutes: 90,
      },
      {
        key: "baseline",
        title: "Build and record a baseline",
        description:
          "Predict the majority class and one simple rule. Record their metrics. Every later model is compared to these.",
        evidenceHint: "Link to the baseline results.",
        estimatedMinutes: 90,
      },
      {
        key: "leakage",
        title: "Audit every feature for leakage",
        description:
          "For each column, state whether it is known before the prediction point. Drop the ones that are not.",
        evidenceHint: "Link to the feature audit table.",
        estimatedMinutes: 150,
      },
      {
        key: "model",
        title: "Train models inside a pipeline",
        description:
          "Put preprocessing and the estimator in one pipeline so the test split never sees training statistics.",
        evidenceHint: "Link to the training code.",
        estimatedMinutes: 240,
      },
      {
        key: "evaluate",
        title: "Evaluate against the cost you defined",
        description:
          "Report precision, recall, and a confusion matrix at a threshold you justify, not the default.",
        evidenceHint: "Link to the evaluation report.",
        estimatedMinutes: 180,
      },
      {
        key: "limits",
        title: "Write the limitations and failure modes",
        description:
          "State which customers the model handles badly and what would make it degrade in production.",
        evidenceHint: "Link to the limitations section.",
        estimatedMinutes: 120,
      },
      {
        key: "publish",
        title: "Publish with reproducible results",
        description:
          "Fix the random seeds, record the environment, and push to GitHub with the metrics in the README.",
        evidenceHint: "Link to the public repository.",
        estimatedMinutes: 120,
      },
    ],
    folderStructure: [
      "README.md",
      "requirements.txt",
      "data/.gitignore",
      "notebooks/01_eda.ipynb",
      "src/features.py",
      "src/train.py",
      "src/evaluate.py",
      "models/.gitignore",
      "reports/baseline.md",
      "reports/evaluation.md",
      "reports/feature_audit.md",
      "tests/test_features.py",
    ],
    testingChecklist: [
      "Train and test splits are disjoint, asserted by a test",
      "Preprocessing is fitted on training data only, asserted by a test",
      "Feature engineering functions have tests with known inputs and outputs",
      "Rerunning training with the same seed reproduces the reported metrics",
    ],
    metrics: [
      "Baseline accuracy, precision, and recall",
      "Model precision and recall at your chosen threshold, with the lift over baseline",
      "Confusion matrix counts translated into the cost you defined",
    ],
    interviewQuestions: [
      "What is your baseline, and by how much do you actually beat it?",
      "Which feature did you suspect of leakage, and how did you decide?",
      "Why did you choose that threshold instead of 0.5?",
      "Which customer segment does your model fail on, and what would you do about it?",
    ],
    portfolioChecklist: [
      "The README shows baseline and model metrics side by side",
      "No accuracy claim appears without the class balance next to it",
      "The feature audit is published, not summarised away",
      "Results reproduce from a clean clone with the documented seed",
    ],
  },
  {
    slug: "regression-forecast-report",
    title: "Regression and forecast report",
    level: "core",
    summary:
      "Predict a numeric outcome, quantify the uncertainty, and explain what the model cannot know.",
    motivation:
      "Numeric predictions get trusted more than they deserve because they arrive without error bars. Learning to publish an interval instead of a point estimate is a professional habit that most self-taught portfolios lack.",
    problemStatement:
      "How accurately can I predict this numeric outcome, and how wrong is my prediction likely to be?",
    trackSlugs: ["data-scientist", "data-analyst", "machine-learning-engineer"],
    prerequisiteSkillSlugs: [
      "descriptive-statistics",
      "pandas",
      "ml-fundamentals",
    ],
    requiresCompletedProjects: 1,
    skillSlugs: [
      "regression",
      "model-evaluation",
      "hypothesis-testing",
      "feature-engineering",
      "scikit-learn",
    ],
    estimatedHours: 20,
    datasetGuidance: {
      source:
        "A public dataset with a continuous target and an honest train and test separation, such as a housing price, energy demand, or bike demand release.",
      note: "If the data has a time order, split by time rather than at random. A random split on time series data silently leaks the future into training.",
      alternatives: [
        "A national energy consumption series from a statistics office",
        "A public retail demand dataset with a date column",
      ],
    },
    milestones: [
      {
        key: "target",
        title: "Define the target and the error that matters",
        description:
          "State the unit, the acceptable error, and why that threshold is useful to a decision maker.",
        evidenceHint: "Link to the target definition.",
        estimatedMinutes: 60,
      },
      {
        key: "split",
        title: "Choose and justify the split strategy",
        description:
          "Decide random or time-based, and explain which assumption each choice makes.",
        evidenceHint: "Link to the splitting code and the justification.",
        estimatedMinutes: 90,
      },
      {
        key: "baseline",
        title: "Record a naive baseline",
        description:
          "Predict the mean, or the previous period for time data, and record the error.",
        evidenceHint: "Link to the baseline results.",
        estimatedMinutes: 60,
      },
      {
        key: "model",
        title: "Fit and compare two models",
        description:
          "One interpretable, one flexible. Compare error, not just fit, on the held-out set.",
        evidenceHint: "Link to the modelling code.",
        estimatedMinutes: 240,
      },
      {
        key: "uncertainty",
        title: "Quantify the uncertainty",
        description:
          "Report an interval or an error distribution, not only a mean error.",
        evidenceHint: "Link to the uncertainty analysis.",
        estimatedMinutes: 150,
      },
      {
        key: "residuals",
        title: "Diagnose the residuals",
        description:
          "Find where the model is systematically wrong and say what that means.",
        evidenceHint: "Link to the residual analysis.",
        estimatedMinutes: 120,
      },
      {
        key: "publish",
        title: "Publish the report",
        description:
          "README states the error, the interval, and the conditions under which the model should not be used.",
        evidenceHint: "Link to the public repository.",
        estimatedMinutes: 120,
      },
    ],
    folderStructure: [
      "README.md",
      "requirements.txt",
      "data/.gitignore",
      "notebooks/01_eda.ipynb",
      "src/split.py",
      "src/models.py",
      "src/evaluate.py",
      "reports/baseline.md",
      "reports/uncertainty.md",
      "reports/residuals.md",
      "tests/test_split.py",
    ],
    testingChecklist: [
      "A test asserts no test-set row appears in training",
      "For time data, a test asserts every training timestamp precedes every test timestamp",
      "Metric functions are tested against hand-computed values",
      "Reported numbers regenerate from one documented command",
    ],
    metrics: [
      "Baseline mean absolute error and the model's improvement over it",
      "Error expressed in the unit a decision maker cares about",
      "Interval width and the share of actual values that fall inside it",
    ],
    interviewQuestions: [
      "Why is that split strategy correct for this data?",
      "What does your error mean in the real unit of the problem?",
      "Where is your model systematically wrong, and why?",
      "When should someone ignore your prediction entirely?",
    ],
    portfolioChecklist: [
      "Every prediction in the README carries an uncertainty estimate",
      "The split justification is written down",
      "Residual diagnostics are published",
      "The README names conditions where the model should not be used",
    ],
  },
  {
    slug: "model-api-service",
    title: "Model serving API",
    level: "applied",
    summary:
      "Wrap a trained model in a tested HTTP API with validation, error handling, and a deployment.",
    motivation:
      "A model in a notebook helps nobody. Serving it behind an API forces you to handle bad input, versioning, and latency, which is exactly the gap between a data portfolio and an engineering portfolio.",
    problemStatement:
      "Can another program send me data and get a trustworthy prediction, with clear errors when the input is wrong?",
    trackSlugs: [
      "machine-learning-engineer",
      "applied-ai-engineer",
      "mlops-engineer",
    ],
    prerequisiteSkillSlugs: [
      "http-apis",
      "automated-testing",
      "project-structure",
      "model-evaluation",
    ],
    requiresCompletedProjects: 2,
    skillSlugs: [
      "http-apis",
      "automated-testing",
      "project-structure",
      "git-github",
      "scikit-learn",
    ],
    estimatedHours: 24,
    datasetGuidance: {
      source:
        "Reuse the model you trained in an earlier project so this work is about the service, not the modelling.",
      note: "Version the serialised model and record which training run produced it. An API serving an unknown model version is not deployable.",
      alternatives: [
        "A small model you train from scratch on a public tabular dataset",
        "A deterministic rules engine, if you want to focus entirely on the service layer",
      ],
    },
    milestones: [
      {
        key: "contract",
        title: "Design the request and response contract",
        description:
          "Define fields, types, ranges, and the error shape before writing a handler.",
        evidenceHint: "Link to the API contract document.",
        estimatedMinutes: 120,
      },
      {
        key: "validation",
        title: "Validate every input at the boundary",
        description:
          "Reject malformed, out-of-range, and missing fields with a specific message and the right status code.",
        evidenceHint: "Link to the validation code and its tests.",
        estimatedMinutes: 180,
      },
      {
        key: "serve",
        title: "Load the model once and serve predictions",
        description:
          "Load at startup, not per request. Return the prediction with the model version.",
        evidenceHint: "Link to the service code.",
        estimatedMinutes: 180,
      },
      {
        key: "errors",
        title: "Handle failures without leaking internals",
        description:
          "Return a safe message to the caller and log the detail server-side. Never return a stack trace.",
        evidenceHint: "Link to the error handling code and a test.",
        estimatedMinutes: 120,
      },
      {
        key: "tests",
        title: "Test the API end to end",
        description:
          "Cover the happy path, every validation failure, and the unavailable-model case.",
        evidenceHint: "Link to the test suite and its passing output.",
        estimatedMinutes: 240,
      },
      {
        key: "deploy",
        title: "Deploy with a health check",
        description:
          "Deploy to a host, expose a health endpoint, and document how to call the service.",
        evidenceHint: "Link to the deployed service and the health endpoint.",
        estimatedMinutes: 240,
      },
    ],
    folderStructure: [
      "README.md",
      "pyproject.toml",
      "Dockerfile",
      "src/api/main.py",
      "src/api/schemas.py",
      "src/api/predict.py",
      "src/api/errors.py",
      "models/model_v1.joblib",
      "models/MODEL_CARD.md",
      "tests/test_validation.py",
      "tests/test_predict.py",
      "tests/test_health.py",
    ],
    testingChecklist: [
      "A valid request returns a prediction and the model version",
      "Each invalid field returns a 4xx with a specific, non-leaking message",
      "A missing model file returns a 5xx and logs the cause",
      "No response body contains a stack trace or a file path",
      "The health endpoint reports model-loaded state",
    ],
    metrics: [
      "Median and 95th percentile response time under a repeatable local load",
      "Validation rejection rate across your test payloads",
      "Container or deployment cold start time",
    ],
    interviewQuestions: [
      "What happens if a caller sends a field you have never seen?",
      "How does a caller know which model version produced their prediction?",
      "Where would this service fall over first under load?",
      "How would you roll back to the previous model?",
    ],
    portfolioChecklist: [
      "The deployed URL and a copy-pasteable example request are in the README",
      "A model card records training data, metrics, and known limits",
      "Secrets come from environment variables, never from committed files",
      "Tests pass in continuous integration",
    ],
  },
  {
    slug: "rag-document-assistant",
    title: "Retrieval-augmented document assistant",
    level: "applied",
    summary:
      "Build a question-answering assistant over your own documents that cites sources and refuses when it cannot find an answer.",
    motivation:
      "Retrieval systems are the most in-demand AI engineering skill and the easiest to fake. Forcing citations and an explicit refusal path is what makes the project honest evidence rather than a demo that bluffs.",
    problemStatement:
      "Can I answer questions about my own document collection with a citation for every claim, and say 'not found' when the answer is not there?",
    trackSlugs: [
      "generative-ai-engineer",
      "applied-ai-engineer",
      "ai-automation-engineer",
    ],
    prerequisiteSkillSlugs: [
      "http-apis",
      "python-basics",
      "llm-applications",
      "automated-testing",
    ],
    requiresCompletedProjects: 2,
    skillSlugs: [
      "retrieval-augmented-generation",
      "llm-applications",
      "prompt-engineering",
      "ai-evaluation",
      "http-apis",
    ],
    estimatedHours: 28,
    datasetGuidance: {
      source:
        "A document set you are allowed to use, such as public technical documentation, your own notes, or open-licensed reports.",
      note: "Never index private or third-party confidential documents. Keep the corpus small enough that you can hand-check twenty answers.",
      alternatives: [
        "Open-licensed government policy documents",
        "The public documentation of a library you already use",
      ],
    },
    milestones: [
      {
        key: "corpus",
        title: "Assemble and document the corpus",
        description:
          "Record the source, licence, and size of every document you index.",
        evidenceHint: "Link to the corpus manifest.",
        estimatedMinutes: 120,
      },
      {
        key: "eval-set",
        title: "Write the evaluation set first",
        description:
          "Twenty questions with known answers, including five whose answers are deliberately absent.",
        evidenceHint: "Link to the evaluation set.",
        estimatedMinutes: 180,
      },
      {
        key: "index",
        title: "Build chunking and retrieval",
        description:
          "Chunk with overlap, embed, and store. Record chunk size and why you chose it.",
        evidenceHint: "Link to the indexing code.",
        estimatedMinutes: 240,
      },
      {
        key: "generate",
        title: "Generate answers with citations",
        description:
          "The prompt must require a citation per claim and a refusal when the context does not contain the answer.",
        evidenceHint: "Link to the prompt and generation code.",
        estimatedMinutes: 240,
      },
      {
        key: "measure",
        title: "Measure retrieval and refusal",
        description:
          "Score retrieval hit rate, citation accuracy, and whether the five unanswerable questions were refused.",
        evidenceHint: "Link to the evaluation results.",
        estimatedMinutes: 240,
      },
      {
        key: "harden",
        title: "Handle injection and failure",
        description:
          "Treat document text as untrusted, bound the context size, and handle provider timeouts and rate limits.",
        evidenceHint: "Link to the hardening code and its tests.",
        estimatedMinutes: 180,
      },
      {
        key: "publish",
        title: "Publish with honest results",
        description:
          "README reports the measured hit rate and refusal rate, including the failures. Push to GitHub.",
        evidenceHint: "Link to the public repository.",
        estimatedMinutes: 120,
      },
    ],
    folderStructure: [
      "README.md",
      "pyproject.toml",
      ".env.example",
      "corpus/MANIFEST.md",
      "src/rag/chunk.py",
      "src/rag/index.py",
      "src/rag/retrieve.py",
      "src/rag/generate.py",
      "src/rag/guardrails.py",
      "eval/questions.jsonl",
      "eval/run_eval.py",
      "reports/evaluation.md",
      "tests/test_chunk.py",
      "tests/test_retrieve.py",
      "tests/test_guardrails.py",
    ],
    testingChecklist: [
      "Chunking is tested for boundary and overlap behaviour",
      "Retrieval returns the known-correct chunk for a fixed query",
      "An unanswerable question produces a refusal, asserted by a test",
      "Retrieved document text cannot change the system instructions",
      "Provider timeouts and rate limits are handled without crashing",
      "API keys are read from the environment and never committed or logged",
    ],
    metrics: [
      "Retrieval hit rate on the evaluation set",
      "Share of answers with a citation that actually supports the claim",
      "Refusal rate on the deliberately unanswerable questions",
      "Median end-to-end answer latency",
    ],
    interviewQuestions: [
      "How do you know your retrieval is finding the right chunk?",
      "What does your system do when the answer is not in the corpus?",
      "How did you choose your chunk size, and what did you compare it against?",
      "How would a malicious sentence inside a document affect your system?",
    ],
    portfolioChecklist: [
      "Measured retrieval and refusal numbers appear in the README, including the bad ones",
      "The evaluation set is committed so a reviewer can rerun it",
      "No API key or private document is in the repository",
      "The README states clearly that answers are generated and must be verified",
    ],
  },
  {
    slug: "batch-data-pipeline",
    title: "Scheduled batch data pipeline",
    level: "advanced",
    summary:
      "Build an orchestrated ingest, transform, and load pipeline with idempotency, retries, and data quality gates.",
    motivation:
      "Pipelines fail at three in the morning, not in a notebook. Designing for reruns, partial failures, and quality gates is the core of data engineering work and cannot be learned from tutorials that always succeed.",
    problemStatement:
      "Can my pipeline run unattended on a schedule, survive a mid-run failure, and refuse to publish bad data?",
    trackSlugs: ["data-engineer", "mlops-engineer", "business-intelligence-analyst"],
    prerequisiteSkillSlugs: [
      "database-design",
      "sql-joins",
      "command-line",
      "automated-testing",
      "project-structure",
    ],
    requiresCompletedProjects: 3,
    skillSlugs: [
      "database-design",
      "sql-joins",
      "data-cleaning",
      "automated-testing",
      "command-line",
      "project-structure",
    ],
    estimatedHours: 32,
    datasetGuidance: {
      source:
        "A public API or regularly updated open data release you can poll, so the pipeline has a genuine incremental load to handle.",
      note: "Pick a source with a usable timestamp or cursor. Without one you cannot build or demonstrate incremental loading.",
      alternatives: [
        "A public transport or weather API with an update cadence",
        "A dated file drop you simulate locally with a generator script",
      ],
    },
    milestones: [
      {
        key: "design",
        title: "Design the target schema and load strategy",
        description:
          "Decide full versus incremental load, define keys, and write down the idempotency rule.",
        evidenceHint: "Link to the design document.",
        estimatedMinutes: 180,
      },
      {
        key: "ingest",
        title: "Build idempotent ingestion",
        description:
          "Rerunning the same window must not duplicate rows. Prove it by running twice.",
        evidenceHint: "Link to the ingestion code and the double-run log.",
        estimatedMinutes: 300,
      },
      {
        key: "transform",
        title: "Build the transformation layer",
        description:
          "Separate raw, staged, and serving tables. Each layer has its own contract.",
        evidenceHint: "Link to the transformation code.",
        estimatedMinutes: 300,
      },
      {
        key: "quality",
        title: "Add quality gates that block publication",
        description:
          "Row count, freshness, and uniqueness checks must stop the load rather than warn.",
        evidenceHint: "Link to the quality checks and a blocked-run example.",
        estimatedMinutes: 240,
      },
      {
        key: "orchestrate",
        title: "Schedule with retries and alerting",
        description:
          "Add a schedule, bounded retries with backoff, and a notification on failure.",
        evidenceHint: "Link to the orchestration config and a run history.",
        estimatedMinutes: 300,
      },
      {
        key: "observe",
        title: "Record run metadata",
        description:
          "Log start, end, rows processed, and outcome for every run so you can audit history.",
        evidenceHint: "Link to the run log table or output.",
        estimatedMinutes: 180,
      },
      {
        key: "publish",
        title: "Document and publish",
        description:
          "README covers the architecture, the idempotency rule, the quality gates, and the failure runbook.",
        evidenceHint: "Link to the public repository.",
        estimatedMinutes: 180,
      },
    ],
    folderStructure: [
      "README.md",
      "docs/architecture.md",
      "docs/runbook.md",
      "pyproject.toml",
      "sql/01_raw.sql",
      "sql/02_staging.sql",
      "sql/03_serving.sql",
      "src/pipeline/ingest.py",
      "src/pipeline/transform.py",
      "src/pipeline/quality.py",
      "src/pipeline/run.py",
      "orchestration/schedule.yml",
      "tests/test_idempotency.py",
      "tests/test_quality.py",
    ],
    testingChecklist: [
      "Running the same window twice produces identical row counts, asserted by a test",
      "A failed quality gate prevents the serving tables from updating",
      "A mid-run failure leaves the serving layer in its previous valid state",
      "Retries are bounded and a permanent failure is reported, not swallowed",
      "Credentials come from environment variables and never appear in logs",
    ],
    metrics: [
      "Rows ingested per run and rejected rows with reasons",
      "End-to-end run duration and its trend across runs",
      "Data freshness lag between source update and serving availability",
      "Failed-run count and mean time to recovery",
    ],
    interviewQuestions: [
      "What exactly makes your ingestion idempotent?",
      "What happens if the pipeline dies halfway through the transform?",
      "Which quality gate would you add first if you had one more day?",
      "How would you backfill six months without breaking the daily schedule?",
    ],
    portfolioChecklist: [
      "The architecture diagram and the runbook are both committed",
      "Run history or logs are shown, including a failed run",
      "Quality gates are demonstrated blocking a bad load",
      "No credential appears anywhere in the repository",
    ],
  },
  {
    slug: "llm-evaluation-harness",
    title: "LLM evaluation and monitoring harness",
    level: "advanced",
    summary:
      "Build a reusable harness that scores a model-powered feature against a fixed test set and tracks regressions over time.",
    motivation:
      "Anyone can get one good answer from a model. Proving a feature still works after a prompt or model change requires an evaluation harness, and almost no self-taught portfolio has one. This is the highest-signal AI engineering project you can show.",
    problemStatement:
      "How do I know whether changing my prompt or my model made my feature better or worse?",
    trackSlugs: [
      "applied-ai-engineer",
      "generative-ai-engineer",
      "mlops-engineer",
    ],
    prerequisiteSkillSlugs: [
      "llm-applications",
      "prompt-engineering",
      "automated-testing",
      "http-apis",
      "model-evaluation",
    ],
    requiresCompletedProjects: 3,
    skillSlugs: [
      "ai-evaluation",
      "llm-applications",
      "prompt-engineering",
      "automated-testing",
      "ai-agents",
    ],
    estimatedHours: 30,
    datasetGuidance: {
      source:
        "Your own labelled evaluation set for one specific task, such as classification, extraction, or summarisation, built by hand.",
      note: "Hand-label at least fifty cases, including the edge cases that currently fail. A harness built on a set you did not label yourself proves nothing about your judgement.",
      alternatives: [
        "An open benchmark subset, provided you document which split you used",
        "Cases captured from your own earlier project, labelled by you",
      ],
    },
    milestones: [
      {
        key: "task",
        title: "Pick one narrow task and define correctness",
        description:
          "Write the rule that decides whether an output is correct. If you cannot write it, narrow the task.",
        evidenceHint: "Link to the task and correctness definition.",
        estimatedMinutes: 120,
      },
      {
        key: "dataset",
        title: "Build the labelled evaluation set",
        description:
          "At least fifty cases with labels, covering typical, ambiguous, and adversarial inputs.",
        evidenceHint: "Link to the committed evaluation set.",
        estimatedMinutes: 360,
      },
      {
        key: "scorers",
        title: "Implement deterministic scorers first",
        description:
          "Exact match, schema validity, and rule checks before any model-graded scoring.",
        evidenceHint: "Link to the scorer code and its tests.",
        estimatedMinutes: 240,
      },
      {
        key: "runner",
        title: "Build the run harness",
        description:
          "One command runs every case, stores results with the prompt and model version, and handles failures per case.",
        evidenceHint: "Link to the runner and a stored result file.",
        estimatedMinutes: 300,
      },
      {
        key: "compare",
        title: "Compare two configurations",
        description:
          "Run two prompts or two models and report per-case wins, losses, and the overall difference.",
        evidenceHint: "Link to the comparison report.",
        estimatedMinutes: 240,
      },
      {
        key: "regression",
        title: "Add a regression gate",
        description:
          "Fail the run when the score drops below a recorded threshold, so a change cannot silently break the feature.",
        evidenceHint: "Link to the gate and a failing-run example.",
        estimatedMinutes: 180,
      },
      {
        key: "publish",
        title: "Publish the harness and the findings",
        description:
          "README explains the task, the scorers, the measured scores, and what the harness cannot measure.",
        evidenceHint: "Link to the public repository.",
        estimatedMinutes: 180,
      },
    ],
    folderStructure: [
      "README.md",
      "pyproject.toml",
      ".env.example",
      "eval/cases.jsonl",
      "eval/LABELLING_GUIDE.md",
      "src/harness/run.py",
      "src/harness/scorers.py",
      "src/harness/providers.py",
      "src/harness/gate.py",
      "results/",
      "reports/comparison.md",
      "tests/test_scorers.py",
      "tests/test_gate.py",
    ],
    testingChecklist: [
      "Each scorer has tests with known correct and incorrect outputs",
      "A provider failure on one case does not abort the whole run",
      "Results record the prompt version, model, and timestamp for every run",
      "The regression gate fails the run when the score drops below the threshold",
      "API keys are read from the environment and never written to results files",
      "Model outputs are treated as data and never executed",
    ],
    metrics: [
      "Score per scorer on the full evaluation set",
      "Per-case win and loss counts between two configurations",
      "Cost and median latency per run",
      "Count of cases that fail for provider reasons rather than quality reasons",
    ],
    interviewQuestions: [
      "How did you decide what counts as a correct answer?",
      "Why did you start with deterministic scorers instead of model grading?",
      "What can your harness not measure, and why does that matter?",
      "How would you use this harness in continuous integration?",
    ],
    portfolioChecklist: [
      "The evaluation set and the labelling guide are both committed",
      "Measured comparison results are published, including regressions",
      "The README states the limits of the scoring approach",
      "No credential or private input appears in committed results",
    ],
  },
] as const;

export function getProjectTemplate(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return PROJECT_TEMPLATES.find((template) => template.slug === slug) ?? null;
}

export function getProjectTemplateMilestone(
  templateSlug: string,
  milestoneKey: string,
) {
  return (
    getProjectTemplate(templateSlug)?.milestones.find(
      (milestone) => milestone.key === milestoneKey,
    ) ?? null
  );
}

export function getTemplateEstimatedMinutes(template: ProjectTemplate) {
  return template.milestones.reduce(
    (total, milestone) => total + milestone.estimatedMinutes,
    0,
  );
}
