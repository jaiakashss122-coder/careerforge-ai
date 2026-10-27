import {
  CONFIDENCE_OPTIONS,
  INTEREST_META,
  type CareerChoiceQuestion,
  type ConfidenceQuestion,
  type ConstraintChoiceQuestion,
  type ConstraintHoursQuestion,
  type InterestQuestion,
  type TechnicalProbe,
  type TechnicalQuestion,
  type TechnicalSection,
} from "@/lib/assessment/types";

export const NOT_SURE_VALUE = "not-sure";

const NOT_SURE_OPTION = {
  value: NOT_SURE_VALUE,
  label: "Not sure",
  description: "Choose this instead of guessing.",
};

export function withNotSure(options: TechnicalQuestion["options"]) {
  return [...options, NOT_SURE_OPTION];
}

const pythonBasics: TechnicalProbe = {
  id: "python-basics",
  section: "programming",
  skillSlugs: ["python-basics"],
  concept: "Variables, conditions, loops, and collections",
  core: {
    key: "python-basics-core",
    difficulty: "core",
    prompt: "What does this program print?",
    code: `total = 0
for number in [1, 2, 3, 4]:
    if number % 2 == 0:
        total += number
print(total)`,
    options: withNotSure([
      { value: "6", label: "6" },
      { value: "10", label: "10" },
      { value: "4", label: "4" },
      { value: "2", label: "2" },
    ]),
    correctOption: "6",
    explanation:
      "Only the even values (2 and 4) are added to total, so the result is 6.",
    concept: "Tracing loops and conditions",
    remedial: {
      slug: "python-basics-foundations",
      title: "Rebuild Python basics: variables, conditions, and loops",
    },
  },
  ifCorrect: {
    key: "python-basics-application",
    difficulty: "application",
    prompt: "What does this comprehension print?",
    code: `scores = {"ada": 3, "lin": 5, "sam": 4}
passed = [name for name, score in scores.items() if score >= 4]
print(passed)`,
    options: withNotSure([
      { value: "lin-sam", label: "['lin', 'sam']" },
      { value: "sam", label: "['sam']" },
      { value: "ada", label: "['ada']" },
      { value: "all", label: "['ada', 'lin', 'sam']" },
    ]),
    correctOption: "lin-sam",
    explanation:
      "The comprehension keeps names whose score is at least 4. Dictionary order is preserved, so the result is ['lin', 'sam'].",
    concept: "Transforming collections with comprehensions",
    remedial: {
      slug: "python-collections-application",
      title: "Practice list comprehensions and dictionary iteration",
    },
  },
  ifIncorrect: {
    key: "python-basics-foundation",
    difficulty: "foundation",
    prompt: "Which values does `range(3)` produce when used in a loop?",
    options: withNotSure([
      { value: "012", label: "0, 1, 2" },
      { value: "123", label: "1, 2, 3" },
      { value: "0123", label: "0, 1, 2, 3" },
      { value: "three", label: "A single value: 3" },
    ]),
    correctOption: "012",
    explanation:
      "`range(3)` starts at 0 and stops before 3, producing 0, 1, 2.",
    concept: "Loop ranges and zero-based counting",
    remedial: {
      slug: "python-basics-foundations",
      title: "Rebuild Python basics: loops and zero-based counting",
    },
  },
};

const pythonDebugging: TechnicalProbe = {
  id: "python-debugging",
  section: "programming",
  skillSlugs: ["python-debugging"],
  concept: "Reading errors and fixing small faults",
  core: {
    key: "python-debugging-core",
    difficulty: "core",
    prompt: "What is the problem in this program, and what is the smallest correct fix?",
    code: `numbers = [1, 2, 3]
print(numbers[3])`,
    options: withNotSure([
      {
        value: "index",
        label: "IndexError; read numbers[2] instead of numbers[3]",
      },
      {
        value: "type",
        label: "TypeError; convert the list to a string",
      },
      {
        value: "name",
        label: "NameError; define a variable called numbers",
      },
      {
        value: "none",
        label: "No error; it prints 3",
      },
    ]),
    correctOption: "index",
    explanation:
      "List indexes start at 0, so a three-item list has indexes 0, 1, and 2. Index 3 is out of range.",
    concept: "Zero-based indexing and IndexError",
    remedial: {
      slug: "python-debugging-foundations",
      title: "Read tracebacks: common Python errors and their fixes",
    },
  },
  ifCorrect: {
    key: "python-debugging-application",
    difficulty: "application",
    prompt: "What happens when this program runs, and what is the best fix?",
    code: `def average(values):
    return sum(values) / len(values)

print(average([]))`,
    options: withNotSure([
      {
        value: "zero-division",
        label: "ZeroDivisionError; handle an empty list explicitly",
      },
      {
        value: "syntax",
        label: "SyntaxError; add a colon to the return line",
      },
      {
        value: "index",
        label: "IndexError; read values[0] before dividing",
      },
      {
        value: "zero",
        label: "No error; it returns 0",
      },
    ]),
    correctOption: "zero-division",
    explanation:
      "The length of an empty list is 0, so Python raises ZeroDivisionError. A clear guard or explicit empty-result policy is the fix.",
    concept: "Edge cases and guarded functions",
    remedial: {
      slug: "python-debugging-edge-cases",
      title: "Debug edge cases: empty inputs and boundary values",
    },
  },
  ifIncorrect: {
    key: "python-debugging-foundation",
    difficulty: "foundation",
    prompt: "What does a Python traceback primarily tell you?",
    options: withNotSure([
      {
        value: "path",
        label: "The call path and the line where the exception occurred",
      },
      { value: "output", label: "Only the program's final output" },
      { value: "schema", label: "The database schema" },
      { value: "version", label: "Only the installed package version" },
    ]),
    correctOption: "path",
    explanation:
      "A traceback shows the call stack and the failing line, which is exactly where debugging starts.",
    concept: "Using tracebacks as evidence",
    remedial: {
      slug: "python-debugging-foundations",
      title: "Read tracebacks: how to locate the failing line",
    },
  },
};

const problemSolving: TechnicalProbe = {
  id: "problem-solving",
  section: "programming",
  skillSlugs: ["problem-solving"],
  concept: "Breaking a problem into correct, testable steps",
  core: {
    key: "problem-solving-core",
    difficulty: "core",
    prompt:
      "You need to count how many times each word appears in a list. Which first step is clearest and most direct?",
    options: withNotSure([
      {
        value: "dict",
        label:
          "Create a dictionary mapping each word to a count, then loop through the list once",
      },
      {
        value: "sort",
        label: "Sort the list and print it",
      },
      {
        value: "set",
        label: "Convert the list to a set and print it",
      },
      {
        value: "regex",
        label: "Write a separate regular expression for every possible word",
      },
    ]),
    correctOption: "dict",
    explanation:
      "A frequency dictionary is a direct model of the output you need. The other options do not produce counts.",
    concept: "Choosing a data structure that models the answer",
    remedial: {
      slug: "problem-solving-foundations",
      title: "Break a problem down: inputs, outputs, and data structures",
    },
  },
  ifCorrect: {
    key: "problem-solving-application",
    difficulty: "application",
    prompt:
      "You already have word counts in a dictionary. Which approach most directly finds the three most common words?",
    options: withNotSure([
      {
        value: "counter",
        label: "Use collections.Counter(counts).most_common(3)",
      },
      {
        value: "count-loop",
        label: "Call list.count for every unique word and sort the results",
      },
      {
        value: "keys",
        label: "Sort the dictionary keys alphabetically and take three",
      },
      {
        value: "pairs",
        label: "Write a nested loop over every pair of words",
      },
    ]),
    correctOption: "counter",
    explanation:
      "Counter.most_common expresses the intent directly. Manual counting can work but adds unnecessary steps and risk.",
    concept: "Using standard-library tools instead of rebuilding them",
    remedial: {
      slug: "problem-solving-standard-library",
      title: "Use the standard library: Counter, defaultdict, and friends",
    },
  },
  ifIncorrect: {
    key: "problem-solving-foundation",
    difficulty: "foundation",
    prompt: "When a problem feels too large, what is the best first step?",
    options: withNotSure([
      {
        value: "examples",
        label:
          "Write down the inputs, outputs, and one small example you can verify",
      },
      { value: "code", label: "Start writing code immediately" },
      { value: "copy", label: "Copy a complete solution from the internet" },
      { value: "skip", label: "Skip testing until the end" },
    ]),
    correctOption: "examples",
    explanation:
      "A concrete example exposes the real requirements and gives you a test case before you write the solution.",
    concept: "Framing a problem with examples",
    remedial: {
      slug: "problem-solving-foundations",
      title: "Break a problem down: start with a concrete example",
    },
  },
};

const sqlFiltering: TechnicalProbe = {
  id: "sql-filtering",
  section: "sql",
  skillSlugs: ["sql-filtering"],
  concept: "Filtering, sorting, and NULL-aware queries",
  core: {
    key: "sql-filtering-core",
    difficulty: "core",
    prompt:
      "Which query returns customers from Delhi, newest signup first?",
    options: withNotSure([
      {
        value: "correct",
        label:
          "SELECT * FROM customers WHERE city = 'Delhi' ORDER BY signup_date DESC;",
      },
      {
        value: "asc",
        label:
          "SELECT * FROM customers WHERE city = 'Delhi' ORDER BY signup_date ASC;",
      },
      {
        value: "order-bool",
        label: "SELECT * FROM customers ORDER BY city = 'Delhi';",
      },
      {
        value: "wrong-column",
        label: "SELECT city FROM customers WHERE signup_date = 'Delhi';",
      },
    ]),
    correctOption: "correct",
    explanation:
      "WHERE filters before sorting, and DESC puts the newest date first.",
    concept: "WHERE versus ORDER BY",
    remedial: {
      slug: "sql-filtering-foundations",
      title: "SQL filtering: WHERE, ORDER BY, and NULL handling",
    },
  },
  ifCorrect: {
    key: "sql-filtering-application",
    difficulty: "application",
    prompt:
      "A tickets table uses a NULL closed_at for tickets that are still open. Which filter finds open tickets?",
    options: withNotSure([
      { value: "is-null", label: "WHERE closed_at IS NULL" },
      { value: "eq-null", label: "WHERE closed_at = NULL" },
      { value: "neq-null", label: "WHERE closed_at != NULL" },
      { value: "empty", label: "WHERE closed_at = ''" },
    ]),
    correctOption: "is-null",
    explanation:
      "Comparisons with NULL using = or != evaluate to unknown. SQL uses IS NULL and IS NOT NULL for presence checks.",
    concept: "NULL semantics",
    remedial: {
      slug: "sql-null-handling",
      title: "NULL semantics: why = NULL never matches",
    },
  },
  ifIncorrect: {
    key: "sql-filtering-foundation",
    difficulty: "foundation",
    prompt: "Which clause filters individual rows before grouping?",
    options: withNotSure([
      { value: "where", label: "WHERE" },
      { value: "order", label: "ORDER BY" },
      { value: "group", label: "GROUP BY" },
      { value: "limit", label: "LIMIT" },
    ]),
    correctOption: "where",
    explanation:
      "WHERE filters rows before aggregation. HAVING filters groups after aggregation.",
    concept: "Query clause order",
    remedial: {
      slug: "sql-filtering-foundations",
      title: "SQL filtering: the role of WHERE",
    },
  },
};

const sqlAggregation: TechnicalProbe = {
  id: "sql-aggregation",
  section: "sql",
  skillSlugs: ["sql-aggregation"],
  concept: "GROUP BY, HAVING, and aggregate functions",
  core: {
    key: "sql-aggregation-core",
    difficulty: "core",
    prompt:
      "What does this query return?\n\nSELECT department, COUNT(*) FROM employees GROUP BY department;",
    options: withNotSure([
      { value: "per-department", label: "One row per department with its headcount" },
      { value: "total", label: "A single row with the total headcount" },
      { value: "per-employee", label: "One row per employee" },
      { value: "big", label: "Only departments with more than one employee" },
    ]),
    correctOption: "per-department",
    explanation:
      "GROUP BY creates one group per department, and COUNT(*) counts the rows in each group.",
    concept: "Grouping before aggregating",
    remedial: {
      slug: "sql-aggregation-foundations",
      title: "SQL aggregation: GROUP BY and COUNT",
    },
  },
  ifCorrect: {
    key: "sql-aggregation-application",
    difficulty: "application",
    prompt: "Which query finds departments with more than five employees?",
    options: withNotSure([
      {
        value: "having",
        label:
          "SELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5;",
      },
      {
        value: "where-count",
        label:
          "SELECT department, COUNT(*) FROM employees WHERE COUNT(*) > 5;",
      },
      {
        value: "group-where",
        label:
          "SELECT department, COUNT(*) FROM employees GROUP BY department WHERE COUNT(*) > 5;",
      },
      {
        value: "boolean",
        label:
          "SELECT department, COUNT(*) > 5 FROM employees;",
      },
    ]),
    correctOption: "having",
    explanation:
      "HAVING filters aggregated groups. WHERE runs before grouping and cannot use aggregate results.",
    concept: "HAVING versus WHERE",
    remedial: {
      slug: "sql-aggregation-having",
      title: "Filter groups: HAVING after GROUP BY",
    },
  },
  ifIncorrect: {
    key: "sql-aggregation-foundation",
    difficulty: "foundation",
    prompt: "What does COUNT(*) count?",
    options: withNotSure([
      { value: "rows", label: "The rows in each group" },
      { value: "non-null", label: "Non-NULL values in every column" },
      { value: "distinct", label: "Distinct values across the table" },
      { value: "tables", label: "The number of tables in the database" },
    ]),
    correctOption: "rows",
    explanation:
      "COUNT(*) counts rows. COUNT(column) counts non-NULL values in that column.",
    concept: "Aggregate function semantics",
    remedial: {
      slug: "sql-aggregation-foundations",
      title: "SQL aggregation: what COUNT actually counts",
    },
  },
};

const sqlJoins: TechnicalProbe = {
  id: "sql-joins",
  section: "sql",
  skillSlugs: ["sql-joins"],
  concept: "Join types and row matching",
  core: {
    key: "sql-joins-core",
    difficulty: "core",
    prompt:
      "You need every customer, including customers with no orders. Which query is correct?",
    options: withNotSure([
      {
        value: "left",
        label:
          "SELECT * FROM customers LEFT JOIN orders ON customers.id = orders.customer_id;",
      },
      {
        value: "inner",
        label:
          "SELECT * FROM customers INNER JOIN orders ON customers.id = orders.customer_id;",
      },
      {
        value: "cross",
        label:
          "SELECT * FROM customers CROSS JOIN orders;",
      },
      {
        value: "orders-left",
        label:
          "SELECT * FROM orders LEFT JOIN customers ON customers.id = orders.customer_id;",
      },
    ]),
    correctOption: "left",
    explanation:
      "A LEFT JOIN keeps every row from the left table (customers), adding NULL order fields when no order matches.",
    concept: "LEFT JOIN keeps the left table",
    remedial: {
      slug: "sql-joins-foundations",
      title: "SQL joins: INNER, LEFT, and what each preserves",
    },
  },
  ifCorrect: {
    key: "sql-joins-application",
    difficulty: "application",
    prompt:
      "There are 10 orders and 5 customers. Every order belongs to one customer, and 2 customers have no orders. How many rows does customers LEFT JOIN orders return?",
    options: withNotSure([
      { value: "10", label: "10 rows" },
      { value: "5", label: "5 rows" },
      { value: "15", label: "15 rows" },
      { value: "50", label: "50 rows" },
    ]),
    correctOption: "10",
    explanation:
      "Eight orders produce eight matched rows. The two customers without orders each produce one row with NULL order fields, for 10 rows total.",
    concept: "Counting rows after a left join",
    remedial: {
      slug: "sql-joins-cardinality",
      title: "Join cardinality: predicting row counts",
    },
  },
  ifIncorrect: {
    key: "sql-joins-foundation",
    difficulty: "foundation",
    prompt: "What does an INNER JOIN return?",
    options: withNotSure([
      { value: "matches", label: "Only rows with matches in both tables" },
      { value: "all", label: "Every row from both tables" },
      { value: "left", label: "Only rows from the left table" },
      { value: "columns", label: "A single combined column" },
    ]),
    correctOption: "matches",
    explanation:
      "INNER JOIN discards rows without a match. LEFT JOIN preserves the left table.",
    concept: "INNER JOIN semantics",
    remedial: {
      slug: "sql-joins-foundations",
      title: "SQL joins: what INNER JOIN keeps",
    },
  },
};

const databaseDesign: TechnicalProbe = {
  id: "database-design",
  section: "sql",
  skillSlugs: ["database-design", "sql-subqueries"],
  concept: "Primary keys, relationships, and subqueries",
  core: {
    key: "database-design-core",
    difficulty: "core",
    prompt: "Which key uniquely identifies each row in a table?",
    options: withNotSure([
      { value: "primary", label: "Primary key" },
      { value: "foreign", label: "Foreign key" },
      { value: "index", label: "Index" },
      { value: "not-null", label: "Any NOT NULL column" },
    ]),
    correctOption: "primary",
    explanation:
      "A primary key uniquely identifies rows. A foreign key references a key in another table; an index speeds lookups but does not define identity.",
    concept: "Keys and relationship integrity",
    remedial: {
      slug: "database-design-foundations",
      title: "Relational design: primary keys, foreign keys, and relationships",
    },
  },
  ifCorrect: {
    key: "database-design-application",
    difficulty: "application",
    prompt:
      "You need orders belonging to customers who joined in 2025. Which approach is valid?",
    options: withNotSure([
      {
        value: "subquery",
        label:
          "SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE join_year = 2025);",
      },
      {
        value: "orders-year",
        label: "SELECT * FROM orders WHERE join_year = 2025;",
      },
      {
        value: "group",
        label: "SELECT * FROM orders GROUP BY join_year;",
      },
      {
        value: "order",
        label: "SELECT * FROM orders ORDER BY join_year;",
      },
    ]),
    correctOption: "subquery",
    explanation:
      "The subquery finds the relevant customer ids, and IN filters orders by those ids. The other options assume join_year exists on orders or misuse grouping.",
    concept: "Subqueries for multi-step questions",
    remedial: {
      slug: "sql-subqueries-foundations",
      title: "Subqueries: answering a question in two steps",
    },
  },
  ifIncorrect: {
    key: "database-design-foundation",
    difficulty: "foundation",
    prompt: "What does a foreign key do?",
    options: withNotSure([
      {
        value: "reference",
        label: "References a key in another table and enforces relationship integrity",
      },
      { value: "encrypt", label: "Encrypts the column" },
      { value: "unique", label: "Must be unique in every row" },
      { value: "sort", label: "Sorts rows automatically" },
    ]),
    correctOption: "reference",
    explanation:
      "A foreign key links rows and prevents references to missing records. It does not have to be unique.",
    concept: "Foreign keys and referential integrity",
    remedial: {
      slug: "database-design-foundations",
      title: "Relational design: foreign keys and referential integrity",
    },
  },
};

const descriptiveStatistics: TechnicalProbe = {
  id: "descriptive-statistics",
  section: "data-science",
  skillSlugs: ["descriptive-statistics", "probability"],
  concept: "Center, spread, and probability",
  core: {
    key: "descriptive-statistics-core",
    difficulty: "core",
    prompt:
      "A salary list contains one extremely high outlier. Which measure of center is most affected?",
    options: withNotSure([
      { value: "mean", label: "The mean" },
      { value: "median", label: "The median" },
      { value: "mode", label: "The mode" },
      { value: "none", label: "None of them" },
    ]),
    correctOption: "mean",
    explanation:
      "The mean includes every value, so an extreme value pulls it strongly. The median is resistant to outliers.",
    concept: "Mean versus median",
    remedial: {
      slug: "descriptive-statistics-foundations",
      title: "Descriptive statistics: center, spread, and outliers",
    },
  },
  ifCorrect: {
    key: "descriptive-statistics-application",
    difficulty: "application",
    prompt:
      "A test has 95% sensitivity and a 5% false-positive rate. In a population where the condition is rare, what happens to the positive predictive value?",
    options: withNotSure([
      {
        value: "low",
        label:
          "It can be low, because false positives can outnumber true positives",
      },
      { value: "same", label: "It stays exactly 95%" },
      { value: "hundred", label: "It becomes 100%" },
      { value: "prevalence", label: "Prevalence does not affect it" },
    ]),
    correctOption: "low",
    explanation:
      "When the condition is rare, even a small false-positive rate can produce more false positives than true positives, lowering the positive predictive value.",
    concept: "Base rates and conditional probability",
    remedial: {
      slug: "probability-base-rates",
      title: "Probability in context: base rates and false positives",
    },
  },
  ifIncorrect: {
    key: "descriptive-statistics-foundation",
    difficulty: "foundation",
    prompt: "Which pair describes the center and spread of numeric data?",
    options: withNotSure([
      { value: "mean-sd", label: "Mean and standard deviation" },
      { value: "median-mode", label: "Median and mode" },
      { value: "min-max", label: "Only the minimum and maximum" },
      { value: "count-sum", label: "Count and sum" },
    ]),
    correctOption: "mean-sd",
    explanation:
      "A mean describes center and a standard deviation describes typical spread. Median and mode both describe center, not spread.",
    concept: "Center versus spread",
    remedial: {
      slug: "descriptive-statistics-foundations",
      title: "Descriptive statistics: center and spread",
    },
  },
};

const dataCleaning: TechnicalProbe = {
  id: "data-cleaning",
  section: "data-science",
  skillSlugs: ["data-cleaning", "pandas"],
  concept: "Cleaning data and working with pandas",
  core: {
    key: "data-cleaning-core",
    difficulty: "core",
    prompt:
      "A numeric column arrives as text with currency symbols and a few invalid entries. What is the best first step?",
    options: withNotSure([
      {
        value: "inspect",
        label:
          "Inspect the values, parse them to numbers, and handle invalid entries explicitly",
      },
      { value: "drop", label: "Drop the column immediately" },
      { value: "multiply", label: "Multiply the text by 1" },
      { value: "mean", label: "Replace every value with the mean" },
    ]),
    correctOption: "inspect",
    explanation:
      "Cleaning starts with inspecting real values. A deliberate parse plus a documented policy for invalid entries preserves evidence and avoids silent corruption.",
    concept: "Validating types before analysis",
    remedial: {
      slug: "data-cleaning-foundations",
      title: "Data cleaning: inspect types and parse values deliberately",
    },
  },
  ifCorrect: {
    key: "data-cleaning-application",
    difficulty: "application",
    prompt: "What does this program print?",
    code: `import pandas as pd

df = pd.DataFrame({
    "team": ["A", "A", "B"],
    "score": [10, 20, 30],
})
print(df.groupby("team")["score"].mean())`,
    options: withNotSure([
      { value: "correct", label: "team A 15.0, B 30.0" },
      { value: "reversed", label: "team A 30.0, B 15.0" },
      { value: "list", label: "A single list: [15.0, 30.0]" },
      { value: "sum", label: "team A 30, B 30" },
    ]),
    correctOption: "correct",
    explanation:
      "groupby computes the mean score per team: (10 + 20) / 2 = 15.0 for A, and 30.0 for B.",
    concept: "Grouping and aggregating with pandas",
    remedial: {
      slug: "pandas-groupby",
      title: "pandas: groupby, aggregation, and inspection",
    },
  },
  ifIncorrect: {
    key: "data-cleaning-foundation",
    difficulty: "foundation",
    prompt: "Which pandas expression counts missing values in each column?",
    options: withNotSure([
      { value: "isna", label: "df.isna().sum()" },
      { value: "sum", label: "df.sum()" },
      { value: "dropna", label: "df.dropna()" },
      { value: "count", label: "df.count()" },
    ]),
    correctOption: "isna",
    explanation:
      "df.isna() marks missing cells, and sum() counts true values per column. df.count() counts non-missing values instead.",
    concept: "Detecting missing values",
    remedial: {
      slug: "data-cleaning-missing",
      title: "Missing values: detect, investigate, and document",
    },
  },
};

const dataVisualization: TechnicalProbe = {
  id: "data-visualization",
  section: "data-science",
  skillSlugs: ["data-visualization", "exploratory-analysis"],
  concept: "Exploratory analysis and honest charts",
  core: {
    key: "data-visualization-core",
    difficulty: "core",
    prompt:
      "You want to compare the distribution of salaries across three departments. Which chart is most appropriate?",
    options: withNotSure([
      {
        value: "box",
        label: "Box plots or histograms grouped by department",
      },
      { value: "pie", label: "A pie chart of total salary by department" },
      { value: "line", label: "A line chart with employees ordered by name" },
      { value: "scatter", label: "A scatter plot of salary against itself" },
    ]),
    correctOption: "box",
    explanation:
      "Distributions are best compared with charts that show spread and shape, such as box plots or grouped histograms. Totals in a pie chart hide the distribution.",
    concept: "Choosing charts for distributions",
    remedial: {
      slug: "data-visualization-foundations",
      title: "Choose honest charts for distributions and comparisons",
    },
  },
  ifCorrect: {
    key: "data-visualization-application",
    difficulty: "application",
    prompt:
      "A chart shows average revenue rising while the number of customers falls. What should you check before concluding the product is healthier?",
    options: withNotSure([
      {
        value: "segments",
        label:
          "Segment mix and the underlying distribution, not only the average",
      },
      { value: "color", label: "Whether the chart colors are consistent" },
      { value: "rounding", label: "Whether the average was rounded" },
      { value: "nothing", label: "Nothing; the chart is conclusive" },
    ]),
    correctOption: "segments",
    explanation:
      "A rising average can coexist with a shrinking customer base if a small high-value segment grows. Check the mix and distribution before making a claim.",
    concept: "Averages can hide segment changes",
    remedial: {
      slug: "eda-segment-analysis",
      title: "EDA: segment before you conclude from an average",
    },
  },
  ifIncorrect: {
    key: "data-visualization-foundation",
    difficulty: "foundation",
    prompt: "What is the main purpose of exploratory data analysis (EDA)?",
    options: withNotSure([
      {
        value: "understand",
        label:
          "Understand patterns, anomalies, and assumptions before modelling",
      },
      { value: "final", label: "Produce the final presentation charts" },
      { value: "train", label: "Train the final machine learning model" },
      { value: "delete", label: "Automatically delete every outlier" },
    ]),
    correctOption: "understand",
    explanation:
      "EDA builds understanding and exposes data problems before modelling or reporting. It is not the final model or a chart-production step.",
    concept: "Purpose of exploratory analysis",
    remedial: {
      slug: "eda-foundations",
      title: "EDA foundations: ask questions before modelling",
    },
  },
};

const gitGithub: TechnicalProbe = {
  id: "git-github",
  section: "software-development",
  skillSlugs: ["git-github"],
  concept: "Version control with Git and GitHub",
  core: {
    key: "git-github-core",
    difficulty: "core",
    prompt:
      "You changed two files and want a safe snapshot before trying a risky refactor. What should you do?",
    options: withNotSure([
      {
        value: "commit",
        label: "Commit the changes on a branch before refactoring",
      },
      { value: "delete", label: "Delete the changed files" },
      { value: "email", label: "Email the files to yourself" },
      { value: "database", label: "Edit the production database" },
    ]),
    correctOption: "commit",
    explanation:
      "A commit records a recoverable snapshot. A branch keeps the risky work separate from the main line.",
    concept: "Commits as recoverable snapshots",
    remedial: {
      slug: "git-github-foundations",
      title: "Git basics: commits, branches, and safe snapshots",
    },
  },
  ifCorrect: {
    key: "git-github-application",
    difficulty: "application",
    prompt:
      "You finished work on a feature branch. What is the usual next step to propose merging it into main?",
    options: withNotSure([
      { value: "pr", label: "Open a pull request for review" },
      { value: "force", label: "Force-push directly over main" },
      { value: "delete", label: "Delete the remote repository" },
      { value: "commit-main", label: "Commit directly to main without review" },
    ]),
    correctOption: "pr",
    explanation:
      "A pull request makes the change visible, reviewable, and testable before it reaches main.",
    concept: "Pull requests and review",
    remedial: {
      slug: "git-github-pull-requests",
      title: "GitHub workflow: branches, pull requests, and review",
    },
  },
  ifIncorrect: {
    key: "git-github-foundation",
    difficulty: "foundation",
    prompt: "What does `git status` show?",
    options: withNotSure([
      {
        value: "changes",
        label: "Changed files, staged changes, and the current branch state",
      },
      { value: "remote", label: "Only the remote repository URLs" },
      { value: "schema", label: "The database schema" },
      { value: "python", label: "The installed Python version" },
    ]),
    correctOption: "changes",
    explanation:
      "git status is the basic orientation command: it shows what changed and where you are before you commit.",
    concept: "Inspecting repository state",
    remedial: {
      slug: "git-github-foundations",
      title: "Git basics: inspect your working tree with git status",
    },
  },
};

const commandLine: TechnicalProbe = {
  id: "command-line",
  section: "software-development",
  skillSlugs: ["command-line", "http-apis"],
  concept: "Command line and HTTP API fundamentals",
  core: {
    key: "command-line-core",
    difficulty: "core",
    prompt:
      "On macOS or Linux, which command lists the files in the current directory?",
    options: withNotSure([
      { value: "ls", label: "ls" },
      { value: "cd", label: "cd" },
      { value: "rm", label: "rm" },
      { value: "python", label: "python" },
    ]),
    correctOption: "ls",
    explanation:
      "ls lists directory contents. cd changes directory, rm removes files, and python starts an interpreter.",
    concept: "Navigating from the terminal",
    remedial: {
      slug: "command-line-foundations",
      title: "Command line basics: navigation and inspection",
    },
  },
  ifCorrect: {
    key: "command-line-application",
    difficulty: "application",
    prompt: "A JSON API returns HTTP 200 OK. What does that indicate?",
    options: withNotSure([
      {
        value: "success",
        label:
          "The request succeeded and the body may contain the requested data",
      },
      { value: "correct", label: "The data is definitely accurate" },
      { value: "offline", label: "The server is offline" },
      { value: "auth", label: "Authentication failed" },
    ]),
    correctOption: "success",
    explanation:
      "200 means the HTTP request succeeded. It says nothing about whether the underlying data is correct or trustworthy.",
    concept: "HTTP status versus data quality",
    remedial: {
      slug: "http-apis-foundations",
      title: "HTTP basics: status codes, JSON, and response bodies",
    },
  },
  ifIncorrect: {
    key: "command-line-foundation",
    difficulty: "foundation",
    prompt: "What does `cd ..` do?",
    options: withNotSure([
      { value: "up", label: "Moves up one directory" },
      { value: "delete", label: "Deletes the parent folder" },
      { value: "list", label: "Lists all files" },
      { value: "python", label: "Runs the Python interpreter" },
    ]),
    correctOption: "up",
    explanation:
      ".. refers to the parent directory, so cd .. moves you up one level.",
    concept: "Relative paths",
    remedial: {
      slug: "command-line-foundations",
      title: "Command line basics: relative and absolute paths",
    },
  },
};

const automatedTesting: TechnicalProbe = {
  id: "automated-testing",
  section: "software-development",
  skillSlugs: ["automated-testing", "project-structure"],
  concept: "Testing and reading project structure",
  core: {
    key: "automated-testing-core",
    difficulty: "core",
    prompt: "What is the main purpose of an automated test?",
    options: withNotSure([
      {
        value: "behavior",
        label:
          "Check a specific expected behavior repeatedly without manual clicks",
      },
      {
        value: "click",
        label: "Replace every manual click-through in the product",
      },
      { value: "backup", label: "Create a production database backup" },
      { value: "index", label: "Speed up a database index" },
    ]),
    correctOption: "behavior",
    explanation:
      "A test encodes an expected behavior so it can be checked reproducibly as the code changes.",
    concept: "Tests as executable expectations",
    remedial: {
      slug: "automated-testing-foundations",
      title: "Testing basics: expectations, cases, and regressions",
    },
  },
  ifCorrect: {
    key: "automated-testing-application",
    difficulty: "application",
    prompt:
      "A test only asserts that calculate_total() returns a number. What is the main weakness?",
    options: withNotSure([
      {
        value: "weak",
        label: "It is too weak to detect a wrong total",
      },
      { value: "slow", label: "It is necessarily too slow" },
      { value: "files", label: "It uses too many files" },
      { value: "pass", label: "Tests should never pass" },
    ]),
    correctOption: "weak",
    explanation:
      "A test needs a meaningful expected value. Checking only the type will pass even when the calculation is wrong.",
    concept: "Assertions with meaningful expectations",
    remedial: {
      slug: "automated-testing-assertions",
      title: "Write tests that can fail: assertions and edge cases",
    },
  },
  ifIncorrect: {
    key: "automated-testing-foundation",
    difficulty: "foundation",
    prompt: "What does a README usually explain?",
    options: withNotSure([
      {
        value: "readme",
        label: "What the project does and how to run or test it",
      },
      { value: "compiler", label: "The compiler's source code" },
      { value: "password", label: "The user's password" },
      { value: "license", label: "Only the license text" },
    ]),
    correctOption: "readme",
    explanation:
      "Reading the README is usually the fastest way to understand a new project and find its setup and test commands.",
    concept: "Orienting yourself in a repository",
    remedial: {
      slug: "project-structure-foundations",
      title: "Read a new project: README, config, and test commands",
    },
  },
};

export const TECHNICAL_PROBES: readonly TechnicalProbe[] = [
  pythonBasics,
  pythonDebugging,
  problemSolving,
  sqlFiltering,
  sqlAggregation,
  sqlJoins,
  databaseDesign,
  descriptiveStatistics,
  dataCleaning,
  dataVisualization,
  gitGithub,
  commandLine,
  automatedTesting,
] as const;

export function getProbesForSection(section: TechnicalSection) {
  return TECHNICAL_PROBES.filter((probe) => probe.section === section);
}

export const CONFIDENCE_QUESTIONS: readonly ConfidenceQuestion[] = [
  {
    key: "confidence-programming",
    section: "programming",
    prompt: "How confident are you in your programming ability right now?",
    help: "Confidence is scored separately from demonstrated answers.",
    options: CONFIDENCE_OPTIONS,
  },
  {
    key: "confidence-sql",
    section: "sql",
    prompt: "How confident are you writing SQL queries right now?",
    help: "Confidence is scored separately from demonstrated answers.",
    options: CONFIDENCE_OPTIONS,
  },
  {
    key: "confidence-data-science",
    section: "data-science",
    prompt: "How confident are you with statistics and data analysis?",
    help: "Confidence is scored separately from demonstrated answers.",
    options: CONFIDENCE_OPTIONS,
  },
  {
    key: "confidence-software-development",
    section: "software-development",
    prompt: "How confident are you with Git, the terminal, and testing?",
    help: "Confidence is scored separately from demonstrated answers.",
    options: CONFIDENCE_OPTIONS,
  },
] as const;

export const INTEREST_OPTIONS: ReadonlyArray<{
  value: `${1 | 2 | 3 | 4 | 5}`;
  label: string;
}> = [
  { value: "1", label: "Not interested" },
  { value: "2", label: "Slightly interested" },
  { value: "3", label: "Moderately interested" },
  { value: "4", label: "Interested" },
  { value: "5", label: "Very interested" },
];

export const INTEREST_QUESTIONS: readonly InterestQuestion[] =
  (Object.keys(INTEREST_META) as Array<keyof typeof INTEREST_META>).map(
    (interest) => ({
      key: `interest-${interest}`,
      interest,
      prompt: INTEREST_META[interest].description,
    }),
  );

export const CAREER_STYLE_QUESTION: CareerChoiceQuestion = {
  key: "career-style",
  prompt: "Which working style sounds most energizing?",
  help: "Pick the one you would choose for a full afternoon of work.",
  options: [
    {
      value: "code",
      label: "Deep focus on code and systems",
      description: "Building, debugging, and improving technical systems.",
    },
    {
      value: "investigate",
      label: "Investigating ambiguous questions",
      description: "Exploring data and testing explanations.",
    },
    {
      value: "explain",
      label: "Explaining insights and influencing decisions",
      description: "Turning evidence into clear recommendations.",
    },
    {
      value: "design",
      label: "Designing reliable workflows and automation",
      description: "Making recurring work safer, faster, and more consistent.",
    },
  ],
};

export const CAREER_ACTIVITY_QUESTION: CareerChoiceQuestion = {
  key: "career-activity",
  prompt: "Which learning activity would you choose first?",
  help: "This is a preference signal, not a commitment.",
  options: [
    {
      value: "build-app",
      label: "Build a small working application",
    },
    {
      value: "analyze-dataset",
      label: "Analyze a dataset and present findings",
    },
    {
      value: "run-experiment",
      label: "Run an experiment and write it up",
    },
    {
      value: "automate-process",
      label: "Automate a repetitive process",
    },
  ],
};

export const CONSTRAINT_HOURS_QUESTION: ConstraintHoursQuestion = {
  key: "weekly-hours",
  prompt: "How many hours per week can you realistically study?",
  help:
    "Be conservative. This shapes how many minutes are scheduled each week; you can change it later.",
  min: 1,
  max: 60,
  defaultValue: 10,
};

export const CONSTRAINT_CHOICE_QUESTIONS: readonly ConstraintChoiceQuestion[] = [
  {
    key: "environment",
    prompt: "What kind of device and environment can you use?",
    help: "This helps the plan avoid assuming software you cannot install.",
    options: [
      {
        value: "personal-laptop",
        label: "Personal laptop where I can install software",
      },
      {
        value: "shared-computer",
        label: "Shared or lab computer with limited installs",
      },
      {
        value: "browser-only",
        label: "Tablet or browser-only device",
      },
      {
        value: "unsure",
        label: "Not sure yet",
      },
    ],
  },
  {
    key: "internet",
    prompt: "How reliable is your internet access for study?",
    help: "Resources and session lengths will be honest about what needs a connection.",
    options: [
      { value: "stable", label: "Stable enough for videos and downloads" },
      { value: "limited-data", label: "Limited data or metered connection" },
      { value: "unreliable", label: "Unreliable or intermittent connection" },
      { value: "offline", label: "Mostly offline" },
    ],
  },
  {
    key: "timeline",
    prompt: "When would you like to be ready for internships or applications?",
    help: "The 13-week plan does not promise an outcome; this only helps prioritise.",
    options: [
      { value: "under-3-months", label: "Within the next 3 months" },
      { value: "3-6-months", label: "In 3–6 months" },
      { value: "6-12-months", label: "In 6–12 months" },
      { value: "no-deadline", label: "No fixed deadline yet" },
    ],
  },
] as const;

export const CONSTRAINT_KEYS = [
  CONSTRAINT_HOURS_QUESTION.key,
  ...CONSTRAINT_CHOICE_QUESTIONS.map((question) => question.key),
] as const;

export const CAREER_KEYS = [
  ...INTEREST_QUESTIONS.map((question) => question.key),
  CAREER_STYLE_QUESTION.key,
  CAREER_ACTIVITY_QUESTION.key,
] as const;

export const CONFIDENCE_KEYS = CONFIDENCE_QUESTIONS.map(
  (question) => question.key,
);

export function getQuestionOptionLabel(
  options: readonly { value: string; label: string }[],
  value: string | undefined,
) {
  return options.find((option) => option.value === value)?.label ?? null;
}

export function getTechnicalQuestion(key: string): TechnicalQuestion | null {
  for (const probe of TECHNICAL_PROBES) {
    if (probe.core.key === key) return probe.core;
    if (probe.ifCorrect.key === key) return probe.ifCorrect;
    if (probe.ifIncorrect.key === key) return probe.ifIncorrect;
  }

  return null;
}
