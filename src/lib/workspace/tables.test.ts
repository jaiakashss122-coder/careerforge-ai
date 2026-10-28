import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DATA_TABLES,
  CASCADE_ONLY_TABLES,
  LEARNING_DATA_TABLES,
} from "@/lib/workspace/tables";

const migrationDir = join(process.cwd(), "supabase", "migrations");

/**
 * The schema is the only honest answer to "which rows belong to this account",
 * so this reads the migration files themselves rather than a list someone could
 * forget to update. A new table that holds learner data has to appear here
 * before the app can claim it deletes everything.
 */
function readSchema() {
  const files = readdirSync(migrationDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const created: string[] = [];
  const ownedByUser = new Set<string>();
  /** child -> parents it is removed along with */
  const cascadeTo = new Map<string, string[]>();

  for (const file of files) {
    const sql = readFileSync(join(migrationDir, file), "utf8");
    const blocks = sql
      .split(/^create table (?:if not exists )?public\./m)
      .slice(1);

    for (const block of blocks) {
      const name = /^(\w+)/.exec(block)?.[1];
      if (!name) continue;
      const body = block.slice(0, block.indexOf("\n);"));

      created.push(name);
      if (/\buser_id uuid\b/.test(body)) ownedByUser.add(name);

      for (const edge of body.matchAll(
        /references public\.(\w+) \(\w+\) on delete cascade/g,
      )) {
        cascadeTo.set(name, [...(cascadeTo.get(name) ?? []), edge[1]]);
      }
    }
  }

  return { created, ownedByUser, cascadeTo };
}

const schema = readSchema();

function reachesAccountTable(table: string, seen = new Set<string>()): boolean {
  if (seen.has(table)) return false;
  seen.add(table);

  for (const parent of schema.cascadeTo.get(table) ?? []) {
    if ((ACCOUNT_DATA_TABLES as readonly string[]).includes(parent)) return true;
    if (reachesAccountTable(parent, seen)) return true;
  }

  return false;
}

describe("the account's owned tables", () => {
  it("reads real migration files, not an empty list", () => {
    expect(schema.created.length).toBeGreaterThanOrEqual(24);
    expect(schema.created).toContain("application_materials");
  });

  it("names every table the schema creates, so none is forgotten", () => {
    const accounted = new Set<string>([
      "skills",
      ...(ACCOUNT_DATA_TABLES as readonly string[]),
      ...(CASCADE_ONLY_TABLES as readonly string[]),
    ]);

    expect(
      schema.created.filter((table) => !accounted.has(table)),
    ).toEqual([]);
  });

  it("deletes every table that carries a user_id", () => {
    const listed = new Set<string>(ACCOUNT_DATA_TABLES as readonly string[]);

    expect([...schema.ownedByUser].filter((table) => !listed.has(table))).toEqual(
      [],
    );
    expect([...listed].filter((table) => !schema.created.includes(table))).toEqual(
      [],
    );
  });

  it("leaves cascade-only rows to a parent that is really deleted", () => {
    for (const table of CASCADE_ONLY_TABLES) {
      expect(
        schema.created,
        `${table} exists in the schema`,
      ).toContain(table);
      expect(
        reachesAccountTable(table),
        `${table} must cascade from a table in the account list`,
      ).toBe(true);
    }
  });

  it("removes a profile only after every record it belongs to", () => {
    expect(ACCOUNT_DATA_TABLES.at(-1)).toBe("profiles");
    expect(
      (LEARNING_DATA_TABLES as readonly string[]).includes("profiles"),
    ).toBe(false);
    expect(
      schema.cascadeTo.get("profiles") ?? [],
      "the profile row is not the parent any other row hides behind",
    ).toEqual([]);
  });

  it("deletes a child before the parent that would take it away anyway", () => {
    const order = ACCOUNT_DATA_TABLES as readonly string[];

    for (const [child, parents] of schema.cascadeTo) {
      if (!order.includes(child)) continue;
      for (const parent of parents) {
        if (!order.includes(parent)) continue;
        expect(
          order.indexOf(child) < order.indexOf(parent),
          `${child} should be deleted before ${parent}`,
        ).toBe(true);
      }
    }
  });

  it("covers the learning-data workflow inside the account workflow", () => {
    for (const table of LEARNING_DATA_TABLES) {
      expect(
        (ACCOUNT_DATA_TABLES as readonly string[]).includes(table),
        `${table} is learning data, so closing the account must remove it too`,
      ).toBe(true);
    }
  });

  it("never lists the shared skill catalogue as the account's own", () => {
    expect(
      (ACCOUNT_DATA_TABLES as readonly string[]).includes("skills"),
    ).toBe(false);
    expect((CASCADE_ONLY_TABLES as readonly string[]).includes("skills")).toBe(
      false,
    );
  });
});
