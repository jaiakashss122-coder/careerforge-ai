import {
  ACCOUNT_CLOSURE_CONFIRM_WORD,
  LEARNING_DATA_CONFIRM_WORD,
} from "@/lib/workspace/tables";

/**
 * The two destructive workflows, described in one place so the phrase a screen
 * asks for, the message it shows when nobody is signed in, and the message it
 * shows when a delete stops halfway cannot drift apart from each other. A
 * `"use server"` file may export only functions, so the strings live here and
 * the actions read them.
 */
export const DELETION_SCOPES = {
  learning: {
    confirmWord: LEARNING_DATA_CONFIRM_WORD,
    requiresAccount:
      "Deleting learning data requires a signed-in account.",
    wrongPhrase: `Type ${LEARNING_DATA_CONFIRM_WORD} to confirm removing your learning data.`,
    stoppedAt: (table: string) =>
      `Not all learning data could be deleted. The attempt stopped at ${table}. Your profile was not touched, so your sign-in and your starting profile are still here — retry, or delete one area at a time.`,
  },
  account: {
    confirmWord: ACCOUNT_CLOSURE_CONFIRM_WORD,
    requiresAccount: "Closing an account requires a signed-in account.",
    wrongPhrase: `Type ${ACCOUNT_CLOSURE_CONFIRM_WORD} to confirm closing this account.`,
    stoppedAt: (table: string) =>
      `Not everything could be deleted, and the attempt stopped at ${table}. Nothing signed you out, and your profile row is still in place because it is deleted last on purpose. Retry to finish closing the account, or delete the learning data instead.`,
  },
} as const;

export type DeletionScope = keyof typeof DELETION_SCOPES;

export type OwnedDeleteOutcome<T extends string = string> =
  | { ok: true }
  | { ok: false; stoppedAt: T };

/**
 * Runs one account's table-by-table delete and stops at the first table that
 * fails.
 *
 * There is no transaction around these statements — each is its own request — so
 * a failure can leave some tables cleared and others untouched. Halting and
 * naming the table is what makes that state survivable: continuing would delete
 * the profile while records were still readable, and the screen reporting the
 * result would have no idea which rows actually went away.
 *
 * `T` stays as narrow as the caller's table list because the Supabase client
 * only accepts a known table name; widening it to `string` here would push the
 * call sites into casts.
 */
export async function deleteOwnedRows<T extends string>(
  tables: readonly T[],
  deleteTable: (table: T) => Promise<boolean>,
): Promise<OwnedDeleteOutcome<T>> {
  for (const table of tables) {
    if (await deleteTable(table)) {
      return { ok: false, stoppedAt: table };
    }
  }

  return { ok: true };
}
