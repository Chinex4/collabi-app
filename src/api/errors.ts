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
  const message = normalizeErrorMessage(error.message, status);

  return new ApiError(message, status, details);
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

const normalizeErrorMessage = (message: string, status: number) => {
  const trimmed = message.trim();

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        name?: string;
        message?: string;
        error?: string;
        msg?: string;
      };
      const nestedMessage = parsed.message ?? parsed.error ?? parsed.msg;
      if (nestedMessage && nestedMessage !== trimmed) {
        return normalizeErrorMessage(nestedMessage, status);
      }
    } catch {
      // Fall through to generic handling below.
    }
  }

  const lower = trimmed.toLowerCase();

  if (
    status >= 500 ||
    lower.includes('unexpected_failure') ||
    lower.includes('database error saving new user')
  ) {
    return 'We could not create your account right now. Please try again in a moment.';
  }

  return trimmed || 'Something went wrong. Please try again.';
};
