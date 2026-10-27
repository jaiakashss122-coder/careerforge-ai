import type { CareerTrackSlug } from "@/lib/career/tracks";
import {
  INTERVIEW_TOPIC_META,
  INTERVIEW_TOPIC_ORDER,
  type InterviewQuestion,
  type InterviewTopic,
} from "@/lib/interview/types";

/**
 * Curated, not generated. Every prompt is one an interviewer actually asks, and
 * `goodAnswerCovers` states what the answer has to contain before this app treats
 * it as answered — so a learner is grading themselves against a written standard
 * rather than against a feeling.
 */
export const INTERVIEW_QUESTIONS: readonly InterviewQuestion[] = [
  {
    id: "python-mutable-default",
    topic: "python",
    prompt:
      "A function is defined as def add(item, bucket=[]) and it appends to bucket. What goes wrong, and how do you fix it?",
    goodAnswerCovers: [
      "The default list is created once when the function is defined, so every call that skips the argument shares the same list.",
      "The fix is a default of None with a new list built inside the body, or passing the list in explicitly.",
      "It can name the symptom: results from an earlier call show up in a later one.",
    ],
    followUps: [
      "Where else does this same sharing behaviour appear in Python?",
      "How would you catch this in a test before it reaches anyone else?",
    ],
    skills: ["python-basics", "python-debugging", "automated-testing"],
    askedWhy:
      "It separates people who have read Python's behaviour from people who have only written code that happened to work.",
  },
  {
    id: "python-read-traceback",
    topic: "python",
    prompt:
      "A script fails with a KeyError inside a loop that reads a dictionary. Walk through how you find the cause.",
    goodAnswerCovers: [
      "Read the traceback from the bottom up and find the first line that is in your own code.",
      "Print or inspect the key and the dictionary at that point instead of guessing.",
      "Decide whether the key is genuinely missing or the wrong type, then handle it — .get(), a default, or an earlier validation.",
    ],
    followUps: [
      "What do you do when the traceback points into a library you did not write?",
      "How would you make this failure readable next time it happens?",
    ],
    skills: ["python-debugging", "python-basics", "problem-solving"],
    askedWhy:
      "Most of the job is unblocking yourself, and how you do that says more than syntax does.",
  },
  {
    id: "python-list-vs-generator",
    topic: "python",
    prompt:
      "You are told to build a list of 10 million rows in memory. When would you not use a list?",
    goodAnswerCovers: [
      "When the rows only need to be consumed one at a time, a generator streams them without holding all 10 million.",
      "It gives up re-use and random access, because a generator is spent once walked through.",
      "It names what it would check first: how much memory is available and whether the rows get read more than once.",
    ],
    followUps: [
      "What changes if two different parts of the program need those rows?",
      "How do you measure whether the swap actually helped?",
    ],
    skills: ["python-basics", "problem-solving"],
    askedWhy:
      "Data work runs out of memory long before it runs out of patience, and this is the first lever.",
  },
  {
    id: "python-pandas-merge-drop",
    topic: "python",
    prompt:
      "You merge two tables and the row count goes up. What are the possible reasons, and how do you check?",
    goodAnswerCovers: [
      "The join key is not unique on at least one side, so rows multiply.",
      "Check by counting duplicates per key before joining, and compare counts per side after.",
      "It offers a decision: aggregate one side first, or keep the duplication deliberately and say why.",
    ],
    followUps: [
      "What if the row count goes down instead?",
      "How do you explain a doubled row count to someone reading your report?",
    ],
    skills: ["pandas", "data-cleaning", "sql-joins"],
    askedWhy:
      "Silent row-count changes are how wrong numbers reach decision makers.",
  },
  {
    id: "python-None-vs-empty",
    topic: "python",
    prompt:
      "Explain the difference between None, an empty list, and a list containing one None. When does each appear in real data work?",
    goodAnswerCovers: [
      "None means no value at all; an empty list is a real list with nothing in it; [None] has one element that happens to be missing.",
      "In loaded data, a missing cell usually becomes None or NaN, while an empty collection means the query returned nothing.",
      "It mentions that testing `if values:` treats both None and [] the same, which hides the difference.",
    ],
    followUps: [
      "How does that difference change the summary you report?",
      "How do you keep it from changing your answer silently?",
    ],
    skills: ["python-basics", "data-cleaning", "descriptive-statistics"],
    askedWhy:
      "Missing data is the normal case, and confusing these two produces wrong totals.",
  },
  {
    id: "python-sorted-stability",
    topic: "python",
    prompt:
      "You sort records by score, then by name. Does sorting twice in a row give the same result as sorting by both keys at once?",
    goodAnswerCovers: [
      "Yes when the sorts are stable, because Python's sort keeps the earlier order for equal keys.",
      "So sorting by name first and then by score gives name order inside each score.",
      "It can say what would break this: a sort that is not stable, or sorting only part of the records.",
    ],
    followUps: [
      "How would you write it so the intent is obvious to the next reader?",
      "What changes if two records have the same score and the same name?",
    ],
    skills: ["python-basics", "project-structure", "technical-communication"],
    askedWhy:
      "It tests whether you reason about a familiar tool instead of memorising its syntax.",
  },
  {
    id: "python-virtualenv",
    topic: "python",
    prompt:
      "Someone says “it works on my machine” about a Python script. What do you ask, and what do you check?",
    goodAnswerCovers: [
      "Which Python version and which installed package versions, because both change behaviour.",
      "An environment file with exact versions, or a container, so the setup is reproducible rather than remembered.",
      "Runs the script from a clean checkout in a fresh environment to see what breaks.",
    ],
    followUps: [
      "How would you make this runnable by someone who cannot install anything?",
      "What goes in the file that records the dependencies?",
    ],
    skills: ["python-basics", "command-line", "project-structure", "git-github"],
    askedWhy:
      "Everything you build gets run by someone else eventually, and usually on a machine you have never seen.",
  },
  {
    id: "python-comprehension-readability",
    topic: "python",
    prompt:
      "Rewrite in words what this does: result = [k for k, v in counts.items() if v > threshold]. Would you keep it?",
    goodAnswerCovers: [
      "It takes the keys whose value is above the threshold, as a list.",
      "Whether to keep it depends on how much more is stacked on one line — a reader has to decode it later.",
      "Suggests a named variable or a loop when the line grows a second condition.",
    ],
    followUps: [
      "How would you change it to return the same result as a dictionary?",
      "Who reads this code next, and what do they need?",
    ],
    skills: ["python-basics", "technical-communication", "project-structure"],
    askedWhy:
      "Writing code a teammate can read is part of the job, not a separate courtesy.",
  },
  {
    id: "sql-group-by-select",
    topic: "sql",
    prompt:
      "Why does SELECT name, score FROM results ORDER BY score DESC without GROUP BY sometimes return every row when you wanted one row per name?",
    goodAnswerCovers: [
      "No aggregation was asked for, so every matching row comes back.",
      "One row per name needs either GROUP BY with an aggregate or a window function plus a filter.",
      "It can say why ORDER BY alone cannot collapse rows.",
    ],
    followUps: [
      "Write the version that keeps the highest score per name.",
      "What does the query return when a name has two rows tied at the top?",
    ],
    skills: ["sql-aggregation", "sql-filtering"],
    askedWhy:
      "The gap between “rows I have” and “rows I meant” is where most wrong numbers start.",
  },
  {
    id: "sql-having-vs-where",
    topic: "sql",
    prompt:
      "Explain the difference between WHERE and HAVING, with an example that needs HAVING.",
    goodAnswerCovers: [
      "WHERE filters rows before grouping; HAVING filters the groups after aggregation.",
      "An example that only exists after aggregating, such as customers with more than ten orders.",
      "Mentions that aggregate functions are not allowed in WHERE.",
    ],
    followUps: [
      "Can a query use both? Give the shape.",
      "How does the database decide which to run first?",
    ],
    skills: ["sql-aggregation", "sql-filtering"],
    askedWhy:
      "It is the most common reason a first attempt at grouping errors out or returns the wrong count.",
  },
  {
    id: "sql-left-join-null",
    topic: "sql",
    prompt:
      "You LEFT JOIN orders to customers and then filter on a column from customers. What silently changes?",
    goodAnswerCovers: [
      "A filter in WHERE on the joined table removes the rows with no match, turning the LEFT JOIN into an inner join.",
      "Keeping the unmatched rows means moving the condition into the ON clause or testing IS NULL.",
      "It gives a way to see it happening: the row count falls to the matched set.",
    ],
    followUps: [
      "Write the version that lists customers with no orders.",
      "When would losing those rows actually be what you wanted?",
    ],
    skills: ["sql-joins", "sql-filtering"],
    askedWhy:
      "This specific mistake hides well, because the query still runs and still returns sensible-looking numbers.",
  },
  {
    id: "sql-distinct-count",
    topic: "sql",
    prompt:
      "What is the difference between COUNT(*), COUNT(column), and COUNT(DISTINCT column)?",
    goodAnswerCovers: [
      "COUNT(*) counts rows; COUNT(column) skips NULLs in that column; COUNT(DISTINCT column) counts unique non-null values.",
      "The gap between the first two is the number of missing values.",
      "It names which one answers “how many customers” versus “how many orders”.",
    ],
    followUps: [
      "How do you find out how many rows have a missing value?",
      "What happens to a grouped count when every value in the group is NULL?",
    ],
    skills: ["sql-aggregation", "data-cleaning"],
    askedWhy:
      "Counting is the first aggregate anyone writes, and the three versions answer three different questions.",
  },
  {
    id: "sql-window-running-total",
    topic: "sql",
    prompt:
      "Write the idea, not the syntax, behind a running total per customer ordered by date.",
    goodAnswerCovers: [
      "A window function that partitions by customer, orders by date, and aggregates over the rows up to the current one.",
      "The window gives the running total without collapsing the rows the way GROUP BY would.",
      "Mentions what the frame matters for: whether today's rows are all included.",
    ],
    followUps: [
      "How do you make it reset at each new year?",
      "What does it cost compared with a self join?",
    ],
    skills: ["sql-aggregation", "sql-joins", "problem-solving"],
    askedWhy:
      "Running totals, ranks and “same as previous row” questions come up in almost every analytics interview.",
  },
  {
    id: "sql-subquery-vs-join",
    topic: "sql",
    prompt:
      "When would you use a subquery instead of a join, and what is the risk?",
    goodAnswerCovers: [
      "A subquery fits when you need a value per row or a membership test before the main query aggregates.",
      "The risk is running one query per row, which can get slow, and a subquery that returns more than one row failing outright.",
      "It says how it would check: read the plan, or run both and compare the results, not just the speed.",
    ],
    followUps: [
      "How would you rewrite it as a join?",
      "What does the database do if the inner query returns nothing?",
    ],
    skills: ["sql-subqueries", "sql-joins", "database-design"],
    askedWhy:
      "Both get the answer; the question is whether you know what each costs.",
  },
  {
    id: "sql-index-choice",
    topic: "sql",
    prompt:
      "A query that filters on a status column and sorts by created_at is slow. What do you consider before adding an index?",
    goodAnswerCovers: [
      "How many rows actually match the filter, because an index on a column that is nearly constant helps little.",
      "Whether the index would cover both the filter and the sort, and the cost of keeping it updated on writes.",
      "Measuring first: read the current plan or time the query, then re-check after.",
    ],
    followUps: [
      "What if the table is written to constantly?",
      "How would you know the index made things worse?",
    ],
    skills: ["database-design", "sql-filtering"],
    askedWhy:
      "Knowing the answer to “just add an index” is no, sometimes, tells them you have run one before.",
  },
  {
    id: "sql-null-three-valued",
    topic: "sql",
    prompt:
      "WHERE score <> 100 returns fewer rows than you expected. What is the likely reason?",
    goodAnswerCovers: [
      "Comparisons with NULL are neither true nor false, so rows with a missing score are excluded.",
      "The fix is an explicit IS NULL branch, or a default with COALESCE.",
      "It mentions checking the count of NULLs to see how many rows that explains.",
    ],
    followUps: [
      "Does the same happen with NOT IN on a list that contains NULL?",
      "How do you report the number of missing scores alongside the answer?",
    ],
    skills: ["sql-filtering", "data-cleaning"],
    askedWhy:
      "Three-valued logic is the quietest way to lose rows, and interviewers use it as a check.",
  },
  {
    id: "stats-average-choice",
    topic: "statistics",
    prompt:
      "You are asked for the typical salary in a team of 12 where one person earns far more than the rest. Which number do you report and why?",
    goodAnswerCovers: [
      "The median, because one extreme value drags the mean and the median reports the middle of the group.",
      "It states what the mean still tells you: the total divided by the count.",
      "It reports both, or says what it would look at next: how skewed the rest of the values are.",
    ],
    followUps: [
      "What if the goal is to report total cost?",
      "How would you show the spread alongside the typical value?",
    ],
    skills: ["descriptive-statistics", "data-distributions", "business-insights"],
    askedWhy:
      "Reporting a single number for a group is the most common way a correct calculation misleads someone.",
  },
  {
    id: "stats-correlation-causation",
    topic: "statistics",
    prompt:
      "Ice cream sales and drownings rise together. Explain why that is not a cause, and how you would look for the real driver.",
    goodAnswerCovers: [
      "Both rise with a third factor — summer — so the correlation is not a causal link between them.",
      "Look for a variable that moves both, and compare within one condition, such as drowning rates by temperature.",
      "Says what would change its mind: a comparison that holds the shared factor fixed.",
    ],
    followUps: [
      "Can a correlation still be useful for prediction without being causal?",
      "Give an example from your own work where the obvious cause was not the cause.",
    ],
    skills: ["hypothesis-testing", "exploratory-analysis", "business-insights"],
    askedWhy:
      "Anyone can compute a correlation; the job is knowing what it does not license you to say.",
  },
  {
    id: "stats-p-value",
    topic: "statistics",
    prompt:
      "A test returns p = 0.03. Say, in plain words, what that number does and does not mean.",
    goodAnswerCovers: [
      "If the null assumption were true, a result at least this extreme would happen about 3 runs in 100.",
      "It is not the chance the null hypothesis is true, and it does not measure how big or useful the effect is.",
      "Mentions sample size: a large enough sample makes a trivial difference reach the usual cutoff.",
    ],
    followUps: [
      "What would you report alongside it?",
      "What changes if you ran nine more tests and only this one crossed the line?",
    ],
    skills: ["hypothesis-testing", "probability"],
    askedWhy:
      "Misreading this number ends arguments and ships changes that do nothing.",
  },
  {
    id: "stats-sampling-bias",
    topic: "statistics",
    prompt:
      "You survey users who replied to an email and 70% say they are satisfied. What is wrong with that number?",
    goodAnswerCovers: [
      "It only counts people who were engaged enough to reply, so dissatisfied users are missing from the frame.",
      "The reported figure should say what share of the whole group replied, not just what share of replies were positive.",
      "Suggests a better design: random sample of all users, or reporting the response rate next to the result.",
    ],
    followUps: [
      "How would you estimate the effect of the missing respondents?",
      "What would you write in the report so a reader cannot misuse the number?",
    ],
    skills: ["probability", "hypothesis-testing", "technical-communication"],
    askedWhy:
      "Most real data is gathered by whoever bothered to respond, and that shapes the answer.",
  },
  {
    id: "stats-distribution-shape",
    topic: "statistics",
    prompt:
      "Why does it matter whether a column is roughly symmetric or has a long tail before you compute an average?",
    goodAnswerCovers: [
      "A long tail pulls the mean away from where most values are, so the average describes almost nothing.",
      "It would plot or bucket first and then choose the summary, for example median plus percentiles for a skewed column.",
      "Names what it would also report: the spread and how many values sit at or near zero.",
    ],
    followUps: [
      "Which two numbers would you report for a skewed column?",
      "What if most values are zero and a few are huge?",
    ],
    skills: ["data-distributions", "descriptive-statistics", "exploratory-analysis"],
    askedWhy:
      "It checks whether you look at data before summarising it, which is most of the craft.",
  },
  {
    id: "stats-confidence-interval",
    topic: "statistics",
    prompt:
      "A conversion rate is 2.4% with a 95% interval from 1.9% to 2.9%. What can you say to a manager, and what can't you say?",
    goodAnswerCovers: [
      "The estimate is 2.4%, and values as low as 1.9% or as high as 2.9% are consistent with this data.",
      "You cannot claim the true rate is inside that interval with 95% probability, and you cannot say a change worked if a comparison overlaps it.",
      "Would check how much the interval moved and whether the decision it supports depends on that movement.",
    ],
    followUps: [
      "What would narrow the interval?",
      "The manager wants to know if it beats last month's 2.0%. How do you answer?",
    ],
    skills: ["hypothesis-testing", "descriptive-statistics", "business-insights"],
    askedWhy:
      "Stakeholders hear a range as a weakness; explaining what the range is for is part of the role.",
  },
  {
    id: "ml-overfit-explain",
    topic: "machine-learning",
    prompt:
      "Explain overfitting to someone who has never trained a model, then say how you would detect it in your own work.",
    goodAnswerCovers: [
      "The model has memorised the examples it saw instead of the pattern, so it does well on them and badly on anything new.",
      "Detection is a comparison: the score on data held out of training falls far short of the score on training data.",
      "It names what would change: fewer features, a simpler model, more data, or stronger regularisation.",
    ],
    followUps: [
      "What does it look like when the model is underfitting instead?",
      "How do you keep the test set honest?",
    ],
    skills: ["ml-fundamentals", "model-evaluation", "scikit-learn"],
    askedWhy:
      "Everyone trains a model; the skill is knowing when the number you got is not real.",
  },
  {
    id: "ml-metric-choice",
    topic: "machine-learning",
    prompt:
      "A spam filter catches 95% of spam but blocks one in twenty legitimate emails. Is that a good model?",
    goodAnswerCovers: [
      "Depends on the cost of each error: missing spam is annoying, blocking a real email can be serious.",
      "It would look at precision and recall, not accuracy, and at what the 95% is measured against when spam is rare.",
      "Suggests a threshold change or a review step for borderline cases, and asks who decides the trade-off.",
    ],
    followUps: [
      "Which metric would you put in front of the team, and why that one?",
      "What does a baseline of “mark everything as spam” score on it?",
    ],
    skills: ["model-evaluation", "classification", "business-insights"],
    askedWhy:
      "Metric choice is a product decision wearing a technical hat.",
  },
  {
    id: "ml-leakage",
    topic: "machine-learning",
    prompt:
      "Your model scores 99% in cross-validation and falls apart in production. List what you would check first.",
    goodAnswerCovers: [
      "Leakage: a feature that contains the answer, or preprocessing fitted on all the data before splitting.",
      "Whether production rows are built the same way as training rows, including missing-value handling and timestamps.",
      "Whether the split respected time or groups, so the model never saw a later version of the same entity.",
    ],
    followUps: [
      "How would you prove leakage is happening?",
      "What would you change in the pipeline so this cannot recur?",
    ],
    skills: ["ml-fundamentals", "feature-engineering", "model-evaluation", "data-cleaning"],
    askedWhy:
      "A score this good is itself the warning sign, and knowing that is the difference between shipping a bug and shipping a model.",
  },
  {
    id: "ml-imbalanced-classes",
    topic: "machine-learning",
    prompt:
      "Only 1 in 200 transactions is fraudulent. A model that predicts “no” every time is 99.5% accurate. What do you do about that?",
    goodAnswerCovers: [
      "Stop using accuracy as the score, because the trivial answer already wins on it.",
      "Choose metrics that look at the rare class — recall, precision, or the area under a curve built for imbalance — and set them against the cost of each error.",
      "It mentions what it would try: reweighting, resampling, or a threshold moved after training, and how it would validate each one.",
    ],
    followUps: [
      "How many alerts can the review team actually handle?",
      "What is your baseline for comparison?",
    ],
    skills: ["classification", "model-evaluation", "ml-fundamentals"],
    askedWhy:
      "Imbalance is the normal case in real data, and this is how you show you have met it.",
  },
  {
    id: "ml-feature-engineering",
    topic: "machine-learning",
    prompt:
      "You have a timestamped event log and need a feature that predicts whether a customer churns next month. Give one and defend it.",
    goodAnswerCovers: [
      "Something like the change in activity over the last 30 days, or the gap since the last event — not the raw date.",
      "The defence is that it is computable from data available before the outcome, so it is not the answer wearing a disguise.",
      "It says how it would test the idea: compare it with a simpler feature and check the score does not depend on future rows.",
    ],
    followUps: [
      "What would make this feature leak the outcome?",
      "How do you handle a customer with only two events?",
    ],
    skills: ["feature-engineering", "data-cleaning", "ml-fundamentals"],
    askedWhy:
      "Turning raw data into something a model can use is where most of the value is added.",
  },
  {
    id: "ml-baseline",
    topic: "machine-learning",
    prompt:
      "Before training anything, what do you want to know about how well you could do without a model?",
    goodAnswerCovers: [
      "The baseline: predict the majority class, the previous value, or the mean, and measure that score.",
      "A model that does not beat the baseline is not earning its complexity.",
      "It gives a concrete example of a baseline that beats a weak model, such as a recent-value rule in a time series.",
    ],
    followUps: [
      "What if the baseline is already good enough?",
      "How do you present that finding to someone who wants a model?",
    ],
    skills: ["model-evaluation", "ml-fundamentals", "regression", "business-insights"],
    askedWhy:
      "Knowing when not to build is the cheapest senior habit there is.",
  },
  {
    id: "ml-regression-assumptions",
    topic: "machine-learning",
    prompt:
      "You fit a linear model and someone asks whether you can trust the coefficient. What do you look at?",
    goodAnswerCovers: [
      "Residuals — whether the leftover error is patterned, and whether a few points are doing all the work.",
      "How wide the interval around the coefficient is, and whether the inputs are correlated with each other.",
      "Says plainly that the coefficient only means “holding the other inputs fixed”, which is not always a real situation.",
    ],
    followUps: [
      "What changes if two inputs measure nearly the same thing?",
      "Would you still report the coefficient if the relationship curved?",
    ],
    skills: ["regression", "model-evaluation", "hypothesis-testing"],
    askedWhy:
      "Plenty of people can fit a line; the question is whether you know what the line is claiming.",
  },
  {
    id: "beh-conflict",
    topic: "behavioural",
    prompt:
      "Tell me about a time you disagreed with a teammate about how to do something. What happened?",
    goodAnswerCovers: [
      "A real situation with the disagreement named, not a story where everyone agreed eventually.",
      "What you did: what evidence you brought, what you were willing to give up, and how the decision was made.",
      "The outcome, including what you would do differently — the part people leave out.",
    ],
    followUps: [
      "What did the other person think of your position?",
      "Have you been wrong about something like this since?",
    ],
    skills: ["technical-communication", "problem-solving", "interview-readiness"],
    askedWhy:
      "You will disagree with people in this job. They want to know whether it stays useful.",
  },
  {
    id: "beh-mistake",
    topic: "behavioural",
    prompt:
      "Describe a mistake you made in your own work that cost someone time. What did you change afterwards?",
    goodAnswerCovers: [
      "An actual mistake you own, with what it cost and who found out.",
      "The fix you made, not the excuse — a check, a test, a note, a different habit.",
      "What has been different since, concretely.",
    ],
    followUps: [
      "How did you tell the person affected?",
      "Would you have caught it earlier with a different process?",
    ],
    skills: ["automated-testing", "technical-communication", "interview-readiness"],
    askedWhy:
      "Everyone ships a bug. What is being asked is whether you learn from it or hide it.",
  },
  {
    id: "beh-ambiguity",
    topic: "behavioural",
    prompt:
      "You are asked for an analysis by Friday and the request is unclear. What do you do first?",
    goodAnswerCovers: [
      "Asks the question that changes the work: what decision this feeds and who reads it.",
      "States an assumption in writing and continues, rather than waiting for a reply that may not come.",
      "Offers a smaller first version that can be checked, so the rest of the week is not spent on the wrong thing.",
    ],
    followUps: [
      "What if the person who can answer is on leave?",
      "How do you protect the deadline if the answer arrives late?",
    ],
    skills: ["business-insights", "technical-communication", "problem-solving"],
    askedWhy:
      "Almost every real request is unclear. They want to see how you turn it into something answerable.",
  },
  {
    id: "beh-explain-nontechnical",
    topic: "behavioural",
    prompt:
      "Explain something technical you have worked on to someone with no technical background. Take a minute.",
    goodAnswerCovers: [
      "Starts with what the person cares about, then the mechanism, with no unexplained abbreviation.",
      "Uses one concrete comparison and stops while it still makes sense.",
      "Checks understanding instead of assuming it, and can say what it left out.",
    ],
    followUps: [
      "What would you add if the audience were a manager deciding on budget?",
      "How do you handle being asked a question you cannot answer?",
    ],
    skills: ["technical-communication", "business-insights", "interview-readiness"],
    askedWhy:
      "The output of this job is read by people who did not build it.",
  },
  {
    id: "beh-own-work",
    topic: "behavioural",
    prompt:
      "Pick one thing on your CV and walk me through your exact contribution, line by line if needed.",
    goodAnswerCovers: [
      "Names what you personally did, and what someone else did, without blurring the two.",
      "Gives the decisions you made and the ones you did not get to make.",
      "Says what you would change now, which is the part that proves you were paying attention.",
    ],
    followUps: [
      "What would your teammate say your weakest part of that work was?",
      "How do you know it worked?",
    ],
    skills: ["interview-readiness", "project-structure", "technical-communication"],
    askedWhy:
      "Interviewers use this to separate what you joined from what you built — and this app only lists work you have evidence for.",
  },
  {
    id: "role-analyst-metric-definition",
    topic: "role-specific",
    prompt:
      "A dashboard says “active users are up 12%”. Before you celebrate, what do you ask about the definition?",
    goodAnswerCovers: [
      "What counts as active, over what window, and whether that definition changed between the two periods.",
      "Whether the denominator moved, such as a traffic increase lifting the percentage while the count is flat.",
      "It names the comparison it would run before repeating the number anywhere.",
    ],
    followUps: [
      "How would you document the definition so this argument does not recur?",
      "The number is right but the decision it supports is wrong. How do you raise that?",
    ],
    skills: ["business-insights", "descriptive-statistics", "sql-aggregation", "technical-communication"],
    tracks: ["data-analyst", "business-intelligence-analyst"],
    askedWhy:
      "An analyst's first value is stopping a badly defined number from becoming a decision.",
  },
  {
    id: "role-analyst-stakeholder-request",
    topic: "role-specific",
    prompt:
      "A stakeholder asks for “the numbers by region, by month, and by product”. What do you build?",
    goodAnswerCovers: [
      "Checks which of the three cuts actually gets used, because a full cross-tab of them is unreadable.",
      "Proposes the small version that answers the underlying question, and says what it would cost to add the rest.",
      "Agrees the filter, the period and the one number to lead with before building anything.",
    ],
    followUps: [
      "They insist on all three. What now?",
      "How do you know the report is being used?",
    ],
    skills: ["business-insights", "data-visualization", "technical-communication"],
    tracks: ["data-analyst", "business-intelligence-analyst"],
    askedWhy:
      "Requests arrive as a list of columns; the job is to find the question behind them.",
  },
  {
    id: "role-scientist-question-to-model",
    topic: "role-specific",
    prompt:
      "You are asked to “predict which customers will churn”. Turn that into something you could actually test.",
    goodAnswerCovers: [
      "Defines churn, the window, and which customers are in scope — an account with no activity for 60 days is a different target than a cancel button.",
      "Names the label's date so the features can only use data available before it.",
      "Says what it would compare against and what the output is used for, because a score nobody acts on is not a model.",
    ],
    followUps: [
      "What if half the customers never had a chance to churn?",
      "What would you do before modelling, using only a mean and a chart?",
    ],
    skills: ["ml-fundamentals", "hypothesis-testing", "exploratory-analysis", "business-insights"],
    tracks: ["data-scientist"],
    askedWhy:
      "The gap between a business sentence and a testable question is the actual work.",
  },
  {
    id: "role-engineer-pipeline-failure",
    topic: "role-specific",
    prompt:
      "A nightly job that loads a table finished with zero rows and no error. What do you do?",
    goodAnswerCovers: [
      "Treats “no error” as not evidence of success, and checks the upstream file or API first.",
      "Adds a real assertion — a row-count floor, a schema check — so the job fails loudly next time.",
      "Backfills or flags downstream consumers, and says who needs to know before the morning report runs.",
    ],
    followUps: [
      "How do you stop a partial load from looking like an empty one?",
      "What alert would have caught this at 2am instead of 9am?",
    ],
    skills: ["data-cleaning", "http-apis", "automated-testing", "command-line"],
    tracks: ["data-engineer"],
    askedWhy:
      "Data platforms fail quietly more often than loudly, and a silent empty load becomes a wrong board meeting.",
  },
  {
    id: "role-mlops-deploy",
    topic: "role-specific",
    prompt:
      "A model is approved and you have to put it behind an API. What is in your checklist?",
    goodAnswerCovers: [
      "The same feature computation used at training, or the score means nothing; how the model file and its version are recorded.",
      "Latency and memory limits, an error path for missing input, and a way to roll back.",
      "Monitoring for drift and for the score distribution changing, with an alert that someone actually owns.",
    ],
    followUps: [
      "How do you test the served version against the notebook version?",
      "What happens when the upstream data schema changes?",
    ],
    skills: ["http-apis", "model-evaluation", "project-structure", "git-github", "automated-testing"],
    tracks: ["mlops-engineer", "machine-learning-engineer"],
    askedWhy:
      "A model that only runs on one laptop has not shipped, and this is where that becomes obvious.",
  },
  {
    id: "role-ai-app-eval",
    topic: "role-specific",
    prompt:
      "You built a retrieval assistant. A user says it “makes things up”. How do you find out how often, and what you would change?",
    goodAnswerCovers: [
      "A set of questions with known answers or known-absent answers, run against the system, so the rate is a number rather than an impression.",
      "Distinguishes the failure kinds: nothing retrieved, wrong passage retrieved, retrieved but ignored in the answer.",
      "It changes one thing at a time — chunking, retrieval, prompt, or a refusal path — and re-runs the same set.",
    ],
    followUps: [
      "How do you catch a regression before the next release?",
      "What should the assistant say when it has nothing to cite?",
    ],
    skills: ["retrieval-augmented-generation", "ai-evaluation", "llm-applications", "prompt-engineering"],
    tracks: ["applied-ai-engineer", "generative-ai-engineer"],
    askedWhy:
      "Anyone can demo a chatbot. The role is being able to say how often it is wrong and what fixed it.",
  },
  {
    id: "role-automation-agent-design",
    topic: "role-specific",
    prompt:
      "A team wants an agent that books meetings and files reports on their behalf. Where do you put the boundaries?",
    goodAnswerCovers: [
      "Names the actions that must not be automatic — spending money, deleting, messaging people — and keeps them behind a confirmation.",
      "Limits the tools and the data the agent can reach, and logs every action with what it was asked to do.",
      "Says what happens when it goes wrong and who can stop it mid-run.",
    ],
    followUps: [
      "How do you test it before it touches real accounts?",
      "What does the team need to see to trust it a month from now?",
    ],
    skills: ["ai-agents", "http-apis", "ai-evaluation", "technical-communication"],
    tracks: ["ai-automation-engineer"],
    askedWhy:
      "Agent work is mostly deciding what the agent must not be trusted to do alone.",
  },
  {
    id: "role-general-tradeoff",
    topic: "role-specific",
    prompt:
      "Take a decision you made in a project here and defend it against the option you rejected.",
    goodAnswerCovers: [
      "States both options in the same terms, including the one that was cheaper or faster.",
      "Names what it was optimising for — time, correctness, someone else's ability to read it — and what it gave up.",
      "Says what would make it reverse the decision.",
    ],
    followUps: [
      "Who disagreed, and what did they want instead?",
      "Would you make the same call under a deadline?",
    ],
    skills: ["project-structure", "problem-solving", "technical-communication", "interview-readiness"],
    tracks: [
      "data-analyst",
      "business-intelligence-analyst",
      "data-scientist",
      "machine-learning-engineer",
      "applied-ai-engineer",
      "generative-ai-engineer",
      "data-engineer",
      "mlops-engineer",
      "ai-automation-engineer",
    ],
    askedWhy:
      "Every role in this field is a sequence of trade-offs, and the interview is about whether you chose them or inherited them.",
  },
];

export const INTERVIEW_QUESTION_BY_ID = new Map(
  INTERVIEW_QUESTIONS.map((question) => [question.id, question]),
);

export function getInterviewQuestion(id: string): InterviewQuestion | null {
  return INTERVIEW_QUESTION_BY_ID.get(id) ?? null;
}

export function listQuestionsForTopic(topic: InterviewTopic) {
  return INTERVIEW_QUESTIONS.filter((question) => question.topic === topic);
}

export function listQuestionsForTrack(track: CareerTrackSlug) {
  return INTERVIEW_QUESTIONS.filter(
    (question) => question.tracks?.includes(track) ?? false,
  );
}

export function countQuestionsForTopic(topic: InterviewTopic): number {
  return listQuestionsForTopic(topic).length;
}

export const INTERVIEW_TOPIC_SUMMARY = INTERVIEW_TOPIC_ORDER.map((topic) => ({
  topic,
  label: INTERVIEW_TOPIC_META[topic].label,
  whatItProbes: INTERVIEW_TOPIC_META[topic].whatItProbes,
  count: countQuestionsForTopic(topic),
}));

export const INTERVIEW_BANK_DISCLAIMER =
  "These prompts are written by this app from questions that are commonly asked, not leaked from any company's interview. The listed points say what an answer needs to contain for this app to record it as answered; they are not a company's marking scheme, and no interviewer is obliged to agree with them.";

export const INTERVIEW_EVIDENCE_RULE =
  "An interview attempt records no evidence on its own. A completed mock interview writes one unverified interview result for each skill you marked “answered it”, and only for the questions whose skills are in this app's catalogue.";
