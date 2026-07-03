const WEAK_JWT_SECRETS = new Set([
  'ghome-dev-secret-change-in-production',
  'generate_a_random_string',
  'changeme',
  'secret',
  'jwt_secret',
]);

const isProduction = process.env.NODE_ENV === 'production';

export function validateSecurityEnv(): void {
  const secret = process.env.JWT_SECRET?.trim();

  if (isProduction) {
    if (!secret) {
      throw new Error('JWT_SECRET es obligatorio en producción. Genere uno con: openssl rand -base64 32');
    }
    if (secret.length < 32 || WEAK_JWT_SECRETS.has(secret)) {
      throw new Error('JWT_SECRET es demasiado débil para producción. Use al menos 32 caracteres aleatorios.');
    }
    return;
  }

  if (!secret) {
    console.warn('[security] JWT_SECRET no definido — usando secreto de desarrollo (no usar en producción)');
  } else if (WEAK_JWT_SECRETS.has(secret)) {
    console.warn('[security] JWT_SECRET débil detectado — cambie antes de desplegar');
  }
}

export function resolveJwtSecret(): string {
  return process.env.JWT_SECRET?.trim() || 'ghome-dev-secret-change-in-production';
}
