import { ApiError } from './auth-errors';

export { ApiError } from './auth-errors';
export { isUnauthorizedError, handleAuthError, getErrorMessage } from './auth-errors';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('catagce_api_key') || '';
}

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('catagce_token') || '';
}

export function setAuth(apiKey: string, token?: string) {
  localStorage.setItem('catagce_api_key', apiKey);
  if (token) localStorage.setItem('catagce_token', token);
}

export function setApiKey(key: string) {
  localStorage.setItem('catagce_api_key', key);
}

export function clearAuth() {
  localStorage.removeItem('catagce_api_key');
  localStorage.removeItem('catagce_token');
}

export function clearApiKey() {
  clearAuth();
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  const apiKey = getApiKey();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  else if (apiKey) headers['x-api-key'] = apiKey;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : (error.message || `Error ${response.status}`);
    throw new ApiError(message, response.status, error);
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

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const headers: Record<string, string> = {};
  const token = getToken();
  const apiKey = getApiKey();
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (apiKey) headers['x-api-key'] = apiKey;

  const response = await fetch(`${API_URL}/uploads/image`, { method: 'POST', headers, body: form });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(error.message || 'Error al subir imagen', response.status, error);
  }
  return response.json();
}

export { API_URL };
