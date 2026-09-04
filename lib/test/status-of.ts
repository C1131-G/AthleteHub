/**
 * Reads the status off a mutation result without the assertion reaching
 * through an await expression, which keeps the tests readable when all they
 * check is whether a write was accepted.
 */
export const statusOf = async <TStatus extends string>(
  operation: Promise<{ status: TStatus }>
): Promise<TStatus> => {
  const result = await operation;
  return result.status;
};
