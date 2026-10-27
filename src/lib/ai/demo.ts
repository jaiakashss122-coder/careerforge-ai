import { getTutorMode, type TutorMode } from "@/lib/ai/types";

const MODE_GUIDANCE: Record<TutorMode, string> = {
  explain: `Use this structure:
1. **What problem it solves** — define the idea in one sentence without jargon.
2. **Inputs and outputs** — name what goes in, what comes out, and one assumption.
3. **Worked example** — apply it to a tiny, realistic case and show each step.
4. **Common misunderstanding** — name one mistake and how to recognise it.
5. **Check your understanding** — answer one "why" question before moving on.

If you paste your current explanation, I can point to the first sentence that is vague or incorrect.`,
  "step-by-step": `Work through it in this order:
1. Restate the goal in one sentence.
2. List the inputs and the expected output.
3. Write the smallest version that could work.
4. Test one normal case and one edge case.
5. Explain the result in plain language.
6. Only then add complexity.

Keep each step small enough that you can verify it before continuing.`,
  example: `Try a small scenario you can check by hand:
- Pick five rows of realistic data.
- Write what you expect the result to be before running anything.
- Apply the concept step by step.
- Compare the actual result with your expectation.
- Change one input and predict what changes.

This turns the example into evidence of understanding rather than a tutorial you copied.`,
  socratic: `Answer these before I give a summary:
1. What is the goal in your own words?
2. What do you already know that seems related?
3. What is the smallest input that would test your idea?
4. What result would prove your current approach wrong?
5. Which assumption are you least sure about?

Your answers will show whether the gap is conceptual, procedural, or just unfamiliar syntax.`,
  hint: `Progressive hints, from weakest to strongest:
1. Re-read the requirement and underline the exact output requested.
2. Write down the input shape, the output shape, and one example pair.
3. Solve one tiny case by hand before writing code.
4. Name the operation that transforms the input into the output.
5. If code is involved, check types, indexes, and empty inputs first.

Stop at the first hint that unblocks you, then try again before asking for the next one.`,
  debug: `Debug with evidence, not guesses:
1. Paste the exact error text and the line it points to.
2. Write the smallest input that reproduces it.
3. Print or inspect the value immediately before the failure.
4. Check types, empty values, indexing, and variable scope.
5. Change one thing at a time and record the result.
6. Add a regression test once the cause is confirmed.

For a useful review, include the error, the expected result, the actual result, and the smallest relevant code block.`,
  review: `Review the code in this order:
1. **Correctness** — does it produce the required output for normal and edge inputs?
2. **Input handling** — empty data, nulls, duplicates, wrong types, and large inputs.
3. **Clarity** — names, function size, and hidden assumptions.
4. **Testing** — what is covered, and which failure would slip through?
5. **Trade-offs** — readability versus performance versus flexibility.

Ask for the code, the intended behaviour, and the tests. A review without those is only style commentary.`,
  practice: `Generate practice around one concept at a time. For each exercise, include:
- a one-sentence task,
- sample input,
- expected output,
- one edge case,
- acceptance criteria,
- a hidden or separate answer.

Start with a recall question, then an application question, then a transfer question in a slightly different context. Do not mark an exercise complete until the edge case passes too.`,
  diagnose: `Separate the error into one of these buckets:
1. **Concept gap** — you cannot explain the rule yet.
2. **Procedure gap** — you know the rule but missed an ordered step.
3. **Application gap** — you recognise the idea but cannot choose it in a new problem.
4. **Careless error** — the reasoning was right but a detail slipped.

Show your reasoning for the question. The pattern in the mistake determines whether to revisit the lesson, redo a worked example, or simply slow down.`,
  revision: `Use a 20-minute retrieval cycle:
1. Close the notes and write everything you remember for four minutes.
2. Compare with the source and mark only the gaps.
3. Relearn one gap with a worked example.
4. Answer two questions without looking.
5. Schedule a short review in two days and another in one week.

Re-reading alone is weak evidence. Retrieval and corrected mistakes are the useful signals.`,
  interview: `Run the interview in three rounds:
1. **Fundamentals** — one definition and one "why does it matter" question.
2. **Applied** — one scenario with a dataset, constraint, and trade-off.
3. **Evidence** — one question about a real project, your specific contribution, and what you would change.

For each answer, note:
- the claim,
- the evidence,
- the trade-off considered,
- the follow-up you could not answer.

Unsupported claims should be removed, not rehearsed.`,
};

export function buildDemoTutorReply(input: {
  mode: string;
  message: string;
  context: string;
}): string {
  const mode = getTutorMode(input.mode);
  const topic = input.message.trim().replace(/\s+/g, " ").slice(0, 240);
  const hasTaskContext = input.context.includes("CURRENT ROADMAP TASK:");
  const hasAssessment = input.context.includes("LATEST SHORT ASSESSMENT");

  return `**Demo mode — no AI provider is configured.** This is a curated teaching response, not live model output.

You asked: "${topic || "a learning question"}"

**${mode.label}**
${MODE_GUIDANCE[mode.id]}

**How this demo is using your context**
- Profile, availability, and preferences are included only when they exist in your saved workspace.
- ${hasAssessment ? "Your latest short assessment is treated as a screen, not verified mastery." : "No completed assessment is included, so no skill level is assumed."}
- ${hasTaskContext ? "The current roadmap task is included as the learning target." : "No roadmap task is selected, so the answer stays general."}

**Honest boundary**
This demo cannot evaluate your actual answer, inspect files, execute code, or verify mastery. It does not call a model and does not generate live research. To use a real provider, set the server-only AI variables described in Settings.`;
}
