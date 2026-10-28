import { describe, expect, it, vi } from "vitest";
import {
  DELETION_SCOPES,
  deleteOwnedRows,
} from "@/lib/workspace/deletion";
import {
  ACCOUNT_CLOSURE_CONFIRM_WORD,
  ACCOUNT_USER_ID_TABLES,
  LEARNING_DATA_CONFIRM_WORD,
  LEARNING_DATA_TABLES,
} from "@/lib/workspace/tables";

describe("running a table-by-table delete", () => {
  it("reaches every table in the order the list gives", async () => {
    const attempted: string[] = [];
    const outcome = await deleteOwnedRows(
      ACCOUNT_USER_ID_TABLES,
      async (table) => {
        attempted.push(table);
        return false;
      },
    );

    expect(outcome).toEqual({ ok: true });
    expect(attempted).toEqual([...ACCOUNT_USER_ID_TABLES]);
  });

  it("stops at the first failing table and names it", async () => {
    const attempted: string[] = [];
    const failing = ACCOUNT_USER_ID_TABLES[5];
    const outcome = await deleteOwnedRows(
      ACCOUNT_USER_ID_TABLES,
      async (table) => {
        attempted.push(table);
        return table === failing;
      },
    );

    expect(outcome).toEqual({ ok: false, stoppedAt: failing });
    expect(attempted).toEqual(ACCOUNT_USER_ID_TABLES.slice(0, 6));
  });

  it("waits for each table before starting the next", async () => {
    const order: string[] = [];
    await deleteOwnedRows(["a", "b", "c"], async (table) => {
      order.push(`start:${table}`);
      await Promise.resolve();
      order.push(`end:${table}`);
      return false;
    });

    expect(order).toEqual([
      "start:a",
      "end:a",
      "start:b",
      "end:b",
      "start:c",
      "end:c",
    ]);
  });

  it("calls the delete exactly once per table", async () => {
    const deleteTable = vi.fn(async () => false);
    await deleteOwnedRows(LEARNING_DATA_TABLES, deleteTable);

    expect(deleteTable).toHaveBeenCalledTimes(
      LEARNING_DATA_TABLES.length,
    );
  });
});

describe("what each destructive workflow tells the learner", () => {
  it("demands the same phrase the settings screens display", () => {
    expect(DELETION_SCOPES.learning.confirmWord).toBe(
      LEARNING_DATA_CONFIRM_WORD,
    );
    expect(DELETION_SCOPES.account.confirmWord).toBe(
      ACCOUNT_CLOSURE_CONFIRM_WORD,
    );
  });

  it("keeps the two workflows from sharing any sentence", () => {
    const learning = [
      DELETION_SCOPES.learning.requiresAccount,
      DELETION_SCOPES.learning.wrongPhrase,
      DELETION_SCOPES.learning.stoppedAt("projects"),
    ];
    const account = [
      DELETION_SCOPES.account.requiresAccount,
      DELETION_SCOPES.account.wrongPhrase,
      DELETION_SCOPES.account.stoppedAt("projects"),
    ];

    for (const line of learning) {
      expect(account).not.toContain(line);
    }
  });

  it("quotes its own phrase in the refusal, not the other workflow's", () => {
    expect(DELETION_SCOPES.learning.wrongPhrase).toContain(
      LEARNING_DATA_CONFIRM_WORD,
    );
    expect(DELETION_SCOPES.learning.wrongPhrase).not.toContain(
      ACCOUNT_CLOSURE_CONFIRM_WORD,
    );
    expect(DELETION_SCOPES.account.wrongPhrase).toContain(
      ACCOUNT_CLOSURE_CONFIRM_WORD,
    );
  });

  it("names the table that stopped the delete in both workflows", () => {
    expect(DELETION_SCOPES.learning.stoppedAt("skill_assessments")).toContain(
      "skill_assessments",
    );
    expect(DELETION_SCOPES.account.stoppedAt("job_applications")).toContain(
      "job_applications",
    );
  });

  it("only promises what the table lists actually make true", () => {
    expect(DELETION_SCOPES.learning.stoppedAt("projects")).toContain(
      "profile was not touched",
    );
    expect(
      (LEARNING_DATA_TABLES as readonly string[]).includes("profiles"),
    ).toBe(false);

    expect(DELETION_SCOPES.account.stoppedAt("projects")).toContain(
      "profile row is still in place",
    );
    expect(
      (ACCOUNT_USER_ID_TABLES as readonly string[]).includes("profiles"),
    ).toBe(false);

    expect(DELETION_SCOPES.account.stoppedAt("projects")).toContain(
      "Nothing signed you out",
    );
    expect(DELETION_SCOPES.learning.stoppedAt("projects")).not.toContain(
      "signed you out",
    );
  });

  it("refuses a workflow that has no signed-in account", () => {
    expect(DELETION_SCOPES.learning.requiresAccount).toContain(
      "signed-in account",
    );
    expect(DELETION_SCOPES.account.requiresAccount).toContain(
      "signed-in account",
    );
  });
});
