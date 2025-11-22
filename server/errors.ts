export type StorageErrorCode =
  | "DRINK_NOT_FOUND"
  | "MENU_MISMATCH"
  | "DRINK_INACTIVE"
  | "ORDER_INSERT_FAILED"
  | "DRINK_UPDATE_MISMATCH"
  | "DRINK_DELETE_MISMATCH";

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly options: {
      status: number;
      code: StorageErrorCode;
      context?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}
