/**
 * Environment configuration loader and validator.
 */

export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  API_PORT: number;
  API_HOST: string;
  API_URL: string;
  API_CORS_ORIGINS: string[];
  PUBLIC_APP_URL: string;
  ADMIN_APP_URL: string;
  DATABASE_URL: string;
  DATABASE_POOL_MIN: number;
  DATABASE_POOL_MAX: number;
  AUTH_SECRET: string;
  AUTH_ACCESS_TOKEN_TTL: string;
  AUTH_REFRESH_TOKEN_TTL: string;
  STORAGE_DRIVER: 'local' | 's3';
  STORAGE_LOCAL_ROOT: string;
  STORAGE_PUBLIC_PATH: string;
  STORAGE_PRIVATE_PATH: string;
  STORAGE_S3_BUCKET?: string;
  STORAGE_S3_REGION?: string;
  STORAGE_S3_ACCESS_KEY?: string;
  STORAGE_S3_SECRET_KEY?: string;
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  DEFAULT_TIMEZONE: string;
  DEFAULT_CURRENCY: string;
  DEFAULT_LOCALE: string;
  ACTIVE_ACADEMIC_YEAR: string;
}

export function loadEnvConfig(env: Record<string, string | undefined> = process.env): EnvConfig {
  const nodeEnv = (env.NODE_ENV as 'development' | 'test' | 'production') || 'development';

  const config: EnvConfig = {
    NODE_ENV: nodeEnv,
    API_PORT: parseInt(env.API_PORT || '4000', 10),
    API_HOST: env.API_HOST || (nodeEnv === 'production' ? '0.0.0.0' : 'localhost'),
    API_URL: env.API_URL || (nodeEnv === 'production' ? 'https://api.vision-school.dz' : 'http://localhost:4000'),
    API_CORS_ORIGINS: env.API_CORS_ORIGINS
      ? env.API_CORS_ORIGINS.split(',').map((s) => s.trim())
      : nodeEnv === 'production'
      ? ['https://www.vision-school.dz', 'https://admin.vision-school.dz']
      : ['http://localhost:3000', 'http://localhost:3001'],
    PUBLIC_APP_URL: env.PUBLIC_APP_URL || (nodeEnv === 'production' ? 'https://www.vision-school.dz' : 'http://localhost:3000'),
    ADMIN_APP_URL: env.ADMIN_APP_URL || (nodeEnv === 'production' ? 'https://admin.vision-school.dz' : 'http://localhost:3001'),
    DATABASE_URL:
      env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vision_school?schema=public',
    DATABASE_POOL_MIN: parseInt(env.DATABASE_POOL_MIN || (nodeEnv === 'production' ? '5' : '2'), 10),
    DATABASE_POOL_MAX: parseInt(env.DATABASE_POOL_MAX || (nodeEnv === 'production' ? '25' : '10'), 10),
    AUTH_SECRET: env.AUTH_SECRET || 'dev_secret_key_change_in_production_min_32_chars_12345',
    AUTH_ACCESS_TOKEN_TTL: env.AUTH_ACCESS_TOKEN_TTL || '15m',
    AUTH_REFRESH_TOKEN_TTL: env.AUTH_REFRESH_TOKEN_TTL || '7d',
    STORAGE_DRIVER: (env.STORAGE_DRIVER as 'local' | 's3') || 'local',
    STORAGE_LOCAL_ROOT: env.STORAGE_LOCAL_ROOT || './storage',
    STORAGE_PUBLIC_PATH: env.STORAGE_PUBLIC_PATH || '/media',
    STORAGE_PRIVATE_PATH: env.STORAGE_PRIVATE_PATH || '/documents',
    STORAGE_S3_BUCKET: env.STORAGE_S3_BUCKET,
    STORAGE_S3_REGION: env.STORAGE_S3_REGION,
    STORAGE_S3_ACCESS_KEY: env.STORAGE_S3_ACCESS_KEY,
    STORAGE_S3_SECRET_KEY: env.STORAGE_S3_SECRET_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    DEFAULT_TIMEZONE: env.DEFAULT_TIMEZONE || 'Africa/Algiers',
    DEFAULT_CURRENCY: env.DEFAULT_CURRENCY || 'DZD',
    DEFAULT_LOCALE: env.DEFAULT_LOCALE || 'fr',
    ACTIVE_ACADEMIC_YEAR: env.ACTIVE_ACADEMIC_YEAR || '2026/2027',
  };

  if (nodeEnv === 'production') {
    if (!env.AUTH_SECRET || env.AUTH_SECRET === 'dev_secret_key_change_in_production_min_32_chars_12345') {
      throw new Error('[FATAL] AUTH_SECRET must be explicitly defined and cannot use the development default secret in production.');
    }
    if (config.AUTH_SECRET.length < 32) {
      throw new Error('[FATAL] AUTH_SECRET must be at least 32 characters in production.');
    }
    if (!env.DATABASE_URL) {
      throw new Error('[FATAL] DATABASE_URL must be explicitly provided in production.');
    }
    if (config.API_CORS_ORIGINS.includes('*')) {
      throw new Error('[FATAL] Wildcard CORS (*) is forbidden in production.');
    }
  }

  return config;
}

