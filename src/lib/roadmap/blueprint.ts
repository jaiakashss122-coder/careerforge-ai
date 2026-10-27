export type BlueprintPhase = {
  weeks: string;
  title: string;
  summary: string;
  topics: string[];
  deliverable: string;
};

/**
 * Reference curriculum from the project brief. This is not a personalized
 * roadmap; personalization starts after the Phase 2 assessment.
 */
export const NINETY_DAY_BLUEPRINT: readonly BlueprintPhase[] = [
  {
    weeks: "Weeks 1–2",
    title: "Python foundations",
    summary: "Build the core language habits you will use in every track.",
    topics: [
      "Variables, data types, and operators",
      "Conditions and loops",
      "Functions",
      "Lists, dictionaries, sets, and tuples",
      "Reading errors and debugging",
      "Git and GitHub basics",
    ],
    deliverable:
      "A collection of small Python programs published in a GitHub repository.",
  },
  {
    weeks: "Weeks 3–4",
    title: "Python and data handling",
    summary: "Move from scripts to structured, reusable data work.",
    topics: [
      "Functions and modular code",
      "Files, exceptions, and basic object-oriented design",
      "NumPy arrays and vectorized operations",
      "pandas DataFrames",
      "CSV and JSON processing",
      "Data cleaning and missing values",
    ],
    deliverable:
      "A cleaned dataset with a documented analysis of the decisions you made.",
  },
  {
    weeks: "Weeks 5–6",
    title: "SQL and databases",
    summary: "Learn to answer business questions directly from relational data.",
    topics: [
      "SELECT, WHERE, ORDER BY",
      "Aggregations, GROUP BY, and HAVING",
      "INNER and LEFT JOINs",
      "Subqueries and NULL handling",
      "Relational database fundamentals",
    ],
    deliverable:
      "A SQL analytics project with business questions and query results.",
  },
  {
    weeks: "Weeks 7–8",
    title: "Statistics and exploratory analysis",
    summary: "Separate signal from noise before reaching for machine learning.",
    topics: [
      "Mean, median, variance, and standard deviation",
      "Probability and distributions",
      "Sampling and correlation versus causation",
      "Basic hypothesis testing",
      "Visualization and exploratory data analysis",
    ],
    deliverable:
      "An exploratory data analysis report with visualizations and conclusions.",
  },
  {
    weeks: "Weeks 9–10",
    title: "Introductory machine learning",
    summary: "Train and evaluate a model with an honest validation strategy.",
    topics: [
      "Supervised versus unsupervised learning",
      "Regression and classification",
      "Train, validation, and test splits",
      "Data leakage and overfitting",
      "Baselines, metrics, and cross-validation",
      "scikit-learn workflows",
    ],
    deliverable:
      "A small machine learning project with a justified evaluation strategy.",
  },
  {
    weeks: "Weeks 11–12",
    title: "Career exploration",
    summary:
      "Test two tracks chosen from your interests and assessment evidence.",
    topics: [
      "Analytics and BI experiment",
      "Data science and ML experiment",
      "Applied AI / LLM experiment",
      "Data engineering experiment",
    ],
    deliverable:
      "Small projects from two selected tracks, plus reflection on interest, difficulty, enjoyment, and willingness to improve.",
  },
  {
    weeks: "Week 13",
    title: "Career checkpoint",
    summary: "Review evidence and choose a primary direction with an alternative.",
    topics: [
      "Retest important foundations",
      "Review learning and project evidence",
      "Compare career experiments",
      "Identify skill gaps",
      "Recommend a primary specialization and alternative",
      "Create the next 90-day roadmap",
    ],
    deliverable:
      "A written checkpoint with a recommended specialization, supporting evidence, and the next 90-day plan.",
  },
] as const;

export const BLUEPRINT_TOTAL_HOURS = 130;
export const BLUEPRINT_TOTAL_WEEKS = 13;
