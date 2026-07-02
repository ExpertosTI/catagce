import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../config';

export type AuthSession = {
  token: string;
  type: 'staff' | 'client';
  name: string;
  email: string;
  company: { id: string; name: string; slug: string };
};

const TOKEN_KEY = 'ghome_token';
const SESSION_KEY = 'ghome_session';

export async function saveSession(session: AuthSession) {
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<AuthSession | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!token || !raw) return null;
  return JSON.parse(raw) as AuthSession;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  formData?: FormData;
};

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = opts.token ?? await getToken();
  const headers: Record<string, string> = {};

  if (!opts.formData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? (opts.body || opts.formData ? 'POST' : 'GET'),
    headers,
    body: opts.formData ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const err = await res.json();
      message = err.message ?? err.error ?? message;
      if (Array.isArray(message)) message = message.join(', ');
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loginStaff(email: string, password: string) {
  return apiRequest<{ token: string; user: { name: string; email: string }; company: AuthSession['company'] }>(
    '/auth/staff/login',
    { method: 'POST', body: { email, password }, token: null },
  );
}

export async function loginClient(email: string, password: string, companySlug: string) {
  return apiRequest<{ token: string; user: { name: string; email: string }; company: AuthSession['company'] }>(
    '/auth/client/login',
    { method: 'POST', body: { email, password, companySlug }, token: null },
  );
}
