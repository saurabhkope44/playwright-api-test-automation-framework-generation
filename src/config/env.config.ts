import dotenv from 'dotenv';

dotenv.config();

export class EnvConfig {
  static get(key: string, required = true): string {
    const normalizedKey = key.replace(/^\$\{(.+)}$/, '$1').trim();
    const value = process.env[normalizedKey];

    if (required && (value === undefined || value === '')) {
      console.error(normalizedKey, value);
      throw new Error(`Missing required environment variable: ${normalizedKey}`);
    }

    return value ?? '';
  }

  static resolvePlaceholders(input: unknown): unknown {
    if (typeof input !== 'string') return input;

    return input.replace(/\$\{([^}]+)}/g, (_match, key: string) => EnvConfig.get(key));
  }

  static resolveSecretOrValue(value: unknown, required = false): string {
    if (value === undefined || value === null) return '';

    const raw = String(value).trim();
    if (!raw) return '';

    if (/^\$\{[^}]+}$/.test(raw)) {
      return EnvConfig.get(raw, required);
    }

    if (/^[A-Z][A-Z0-9_]+$/.test(raw) && process.env[raw] !== undefined) {
      return EnvConfig.get(raw, required);
    }

    return String(EnvConfig.resolvePlaceholders(raw));
  }
}
