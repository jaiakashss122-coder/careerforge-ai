import { getTrackExperimentBrief } from "@/lib/assessment/career-fit";
import type { CareerTrackSlug } from "@/lib/career/tracks";

export const CAREER_EXPERIMENT_KINDS = [
  "analytics",
  "data-science",
  "ai-applications",
  "data-engineering",
  "ml-engineering",
] as const;

export type CareerExperimentKind =
  (typeof CAREER_EXPERIMENT_KINDS)[number];

export type CareerExperimentKindMeta = {
  slug: CareerExperimentKind;
  label: string;
  description: string;
};

export const CAREER_EXPERIMENT_KIND_META: Record<
  CareerExperimentKind,
  CareerExperimentKindMeta
> = {
  analytics: {
    slug: "analytics",
    label: "Analytics",
    description:
      "You answer questions by querying data that already exists, then explain what it means to someone who has to decide something.",
  },
  "data-science": {
    slug: "data-science",
    label: "Data science",
    description:
      "You turn a vague question into something measurable, test a model against data, and report honestly about how far it can be trusted.",
  },
  "ai-applications": {
    slug: "ai-applications",
    label: "AI applications",
    description:
      "You build something usable on top of a model, which means checking the output, costing it, and handling the cases where it is wrong.",
  },
  "data-engineering": {
    slug: "data-engineering",
    label: "Data engineering",
    description:
      "You move and shape data so other people can rely on it, and you check the result instead of hoping it worked.",
  },
  "ml-engineering": {
    slug: "ml-engineering",
    label: "Machine learning engineering",
    description:
      "You take a model out of a notebook and into software that other people run, with tests, inputs it rejects, and a log you can read back.",
  },
};

export type CareerExperimentDefinition = {
  kind: CareerExperimentKind;
  careerSlug: CareerTrackSlug;
  title: string;
  brief: string;
  steps: readonly string[];
  observe: readonly string[];
  output: string;
  estimatedMinutes: number;
};

export const CAREER_EXPERIMENTS: readonly CareerExperimentDefinition[] = [
  {
    kind: "analytics",
    careerSlug: "data-analyst",
    title: "Answer three questions about data that already exists",
    brief: getTrackExperimentBrief("data-analyst"),
    steps: [
      "Pick a table you can legally read: your own card or bank export, a public dataset, or a small sample from a database course.",
      "Write three questions a manager would actually ask, each answerable with one number or one chart.",
      "Answer each one in SQL or in Python, and save the query or notebook you used.",
      "Write the findings on one page: the answer first, then how you got it, then what the data cannot tell you.",
    ],
    observe: [
      "Whether writing the question felt natural, or whether you only felt comfortable once the query was running.",
      "How you reacted when the number contradicted what you expected.",
      "Whether the one-page write-up felt like the real work or a chore after the real work.",
    ],
    output:
      "One page of findings plus the query or notebook that produced them, in a place you can link.",
    estimatedMinutes: 150,
  },
  {
    kind: "analytics",
    careerSlug: "business-intelligence-analyst",
    title: "Define the numbers a small business should watch",
    brief: getTrackExperimentBrief("business-intelligence-analyst"),
    steps: [
      "Choose one business you can describe concretely: a shop, a subscription app, a delivery service.",
      "Write five metrics that someone would check weekly to decide something, and say what each one would change if it moved.",
      "For each metric, note the exact definition, the source of the number, and what makes it misleading.",
      "Sketch the report: which five charts go on the first screen, and what question each one answers.",
    ],
    observe: [
      "Whether you cared about the definition being agreed, or only about the chart looking right.",
      "How often you had to change a metric because it could not be measured from any real source.",
      "Whether designing for an audience who will argue with the number felt motivating or exhausting.",
    ],
    output:
      "A metric definition list and a report sketch, written so a stranger could rebuild it from the same data.",
    estimatedMinutes: 120,
  },
  {
    kind: "data-science",
    careerSlug: "data-scientist",
    title: "Predict something, then argue against your own model",
    brief: getTrackExperimentBrief("data-scientist"),
    steps: [
      "Pick a question with a label you can obtain: churn, a price, whether a flight is late.",
      "Write the simplest possible baseline first, such as predicting the majority class or last week's average.",
      "Build one model, then compare it to the baseline using a measure you can defend.",
      "List three ways this model would be wrong in the real world, and say what evidence would prove each one.",
    ],
    observe: [
      "Whether the uncertainty felt like a problem to investigate or a reason to stop caring.",
      "Whether you enjoyed the comparison with the baseline more than the model itself.",
      "How willing you were to write down a result that made your own model look weak.",
    ],
    output:
      "A notebook with the baseline, the model, the comparison, and a short written section on limitations.",
    estimatedMinutes: 210,
  },
  {
    kind: "ml-engineering",
    careerSlug: "machine-learning-engineer",
    title: "Put a model behind a script that refuses bad input",
    brief: getTrackExperimentBrief("machine-learning-engineer"),
    steps: [
      "Take any trained model or a simple scoring rule, and wrap it in one command someone else can run.",
      "Validate the input: reject missing columns, wrong types, and values outside the range the model saw.",
      "Add two automated tests, one for a good input and one for the case you just made illegal.",
      "Run it twice from a clean checkout and save the log so a reader can see the same result.",
    ],
    observe: [
      "Whether making the failure case behave felt satisfying or like paperwork.",
      "What you did when the script worked once but not from a fresh start.",
      "Whether you wanted to know why the run differed, or were content that it looked fine.",
    ],
    output:
      "A repository with the script, the validation, the tests, and a run log from a clean checkout.",
    estimatedMinutes: 180,
  },
  {
    kind: "ai-applications",
    careerSlug: "applied-ai-engineer",
    title: "Design a model-backed feature and its failure paths",
    brief: getTrackExperimentBrief("applied-ai-engineer"),
    steps: [
      "Choose one feature where a model helps, such as summarising a support message or sorting feedback.",
      "Write what a good answer is, in a sentence a reviewer could check without reading the code.",
      "Define how you will notice a bad answer: a rule, a score, or a set of examples a human labels.",
      "Handle three failures: the model is wrong, the model is slow, and the model costs more than the feature is worth.",
    ],
    observe: [
      "Whether deciding what counts as correct interested you, or whether you wanted someone else to set the bar.",
      "How you felt about shipping something that is sometimes wrong on purpose.",
      "Whether cost and latency felt like part of the design or an annoying constraint.",
    ],
    output:
      "A one-page design with the checkable definition of a good answer, the failure handling, and the measurement plan.",
    estimatedMinutes: 150,
  },
  {
    kind: "ai-applications",
    careerSlug: "generative-ai-engineer",
    title: "Test a prompt on ten inputs and write down what broke",
    brief: getTrackExperimentBrief("generative-ai-engineer"),
    steps: [
      "Write a prompt for one narrow job, such as turning a paragraph into three bullet points.",
      "Choose five inputs you expect to work and five designed to be awkward: empty text, a table, a request in another language, an unsafe ask, something too long.",
      "Run all ten and record the result of each one, with the model and settings you used.",
      "Score the outputs against a rule you wrote before you saw them, then change the prompt once and re-run.",
    ],
    observe: [
      "Whether running the same ten inputs again after a change felt like progress or repetition you could tolerate.",
      "What you did with an output that looked right but was wrong.",
      "Whether you enjoyed judging the answers, or only generating them.",
    ],
    output:
      "A results sheet: the prompt, the ten inputs, what each output did, and what changed after one edit.",
    estimatedMinutes: 120,
  },
  {
    kind: "ai-applications",
    careerSlug: "ai-automation-engineer",
    title: "Automate one repeated task, with a dry run first",
    brief: getTrackExperimentBrief("ai-automation-engineer"),
    steps: [
      "Pick a task you or someone you know repeats: renaming downloads, filling a sheet from emails, posting the same update to two places.",
      "Write the steps exactly as a person does them, including the judgement calls.",
      "Build the automation with a dry-run mode that prints what it would change without changing anything.",
      "Run the dry run on real data, then let it act on one item, then on ten.",
    ],
    observe: [
      "Whether describing the steps in full bored you, or whether the details were the interesting part.",
      "How careful you were before removing the dry run.",
      "Whether you wanted to automate the next thing you touched.",
    ],
    output:
      "A script with a dry-run flag, plus the printed dry-run result and what actually changed afterwards.",
    estimatedMinutes: 150,
  },
  {
    kind: "data-engineering",
    careerSlug: "data-engineer",
    title: "Move a file into a database and check it landed",
    brief: getTrackExperimentBrief("data-engineer"),
    steps: [
      "Take one CSV or JSON file and write the table it should become, including which columns can be empty.",
      "Load it with a command you can repeat from the start, so the second run does not double the rows.",
      "Add three checks: expected row count, no duplicate key, and no value outside the range you allow.",
      "Break one on purpose, run it again, and confirm a check fails loudly instead of loading bad rows quietly.",
    ],
    observe: [
      "Whether the repeatable-run problem excited you or seemed obvious and dull.",
      "What you did when the load succeeded but the count was wrong.",
      "Whether making the failure visible felt like the point of the work.",
    ],
    output:
      "A repository with the load command, the table definition, the three checks, and one deliberate failure you caught.",
    estimatedMinutes: 180,
  },
  {
    kind: "data-engineering",
    careerSlug: "mlops-engineer",
    title: "Make a training run repeatable and describe how to tell it drifted",
    brief: getTrackExperimentBrief("mlops-engineer"),
    steps: [
      "Move the settings of one training or analysis script into a configuration file, so nothing is hardcoded in the middle of the code.",
      "Record what a run produced: the input used, the settings, the result, and the date.",
      "Write the check that would tell you the result has quietly changed, and what data you would compare.",
      "Run it a second time from the same configuration and confirm you can see which run is which.",
    ],
    observe: [
      "Whether naming and versioning the inputs felt like discipline you valued or rules you resented.",
      "How you reacted when the second run differed from the first.",
      "Whether you wanted the check to exist before the problem did.",
    ],
    output:
      "A script with its configuration file, a run log covering two runs, and the drift check written down.",
    estimatedMinutes: 150,
  },
] as const;

export function getCareerExperimentForTrack(
  slug: CareerTrackSlug,
): CareerExperimentDefinition | null {
  return (
    CAREER_EXPERIMENTS.find((experiment) => experiment.careerSlug === slug) ??
    null
  );
}

export function listCareerExperimentsByKind(kind: CareerExperimentKind) {
  return CAREER_EXPERIMENTS.filter((experiment) => experiment.kind === kind);
}

export function getCareerExperimentKindMeta(kind: string) {
  return CAREER_EXPERIMENT_KIND_META[kind as CareerExperimentKind] ?? null;
}

export const CAREER_EXPERIMENT_DISCLAIMER =
  "Each experiment is a short version of the real work, done on data you choose. Finishing one is evidence that you tried the activity and recorded what happened. It is not a certificate, and it says nothing about whether anyone would hire for it.";

export const CAREER_EXPERIMENT_COMPLETION_RULE =
  "An experiment only counts as tested once you link the work you produced. Saving a reflection without the work itself is not enough.";
