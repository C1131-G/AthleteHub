import type { CollectionMutationResult } from "../collection-service";

/**
 * Unwraps a successful mutation, failing the test with the actual status when
 * the write was rejected. The repositories these tests came from returned the
 * record directly; the services return a result, and this keeps the
 * assertions about the record itself readable.
 */
export const expectSaved = async <TRecord>(
  operation: Promise<CollectionMutationResult<TRecord>>
): Promise<TRecord> => {
  const result = await operation;
  if (result.status !== "saved") {
    throw new Error(
      `expected a saved record, got ${result.status}: ${JSON.stringify(result.fieldErrors)}`
    );
  }
  return result.record;
};
