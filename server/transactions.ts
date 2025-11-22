import { db } from "./db";

// Helper to execute a Drizzle transaction with structured logging.
type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function withTransaction<T>(
  operation: string,
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  console.info("[transaction:start]", { operation, startedAt });

  try {
    const result = await db.transaction(async (tx) => fn(tx));
    console.info("[transaction:commit]", {
      operation,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    console.error("[transaction:rollback]", {
      operation,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}
