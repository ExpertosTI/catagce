export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isUnauthorizedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

/** Solo cerrar sesión en 401. Un 403 de plan/feature no debe botar al login. */
export function handleAuthError(err: unknown, router: { push: (path: string) => void }): boolean {
  if (isUnauthorizedError(err)) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('catagce_api_key');
      localStorage.removeItem('catagce_token');
    }
    router.push('/login');
    return true;
  }
  return false;
}

export function getErrorMessage(err: unknown, fallback = 'Error al cargar datos'): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
