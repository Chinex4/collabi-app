import { AuthError, PostgrestError, StorageApiError } from '@supabase/supabase-js';

export class ApiError extends Error {
  status: number;
  errors?: unknown[];

  constructor(message: string, status = 500, errors?: unknown[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export const toApiError = (error: AuthError | PostgrestError | StorageApiError | Error) => {
  if (error instanceof ApiError) {
    return error;
  }

  const status = 'status' in error && typeof error.status === 'number' ? error.status : 500;
  const details = 'details' in error && error.details ? [error.details] : undefined;

  return new ApiError(error.message, status, details);
};

export const throwIfSupabaseError = (
  error: AuthError | PostgrestError | StorageApiError | Error | null
) => {
  if (error) {
    throw toApiError(error);
  }
};

export const requireData = <T>(data: T | null, message = 'Record not found') => {
  if (data === null) {
    throw new ApiError(message, 404);
  }

  return data;
};
