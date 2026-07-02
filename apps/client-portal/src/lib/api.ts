const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('ghome_client_token') || '';
}

export function setAuth(token: string, client?: object) {
  localStorage.setItem('ghome_client_token', token);
  if (client) localStorage.setItem('ghome_client', JSON.stringify(client));
}

export function getClient<T = Record<string, unknown>>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('ghome_client');
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem('ghome_client_token');
  localStorage.removeItem('ghome_client');
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response.json();
}

export async function publicFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response.json();
}

export { API_URL };
