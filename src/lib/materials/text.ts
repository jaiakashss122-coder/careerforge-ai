import { MAX_ENTRY_LENGTH, type MaterialBlock } from "@/lib/materials/types";

/**
 * Dates on a document and on this screen are written the same way, so a learner
 * can match a line back to the record that produced it without converting
 * anything in their head.
 */
export function formatMaterialDay(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Just the year, used where a record only ever stores a year. */
export function materialYear(value: string | null): string | null {
  if (!value) return null;

  const parsed = Number(value.slice(0, 4));

  return Number.isInteger(parsed) && parsed > 1900 ? String(parsed) : null;
}

/**
 * Longest-allowed wording, cut at a word boundary. The cut says so instead of
 * ending mid-sentence, because a silent cut on a document is how a line ends up
 * claiming something it no longer finishes saying.
 */
export function clipText(text: string, limit = MAX_ENTRY_LENGTH): string {
  if (text.length <= limit) return text;

  const window = text.slice(0, limit);
  const lastSpace = window.lastIndexOf(" ");
  const cutAt = lastSpace > limit * 0.6 ? lastSpace : limit;

  return `${window.slice(0, cutAt).replace(/[,.;:\s]+$/, "")}… (cut at ${limit} characters)`;
}

/**
 * "a, b and c". Skill names carry "and" inside them ("SQL filtering and
 * sorting"), so a plain join reads "…and sorting and Data cleaning"; when any
 * item does that, the last separator takes its comma to keep the list countable.
 */
export function joinList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];

  const needsComma = items.some((item) => item.includes(" and "));

  return `${items
    .slice(0, -1)
    .join(", ")}${needsComma ? ", and " : " and "}${items[items.length - 1]}`;
}

export function pluralise(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * A bracketed line in a generated document is an instruction, not content: it
 * marks something this app could not write. It stays visible on screen and is
 * taken out of the text meant for pasting, so nobody ships a sentence that
 * starts with a square bracket.
 */
const INSTRUCTION_SLOT = /\[[^\]\n]*\]/g;

export function withoutInstructionSlots(text: string): string {
  return text
    .replace(INSTRUCTION_SLOT, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countInstructionSlots(text: string): number {
  return text.match(INSTRUCTION_SLOT)?.length ?? 0;
}

/**
 * The document a learner pastes into a résumé builder or a text file. Cautions
 * and provenance stay on screen and out of this text, because a line that says
 * "nobody checked this" inside a job application helps nobody — the point of the
 * caution is that the *learner* removes or fixes the line first.
 */
export function renderBlocksAsText({
  title,
  blocks,
  generatedOn,
}: {
  title: string;
  blocks: readonly MaterialBlock[];
  generatedOn: string;
}): string {
  const parts = [
    title,
    `Assembled from the records in this workspace on ${
      formatMaterialDay(generatedOn) ?? generatedOn
    }. Nothing here was checked by a person outside this app.`,
    "",
  ];

  let slots = 0;

  for (const block of blocks) {
    if (block.entries.length === 0) continue;

    parts.push(block.title.toUpperCase());

    for (const entry of block.entries) {
      slots += countInstructionSlots(entry.text);
      parts.push(withoutInstructionSlots(entry.text));
    }

    parts.push("");
  }

  const emptyBlocks = blocks.filter((block) => block.entries.length === 0);

  if (emptyBlocks.length > 0) {
    parts.push("SECTIONS THIS APP LEFT EMPTY FOR YOU TO FILL");

    for (const block of emptyBlocks) {
      parts.push(
        `- ${block.title}: ${
          block.gaps[0] ?? "nothing here can be built from your records yet."
        }`,
      );
    }

    parts.push("");
  }

  if (slots > 0) {
    parts.push(
      `${pluralise(
        slots,
        "bracketed line was",
        "bracketed lines were",
      )} taken out of the text above because this app could not write them. They are listed on screen, beside the line each one belongs to.`,
    );
    parts.push("");
  }

  return `${parts.join("\n").trimEnd()}\n`;
}
