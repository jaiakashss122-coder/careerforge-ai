import type {
  RoadmapLink,
  RoadmapSessionPlan,
  RoadmapTaskCategory,
} from "@/lib/roadmap/types";

export type TaskSeed = {
  key: string;
  title: string;
  description: string;
  category: RoadmapTaskCategory;
  baseMinutes: number;
  skillSlugs: readonly string[];
  sessionPlan: RoadmapSessionPlan;
  links: readonly RoadmapLink[];
};

export type WeekSeed = {
  week: number;
  title: string;
  summary: string;
  tasks: readonly TaskSeed[];
};

const pythonTutorial: RoadmapLink = {
  label: "Official Python tutorial",
  href: "https://docs.python.org/3/tutorial/",
  kind: "docs",
};
const pythonErrors: RoadmapLink = {
  label: "Python errors and exceptions",
  href: "https://docs.python.org/3/tutorial/errors.html",
  kind: "docs",
};
const gitBook: RoadmapLink = {
  label: "Pro Git book",
  href: "https://git-scm.com/book/en/v2",
  kind: "reference",
};
const pandasTenMinutes: RoadmapLink = {
  label: "pandas 10-minute introduction",
  href: "https://pandas.pydata.org/docs/user_guide/10min.html",
  kind: "docs",
};
const pandasMissing: RoadmapLink = {
  label: "pandas missing-data guide",
  href: "https://pandas.pydata.org/docs/user_guide/missing_data.html",
  kind: "docs",
};
const numpyBasics: RoadmapLink = {
  label: "NumPy absolute basics",
  href: "https://numpy.org/doc/stable/user/absolute_beginners.html",
  kind: "docs",
};
const sqlBolt: RoadmapLink = {
  label: "SQLBolt interactive lessons",
  href: "https://sqlbolt.com/",
  kind: "practice",
};
const postgresTutorial: RoadmapLink = {
  label: "PostgreSQL tutorial",
  href: "https://www.postgresql.org/docs/current/tutorial.html",
  kind: "docs",
};
const khanStatistics: RoadmapLink = {
  label: "Khan Academy statistics and probability",
  href: "https://www.khanacademy.org/math/statistics-probability",
  kind: "practice",
};
const pandasPlotting: RoadmapLink = {
  label: "pandas visualization guide",
  href: "https://pandas.pydata.org/docs/user_guide/visualization.html",
  kind: "docs",
};
const matplotlibTutorials: RoadmapLink = {
  label: "Matplotlib tutorials",
  href: "https://matplotlib.org/stable/tutorials/index.html",
  kind: "docs",
};
const sklearnGettingStarted: RoadmapLink = {
  label: "scikit-learn getting started",
  href: "https://scikit-learn.org/stable/getting_started.html",
  kind: "docs",
};
const sklearnCrossValidation: RoadmapLink = {
  label: "scikit-learn cross-validation guide",
  href: "https://scikit-learn.org/stable/modules/cross_validation.html",
  kind: "docs",
};
const missingSemester: RoadmapLink = {
  label: "MIT Missing Semester: shell tools",
  href: "https://missing.csail.mit.edu/",
  kind: "practice",
};
const mdnHttp: RoadmapLink = {
  label: "MDN HTTP overview",
  href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
  kind: "docs",
};
const pytestDocs: RoadmapLink = {
  label: "pytest documentation",
  href: "https://docs.pytest.org/",
  kind: "docs",
};
const githubReadme: RoadmapLink = {
  label: "GitHub README guidance",
  href: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes",
  kind: "reference",
};

export const WEEK_SEEDS: readonly WeekSeed[] = [
  {
    week: 1,
    title: "Python foundations and a working setup",
    summary:
      "Get a repeatable environment, trace simple programs, and learn to read errors instead of avoiding them.",
    tasks: [
      {
        key: "t1",
        title: "Set up a repeatable Python workspace",
        description:
          "Install Python, open a project in VS Code, run a script from the terminal, and make your first Git commit.",
        category: "practice",
        baseMinutes: 90,
        skillSlugs: ["python-basics", "git-github"],
        sessionPlan: {
          learn: [
            "A script is a text file executed by the Python interpreter.",
            "A commit records a snapshot you can return to if an experiment fails.",
          ],
          exercise:
            "Create a careerforge-python folder, add hello.py that prints your name, run it with `python hello.py`, then initialise a Git repository and commit the file.",
          check: [
            {
              question: "Which command runs a script called hello.py?",
              answer: "`python hello.py` (or `python3 hello.py`).",
            },
          ],
          revision:
            "Reopen the folder tomorrow and run the script again without looking at the setup steps.",
        },
        links: [pythonTutorial, gitBook],
      },
      {
        key: "t2",
        title: "Practice variables, conditions, and loops",
        description:
          "Trace and write small programs so the mechanics become automatic before adding data libraries.",
        category: "learning",
        baseMinutes: 180,
        skillSlugs: ["python-basics"],
        sessionPlan: {
          learn: [
            "Names bind values; `if` branches on truth; `for` and `while` repeat work.",
            "A trace table (one row per iteration) is often faster than guessing.",
          ],
          exercise:
            "Write five small programs: sum the even numbers in a list, print the longest word, count vowels, print a simple number pattern, and classify a score with if/elif/else.",
          check: [
            {
              question: "What does `range(3)` produce in a for loop?",
              answer: "0, 1, 2 — the stop value is excluded.",
            },
            {
              question: "When does a while loop stop?",
              answer: "When its condition becomes false, or when the loop is exited explicitly.",
            },
          ],
          revision:
            "Pick one exercise and rewrite it from an empty file without notes.",
        },
        links: [pythonTutorial],
      },
      {
        key: "t3",
        title: "Debug and explain a broken script",
        description:
          "Use tracebacks and small experiments to locate three faults, then explain each fix in plain language.",
        category: "practice",
        baseMinutes: 180,
        skillSlugs: ["python-debugging", "problem-solving"],
        sessionPlan: {
          learn: [
            "Read the traceback from the bottom up: exception first, then the failing line.",
            "Reproduce the fault with the smallest possible input before changing code.",
          ],
          exercise:
            "Create a script with three deliberate bugs (an off-by-one index, a misspelled variable, and a missing empty-list guard). Fix each one and write a two-sentence explanation of the cause.",
          check: [
            {
              question: "What should you do first when you see a traceback?",
              answer: "Identify the exception type and the last line in the call path.",
            },
          ],
          revision:
            "Re-read your explanations and remove any fix that you cannot justify.",
        },
        links: [pythonErrors],
      },
    ],
  },
  {
    week: 2,
    title: "Functions, collections, and a small program",
    summary:
      "Move from one-off statements to reusable functions and a program you can run from the command line.",
    tasks: [
      {
        key: "t1",
        title: "Write functions with clear inputs and outputs",
        description:
          "Practise parameters, return values, scope, and edge cases.",
        category: "learning",
        baseMinutes: 150,
        skillSlugs: ["python-basics"],
        sessionPlan: {
          learn: [
            "Return a value instead of printing when another function needs the result.",
            "Test normal, empty, and invalid inputs before calling a function finished.",
          ],
          exercise:
            "Write functions for the area of a rectangle, the average of a list, the longest word in a sentence, and a password-length check. Add docstrings and one edge case each.",
          check: [
            {
              question: "What is the difference between print and return?",
              answer:
                "print writes text to the console; return sends a value back to the caller so it can be reused.",
            },
          ],
          revision:
            "Call each function from a separate block and verify the edge cases.",
        },
        links: [pythonTutorial],
      },
      {
        key: "t2",
        title: "Use lists, dictionaries, and sets deliberately",
        description:
          "Choose a collection based on the question: order, lookup, uniqueness, or counting.",
        category: "practice",
        baseMinutes: 180,
        skillSlugs: ["python-basics", "problem-solving"],
        sessionPlan: {
          learn: [
            "Lists preserve order, dictionaries map keys to values, and sets answer membership and uniqueness questions.",
            "A frequency dictionary is a direct model of a counting problem.",
          ],
          exercise:
            "Build a word-frequency dictionary from a paragraph, remove duplicates with a set, and summarise nested student records stored in a list of dictionaries.",
          check: [
            {
              question: "When is a set the better choice than a list?",
              answer:
                "When you mainly need fast membership checks or unique values and do not need order.",
            },
            {
              question: "Why use a dictionary for word counts?",
              answer:
                "It maps each word directly to its count, so each update is a simple lookup.",
            },
          ],
          revision:
            "Explain your collection choice for each exercise out loud in one sentence.",
        },
        links: [pythonTutorial],
      },
      {
        key: "t3",
        title: "Build a tested command-line data script",
        description:
          "Deliver a small program that reads a file, computes a summary, handles errors, has two tests, and is committed to Git with a README.",
        category: "project",
        baseMinutes: 240,
        skillSlugs: [
          "problem-solving",
          "python-debugging",
          "git-github",
          "automated-testing",
          "project-structure",
        ],
        sessionPlan: {
          learn: [
            "Command-line programs need a clear input contract and a readable failure message.",
            "A test fixes an expected behaviour so a later change can be checked instead of guessed.",
            "A README makes the project runnable by someone else, including future you.",
          ],
          exercise:
            "Write a script that accepts a CSV path, counts rows, reports numeric column summaries, and exits with a clear message when the file is missing or malformed. Add two pytest tests (a good file and a missing file), a README with run instructions, and commit the working version.",
          check: [
            {
              question: "Why validate the file path before doing analysis work?",
              answer:
                "It turns a common failure into a clear, early message instead of a confusing traceback deep inside the program.",
            },
            {
              question: "What makes a test useful?",
              answer:
                "It states a specific expected behaviour and fails when that behaviour breaks, without depending on manual inspection.",
            },
          ],
          revision:
            "Run the script and the tests on a good file and a deliberately broken file. Record both behaviours.",
        },
        links: [pythonTutorial, pytestDocs, missingSemester],
      },
    ],
  },
  {
    week: 3,
    title: "NumPy and pandas for real data",
    summary:
      "Load, inspect, select, and clean tabular data with a documented record of every decision.",
    tasks: [
      {
        key: "t1",
        title: "Work with NumPy arrays and vectorized operations",
        description:
          "Learn shapes, indexing, and why vectorized operations are the default.",
        category: "learning",
        baseMinutes: 150,
        skillSlugs: ["numpy", "python-basics"],
        sessionPlan: {
          learn: [
            "An array has a shape and a dtype; most bugs start when one of them is not what you assumed.",
            "Vectorized expressions apply an operation to every element without an explicit Python loop.",
          ],
          exercise:
            "Create 1D and 2D arrays, compute row means, filter values above a threshold, and compare a vectorized calculation with a Python loop.",
          check: [
            {
              question: "What is the shape of a 3-by-4 matrix in NumPy?",
              answer: "(3, 4) — three rows and four columns.",
            },
          ],
          revision:
            "Print shape and dtype before every calculation in a fresh notebook.",
        },
        links: [numpyBasics],
      },
      {
        key: "t2",
        title: "Load and inspect a DataFrame",
        description:
          "Read a CSV, check types, select columns and rows, and use boolean masks.",
        category: "practice",
        baseMinutes: 180,
        skillSlugs: ["pandas", "data-cleaning"],
        sessionPlan: {
          learn: [
            "`head`, `info`, and `describe` answer different questions: values, schema, and distribution.",
            "Boolean masks keep the rows where a condition is true.",
          ],
          exercise:
            "Load a CSV, inspect its schema, select three columns, filter rows with a mask, and write down two data-quality concerns.",
          check: [
            {
              question: "What does `df[df['score'] > 80]` return?",
              answer: "The rows where score is greater than 80.",
            },
          ],
          revision:
            "Repeat the inspection on a different file and compare the schemas.",
        },
        links: [pandasTenMinutes],
      },
      {
        key: "t3",
        title: "Clean a messy dataset with a decision log",
        description:
          "Handle missing values, types, duplicates, and invalid entries without hiding the decisions.",
        category: "project",
        baseMinutes: 240,
        skillSlugs: ["data-cleaning", "pandas", "numpy"],
        sessionPlan: {
          learn: [
            "Cleaning is a set of explicit decisions, not a single dropna() call.",
            "Missingness can carry information; investigate it before imputing.",
          ],
          exercise:
            "Take a dataset with missing values, duplicates, and mixed types. Produce a cleaned copy and a short log: what you changed, why, how many rows were affected, and what remains uncertain.",
          check: [
            {
              question: "Which pandas expression counts missing values per column?",
              answer: "`df.isna().sum()`",
            },
          ],
          revision:
            "Re-read the decision log. Remove any transformation you cannot justify.",
        },
        links: [pandasMissing, pandasTenMinutes],
      },
    ],
  },
  {
    week: 4,
    title: "Data sources, analysis, and communication",
    summary:
      "Fetch data responsibly, turn it into answers, and communicate what the evidence does and does not support.",
    tasks: [
      {
        key: "t1",
        title: "Handle missing values, types, and duplicates",
        description:
          "Compare drop, flag, and imputation strategies and choose one deliberately.",
        category: "practice",
        baseMinutes: 150,
        skillSlugs: ["data-cleaning", "pandas"],
        sessionPlan: {
          learn: [
            "Imputation can erase a meaningful signal if missingness is concentrated in one group.",
            "Duplicates are not always identical rows; define the key that should be unique.",
          ],
          exercise:
            "Compare two cleaning strategies on the same dataset. For each, report row counts, summary statistics, and one risk of the choice.",
          check: [
            {
              question: "When should you avoid mean imputation?",
              answer:
                "When missingness is concentrated in a segment or when the value is not missing at random.",
            },
          ],
          revision:
            "Write one sentence explaining why your chosen strategy is defensible.",
        },
        links: [pandasMissing],
      },
      {
        key: "t2",
        title: "Answer questions with groupby and merges",
        description:
          "Use grouping and joins to answer concrete questions rather than displaying every row.",
        category: "practice",
        baseMinutes: 180,
        skillSlugs: ["pandas", "problem-solving"],
        sessionPlan: {
          learn: [
            "Start from the question, then choose the columns and aggregation it requires.",
            "A merge can change row counts; verify cardinality before trusting the result.",
          ],
          exercise:
            "Answer three questions such as: Which segment has the highest average score? How many records are missing per category? Did the merge duplicate any rows?",
          check: [
            {
              question: "What does `df.groupby('team')['score'].mean()` return?",
              answer: "One mean score per team.",
            },
          ],
          revision:
            "For each answer, state the exact question, calculation, and one limitation.",
        },
        links: [pandasTenMinutes],
      },
      {
        key: "t3",
        title: "Write an evidence-based analysis note",
        description:
          "Produce a one-page memo with questions, method, findings, limitations, and next steps.",
        category: "project",
        baseMinutes: 210,
        skillSlugs: [
          "exploratory-analysis",
          "business-insights",
          "technical-communication",
        ],
        sessionPlan: {
          learn: [
            "A useful finding is specific, quantified, and bounded by its data.",
            "Limitations are part of the evidence, not an admission of failure.",
          ],
          exercise:
            "Write a one-page note with one question, one method, two findings, one chart, one limitation, and one recommended next action. Avoid unsupported claims.",
          check: [
            {
              question: "What makes a finding trustworthy enough to act on?",
              answer:
                "A clear question, a reproducible method, appropriate evidence, and stated limitations.",
            },
          ],
          revision:
            "Ask a friend to read only the note and restate your main finding.",
        },
        links: [pandasPlotting],
      },
      {
        key: "t4",
        title: "Fetch and inspect an HTTP API response",
        description:
          "Make one read-only request, inspect its status and schema, and record the data's limits. Use a saved sample response if you are offline.",
        category: "practice",
        baseMinutes: 150,
        skillSlugs: ["http-apis", "problem-solving", "python-debugging"],
        sessionPlan: {
          learn: [
            "HTTP status codes summarise the result: 200 is success, 4xx is usually a request problem, and 5xx is a server problem.",
            "A response is evidence only after you inspect its schema and note when it was fetched.",
            "Never put an API key in client code or commit it to Git.",
          ],
          exercise:
            "Use a public read-only JSON API if you have connectivity, or a saved sample response. Inspect the status code, content type, and JSON structure. Extract three fields into a small table and note two limitations, such as changing data or rate limits.",
          check: [
            {
              question: "What does an HTTP 200 response tell you?",
              answer:
                "The request succeeded. It does not by itself prove the data is correct, complete, or current.",
            },
          ],
          revision:
            "Re-run the request or reload the saved response later and note what changed.",
        },
        links: [mdnHttp],
      },
    ],
  },
  {
    week: 5,
    title: "SQL foundations",
    summary:
      "Query relational data directly, filter before aggregating, and state the business question behind each query.",
    tasks: [
      {
        key: "t1",
        title: "Filter, sort, and handle NULLs",
        description:
          "Use SELECT, WHERE, ORDER BY, and NULL-aware predicates on a practice database.",
        category: "learning",
        baseMinutes: 150,
        skillSlugs: ["sql-filtering"],
        sessionPlan: {
          learn: [
            "WHERE filters rows before grouping; ORDER BY only changes presentation.",
            "NULL means unknown, so = NULL does not behave like an ordinary comparison.",
          ],
          exercise:
            "Complete the SQLBolt filtering lessons, then write five queries against a practice table that combine text, number, date, and NULL filters.",
          check: [
            {
              question: "Why does `WHERE closed_at = NULL` fail to find NULLs?",
              answer:
                "Comparisons with NULL evaluate to unknown; use IS NULL instead.",
            },
          ],
          revision:
            "Rewrite one query using a different but equivalent filter and compare results.",
        },
        links: [sqlBolt, postgresTutorial],
      },
      {
        key: "t2",
        title: "Aggregate with GROUP BY and HAVING",
        description:
          "Use COUNT, SUM, AVG, and conditional filtering on groups.",
        category: "practice",
        baseMinutes: 180,
        skillSlugs: ["sql-aggregation"],
        sessionPlan: {
          learn: [
            "Every non-aggregated selected column must be part of the grouping.",
            "HAVING filters groups; WHERE filters rows before groups exist.",
          ],
          exercise:
            "Write five grouped queries: headcount by department, average salary by role, categories above a threshold, months with more than N signups, and a comparison of two segments.",
          check: [
            {
              question: "Which clause filters after GROUP BY?",
              answer: "HAVING.",
            },
          ],
          revision:
            "Explain the difference between COUNT(*) and COUNT(column) with an example.",
        },
        links: [sqlBolt, postgresTutorial],
      },
      {
        key: "t3",
        title: "Build a SQL question set",
        description:
          "Turn six answerable business questions into queries with results and one plain-language insight.",
        category: "project",
        baseMinutes: 210,
        skillSlugs: [
          "sql-filtering",
          "sql-aggregation",
          "technical-communication",
        ],
        sessionPlan: {
          learn: [
            "A good analytical question implies a decision, a comparison, or a check.",
            "Save the query next to its result so the answer can be reproduced.",
          ],
          exercise:
            "Write six questions about a practice dataset, answer each with SQL, save the queries, and add a one-paragraph summary of what the evidence supports.",
          check: [
            {
              question: "What should accompany every saved query?",
              answer:
                "The question it answers and the result or decision it informs.",
            },
          ],
          revision:
            "Re-run all six queries from a clean file and check the row counts.",
        },
        links: [sqlBolt, postgresTutorial],
      },
    ],
  },
  {
    week: 6,
    title: "SQL joins and relational design",
    summary:
      "Combine tables without duplicating rows and design keys that protect data integrity.",
    tasks: [
      {
        key: "t1",
        title: "Join tables that preserve the right rows",
        description:
          "Compare inner, left, and full joins and predict cardinality before running them.",
        category: "learning",
        baseMinutes: 180,
        skillSlugs: ["sql-joins"],
        sessionPlan: {
          learn: [
            "A JOIN matches rows through a condition; the join type decides what happens without a match.",
            "Check row counts and unmatched keys before trusting a join result.",
          ],
          exercise:
            "Run inner and left joins between customers and orders, count the rows, and inspect the rows whose customer fields are NULL.",
          check: [
            {
              question: "Which join keeps every row from the left table?",
              answer: "LEFT JOIN.",
            },
          ],
          revision:
            "Write one query whose row count changes when the join type changes, and explain why.",
        },
        links: [sqlBolt, postgresTutorial],
      },
      {
        key: "t2",
        title: "Use subqueries and CTE thinking",
        description:
          "Break multi-step questions into named, reviewable pieces.",
        category: "practice",
        baseMinutes: 150,
        skillSlugs: ["sql-subqueries", "problem-solving"],
        sessionPlan: {
          learn: [
            "A subquery can produce a list or a single value that another query consumes.",
            "A CTE names an intermediate result so the final query reads like the question.",
          ],
          exercise:
            "Answer three questions that need an intermediate result: customers above average spend, products never ordered, and the latest order per customer.",
          check: [
            {
              question: "What is the advantage of a CTE over a deeply nested subquery?",
              answer:
                "It names intermediate steps, making the logic easier to review and debug.",
            },
          ],
          revision:
            "Rewrite one subquery as a CTE and confirm the results are identical.",
        },
        links: [sqlBolt, postgresTutorial],
      },
      {
        key: "t3",
        title: "Design a small relational schema",
        description:
          "Choose primary keys, foreign keys, and constraints for a small application.",
        category: "project",
        baseMinutes: 210,
        skillSlugs: ["database-design", "sql-joins"],
        sessionPlan: {
          learn: [
            "A primary key identifies a row; a foreign key points to a row that must exist.",
            "Constraints are cheaper than correcting corrupted data later.",
          ],
          exercise:
            "Design tables for a small learning tracker (students, courses, enrolments, sessions). Write the DDL with primary and foreign keys, then insert sample data and run two join queries.",
          check: [
            {
              question: "What is a foreign key for?",
              answer:
                "It enforces that a value in one table refers to a valid row in another table.",
            },
          ],
          revision:
            "Draw the relationships and check every foreign key has a matching primary key.",
        },
        links: [postgresTutorial],
      },
    ],
  },
  {
    week: 7,
    title: "Statistics and uncertainty",
    summary:
      "Describe data honestly and reason about probability, sampling, and base rates.",
    tasks: [
      {
        key: "t1",
        title: "Describe center, spread, and shape",
        description:
          "Compute and interpret mean, median, standard deviation, IQR, and outliers.",
        category: "learning",
        baseMinutes: 150,
        skillSlugs: ["descriptive-statistics"],
        sessionPlan: {
          learn: [
            "Mean is sensitive to outliers; median is resistant.",
            "Two datasets can share a mean and still have very different spreads.",
          ],
          exercise:
            "Compute summary statistics for two numeric columns, create a box plot, and write which measure best represents each column and why.",
          check: [
            {
              question: "Which center is most affected by an extreme outlier?",
              answer: "The mean.",
            },
          ],
          revision:
            "Find a dataset where mean and median disagree and explain the disagreement.",
        },
        links: [khanStatistics, pandasTenMinutes],
      },
      {
        key: "t2",
        title: "Reason about probability and distributions",
        description:
          "Work through conditional probability, independence, and base-rate examples.",
        category: "practice",
        baseMinutes: 180,
        skillSlugs: ["probability", "data-distributions", "descriptive-statistics"],
        sessionPlan: {
          learn: [
            "P(A|B) is not the same as P(B|A); writing the events down prevents the swap.",
            "Rare conditions make false positives disproportionately important.",
          ],
          exercise:
            "Solve five probability problems and simulate one of them in Python. Compare the simulated frequency with your calculation.",
          check: [
            {
              question: "Why can a test with high sensitivity still produce many false positives?",
              answer:
                "When the condition is rare, most positive tests can come from the much larger healthy group.",
            },
          ],
          revision:
            "Explain one base-rate example without using formulas, then check it against the numbers.",
        },
        links: [khanStatistics],
      },
      {
        key: "t3",
        title: "Complete a statistics exercise set",
        description:
          "Apply descriptive statistics and probability to a real dataset and state the assumptions.",
        category: "project",
        baseMinutes: 180,
        skillSlugs: [
          "descriptive-statistics",
          "probability",
          "technical-communication",
        ],
        sessionPlan: {
          learn: [
            "Statistical claims depend on sampling and measurement assumptions.",
            "A confidence interval is about uncertainty, not certainty.",
          ],
          exercise:
            "Choose a small dataset, compute descriptive statistics, make one probability estimate, and write three sentences about what could bias the result.",
          check: [
            {
              question: "What is one common source of sampling bias?",
              answer:
                "Measuring only a convenient group that differs systematically from the population.",
            },
          ],
          revision:
            "Check each claim for a hidden denominator or selection effect.",
        },
        links: [khanStatistics],
      },
    ],
  },
  {
    week: 8,
    title: "EDA, visualization, and insight",
    summary:
      "Investigate structure and anomalies, choose honest charts, and communicate evidence without overclaiming.",
    tasks: [
      {
        key: "t1",
        title: "Run a structured exploratory analysis",
        description:
          "Move from questions to inspection, visualization, and documented data-quality checks.",
        category: "learning",
        baseMinutes: 180,
        skillSlugs: ["exploratory-analysis", "data-cleaning"],
        sessionPlan: {
          learn: [
            "EDA is question-driven: each check should rule something in or out.",
            "Inspect missingness, duplicates, ranges, and category counts before modelling.",
          ],
          exercise:
            "Run a ten-step EDA on a dataset: shape, types, missingness, duplicates, distributions, value ranges, category frequencies, relationships, anomalies, and open questions.",
          check: [
            {
              question: "Why inspect missingness before summary statistics?",
              answer:
                "Missing values change the denominator and can make comparisons misleading.",
            },
          ],
          revision:
            "Choose the three most important checks and explain what decision each informs.",
        },
        links: [pandasMissing, pandasTenMinutes],
      },
      {
        key: "t2",
        title: "Choose charts that tell the truth",
        description:
          "Match chart types to questions and catch misleading axes, scales, and aggregations.",
        category: "practice",
        baseMinutes: 150,
        skillSlugs: ["data-visualization"],
        sessionPlan: {
          learn: [
            "Distributions need spread; comparisons need a common scale; trends need time.",
            "A truncated axis or an undisclosed average can change the story more than the data does.",
          ],
          exercise:
            "Create three charts for three different questions, caption each with the exact claim it supports, and identify one way each chart could mislead.",
          check: [
            {
              question: "Which chart type is usually best for comparing distributions across groups?",
              answer: "A box plot or grouped histogram.",
            },
          ],
          revision:
            "Remove any chart decoration that does not help the comparison.",
        },
        links: [pandasPlotting, matplotlibTutorials],
      },
      {
        key: "t3",
        title: "Write an evidence-based insight memo",
        description:
          "Combine two charts and a clear claim-evidence-limitation structure.",
        category: "project",
        baseMinutes: 210,
        skillSlugs: [
          "business-insights",
          "technical-communication",
          "data-visualization",
        ],
        sessionPlan: {
          learn: [
            "A claim should be specific enough to be wrong.",
            "Separate what the data shows from what you recommend doing about it.",
          ],
          exercise:
            "Write a one-page memo with one recommendation, two charts, the evidence behind each, and the strongest reason the recommendation might be wrong.",
          check: [
            {
              question: "What is the difference between evidence and a recommendation?",
              answer:
                "Evidence describes what was observed; a recommendation proposes an action that may also depend on judgement.",
            },
          ],
          revision:
            "Highlight every sentence that states a fact and verify it against a chart or query.",
        },
        links: [pandasPlotting],
      },
    ],
  },
  {
    week: 9,
    title: "Machine learning foundations",
    summary:
      "Train a baseline, split data honestly, and evaluate a model without fooling yourself.",
    tasks: [
      {
        key: "t1",
        title: "Understand supervised versus unsupervised learning",
        description:
          "Identify labels, features, tasks, and where clustering differs from prediction.",
        category: "learning",
        baseMinutes: 120,
        skillSlugs: ["ml-fundamentals"],
        sessionPlan: {
          learn: [
            "Supervised learning uses labelled examples; unsupervised learning looks for structure without labels.",
            "A feature is an input available at prediction time; a target is what you want to predict.",
          ],
          exercise:
            "Take five problem descriptions and classify each as regression, classification, clustering, or not a machine-learning problem. Justify each choice.",
          check: [
            {
              question: "What is the difference between regression and classification?",
              answer:
                "Regression predicts a numeric value; classification predicts a category.",
            },
          ],
          revision:
            "For one problem, list which features would be available before the prediction and which would leak the answer.",
        },
        links: [sklearnGettingStarted],
      },
      {
        key: "t2",
        title: "Train a baseline model",
        description:
          "Build a train/test split, fit a simple model, and compare it with a naive baseline.",
        category: "practice",
        baseMinutes: 210,
        skillSlugs: [
          "scikit-learn",
          "regression",
          "classification",
          "pandas",
        ],
        sessionPlan: {
          learn: [
            "A baseline tells you whether the model learned anything useful.",
            "The test set is for final evaluation, not repeated tuning.",
          ],
          exercise:
            "Using a small tabular dataset, create a train/test split, train a baseline (for example, predicting the mean or majority class), train one simple model, and compare their metrics.",
          check: [
            {
              question: "Why compare against a baseline?",
              answer:
                "It sets the minimum useful performance and exposes whether complexity is justified.",
            },
          ],
          revision:
            "Write down the split strategy and one reason it might be optimistic.",
        },
        links: [sklearnGettingStarted],
      },
      {
        key: "t3",
        title: "Evaluate without fooling yourself",
        description:
          "Choose sensible metrics, inspect errors, and check for leakage and overfitting.",
        category: "project",
        baseMinutes: 210,
        skillSlugs: ["model-evaluation", "feature-engineering"],
        sessionPlan: {
          learn: [
            "Accuracy can hide poor performance on an imbalanced class.",
            "Leakage happens when information unavailable at prediction time enters training.",
          ],
          exercise:
            "Evaluate your model with a confusion matrix and at least two metrics. Write a leakage checklist and one example of an error the model makes.",
          check: [
            {
              question: "When is accuracy a poor primary metric?",
              answer:
                "When classes are imbalanced and the cost of different errors is not equal.",
            },
          ],
          revision:
            "Re-check the features and preprocessing steps for target leakage.",
        },
        links: [sklearnCrossValidation],
      },
    ],
  },
  {
    week: 10,
    title: "ML project and evidence",
    summary:
      "Build a small, reproducible modelling project and document its evidence and limits.",
    tasks: [
      {
        key: "t1",
        title: "Design a leakage-safe validation split",
        description:
          "Split before fitting preprocessing steps and keep the test data untouched.",
        category: "practice",
        baseMinutes: 150,
        skillSlugs: ["model-evaluation", "feature-engineering"],
        sessionPlan: {
          learn: [
            "Preprocessing that learns from data (scaling, imputation) must be fitted inside the training pipeline.",
            "A test set should be used once for the final estimate.",
          ],
          exercise:
            "Rebuild your workflow as a pipeline that splits first and fits preprocessing on training data only. Verify the test set is never used for fitting.",
          check: [
            {
              question: "Why fit an imputer before splitting the data?",
              answer:
                "It leaks information from the test set into training and makes the evaluation optimistic.",
            },
          ],
          revision:
            "Trace every transformation and label whether it used training data only.",
        },
        links: [sklearnCrossValidation],
      },
      {
        key: "t2",
        title: "Improve and compare models",
        description:
          "Compare two reasonable approaches with cross-validation and record the trade-offs.",
        category: "project",
        baseMinutes: 210,
        skillSlugs: ["scikit-learn", "model-evaluation", "problem-solving"],
        sessionPlan: {
          learn: [
            "More complexity is only useful if it improves held-out performance.",
            "Cross-validation gives a more stable estimate than a single split.",
          ],
          exercise:
            "Compare your baseline with two models using cross-validation. Record mean and spread of the metric, training time, and one interpretability trade-off.",
          check: [
            {
              question: "What does a large gap between training and validation score suggest?",
              answer: "Overfitting — the model memorised patterns that do not generalise.",
            },
          ],
          revision:
            "Choose the simplest model that is competitive and explain why.",
        },
        links: [sklearnGettingStarted, sklearnCrossValidation],
      },
      {
        key: "t3",
        title: "Write a model card and a reproducible README",
        description:
          "Document problem, data, metrics, limitations, setup, and next steps without claiming deployment experience.",
        category: "project",
        baseMinutes: 180,
        skillSlugs: [
          "technical-communication",
          "ml-fundamentals",
          "business-insights",
          "project-structure",
        ],
        sessionPlan: {
          learn: [
            "A model card records intended use, data, evaluation, and limitations.",
            "A project becomes evidence when the method and results are reproducible.",
          ],
          exercise:
            "Write a one-page model card for your project: question, data, split, baseline, model, metrics, failure cases, limitations, and the next experiment you would run. Add a README with setup and run steps.",
          check: [
            {
              question: "What belongs in a limitations section?",
              answer:
                "Known failure modes, data gaps, evaluation constraints, and claims the evidence does not support.",
            },
          ],
          revision:
            "Remove any sentence that implies more certainty or production use than the evidence supports.",
        },
        links: [sklearnGettingStarted, githubReadme],
      },
    ],
  },
  {
    week: 13,
    title: "Career checkpoint and next 90 days",
    summary:
      "Review demonstrated evidence, compare the two experiments, and choose a direction with an alternative.",
    tasks: [
      {
        key: "t1",
        title: "Retake the core skill checks",
        description:
          "Use the assessment screen again to see what changed. The retake is saved as new evidence and does not erase your first result.",
        category: "checkpoint",
        baseMinutes: 90,
        skillSlugs: [],
        sessionPlan: {
          learn: [
            "A retake is useful only if you compare it with the earlier evidence rather than treating it as a final verdict.",
            "Look for changed levels, not just a total score.",
          ],
          exercise:
            "Open the assessment page, complete a retake, and note which skill levels changed and which stayed the same.",
          check: [
            {
              question: "What should you compare after a retake?",
              answer:
                "Per-skill demonstrated levels, confidence, and the concepts that are still gaps.",
            },
          ],
          revision:
            "Write one sentence about a skill that improved and one that still needs practice.",
        },
        links: [],
      },
      {
        key: "t2",
        title: "Compare the two career experiments",
        description:
          "Use evidence and your own reflections to compare interest, difficulty, enjoyment, and willingness to improve.",
        category: "review",
        baseMinutes: 120,
        skillSlugs: ["technical-communication", "business-insights"],
        sessionPlan: {
          learn: [
            "A career experiment is evidence about fit, not a commitment to a title.",
            "Compare the work, not only the imagined prestige of the role.",
          ],
          exercise:
            "Create a comparison table for the two tracks: what you built, what was difficult, what you enjoyed, what you would improve, and how willing you are to keep practising.",
          check: [
            {
              question: "Why compare willingness to improve as well as enjoyment?",
              answer:
                "Enjoyment without willingness to practise the hard parts is a weak signal for a long-term direction.",
            },
          ],
          revision:
            "Add one piece of evidence for each claim in the table.",
        },
        links: [],
      },
      {
        key: "t3",
        title: "Choose a primary direction and an alternative",
        description:
          "Recommend a specialization for the next 90 days and keep a reasoned alternative.",
        category: "checkpoint",
        baseMinutes: 120,
        skillSlugs: ["problem-solving", "technical-communication"],
        sessionPlan: {
          learn: [
            "A direction is a hypothesis supported by evidence, not a permanent identity.",
            "An alternative reduces the cost of being wrong.",
          ],
          exercise:
            "Write a short decision note: primary direction, alternative, the evidence for each, the skills to build next, and the signals that would make you change course.",
          check: [
            {
              question: "What makes a career decision reversible?",
              answer:
                "Keeping transferable skills and a tested alternative rather than betting everything on one title.",
            },
          ],
          revision:
            "Ask whether each claim is supported by a project, assessment result, or reflection.",
        },
        links: [],
      },
      {
        key: "t4",
        title: "Update your profile and archive your evidence",
        description:
          "Keep your profile current, export a copy of your data, and write a short handover to your future self.",
        category: "review",
        baseMinutes: 60,
        skillSlugs: ["project-structure"],
        sessionPlan: {
          learn: [
            "Your profile and assessment are inputs to future plans; stale inputs produce stale plans.",
            "An export is a personal backup, not a substitute for fixing incorrect records.",
          ],
          exercise:
            "Update your profile, export your data from Settings, and write a five-bullet handover: what you can do, what is still fragile, what you enjoyed, what to build next, and one question to answer.",
          check: [
            {
              question: "What should you check before relying on an old roadmap?",
              answer:
                "Whether your availability, target direction, and skill evidence still match reality.",
            },
          ],
          revision:
            "Schedule the first task of your next 90-day plan in your calendar.",
        },
        links: [],
      },
    ],
  },
];

export function getWeekSeed(week: number) {
  return WEEK_SEEDS.find((seed) => seed.week === week) ?? null;
}

export function getBaseCurriculumMinutes() {
  return WEEK_SEEDS.reduce(
    (total, week) =>
      total +
      week.tasks.reduce((weekTotal, task) => weekTotal + task.baseMinutes, 0),
    0,
  );
}
