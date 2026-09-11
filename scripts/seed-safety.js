const SAFE_DATABASE_NAME_PARTS = ["dev", "test", "local", "seed"];

export function isSafeSeedDatabaseName(databaseName) {
  const normalizedName = String(databaseName ?? "").toLowerCase();

  return SAFE_DATABASE_NAME_PARTS.some((safePart) =>
    normalizedName.includes(safePart)
  );
}
