import { sessionStorage } from '@/utils/storage';

export const API_BASE_URL = 'https://collabi-backend.onrender.com/api';
export const SOCKET_BASE_URL = 'https://collabi-backend.onrender.com';

type Primitive = string | number | boolean | null | undefined;
type QueryValue = Primitive | Primitive[];

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  auth?: boolean;
  body?: BodyInit | FormData | null;
  json?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: unknown;
  errors?: unknown[];
};

export class ApiError extends Error {
  status: number;
  errors?: unknown[];

  constructor(message: string, status: number, errors?: unknown[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

const withQuery = (path: string, query?: Record<string, QueryValue>) => {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null && entry !== '') {
          params.append(key, String(entry));
        }
      });
      return;
    }

    params.append(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
};

const isFormData = (value: BodyInit | FormData | null | undefined): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData;

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as ApiEnvelope<unknown>;
  } catch {
    return null;
  }
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}) => {
  const { method = 'GET', auth = false, body, json, query, headers = {} } = options;
  const session = auth ? await sessionStorage.getSession() : null;
  const requestHeaders: Record<string, string> = { ...headers };

  let requestBody = body;
  if (json !== undefined) {
    requestBody = JSON.stringify(json);
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (auth && session?.accessToken) {
    requestHeaders.Authorization = `Bearer ${session.accessToken}`;
  }

  if (isFormData(requestBody)) {
    delete requestHeaders['Content-Type'];
  }

  const response = await fetch(`${API_BASE_URL}${withQuery(path, query)}`, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });

  const payload = (await parseJsonSafely(response)) as ApiEnvelope<T> | null;
  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload?.errors
    );
  }

  return {
    message: payload?.message || 'Request successful',
    data: (payload?.data as T) ?? (null as T),
    meta: payload?.meta,
  };
};
