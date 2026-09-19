import { EnvConfig } from '../config/env.config';

export class VariableStore {
  private static readonly values = new Map<string, string>();

  static set(key: string, value: unknown): void {
    this.values.set(key, value === undefined || value === null ? '' : String(value));
  }

  static get(key: string): string {
    if (this.values.has(key)) return this.values.get(key) ?? '';
    return EnvConfig.resolveSecretOrValue(key, false);
  }

  static resolve(input: unknown): unknown {
    if (typeof input !== 'string') return input;

    return input
      .replace(/\{\{([^}]+)}}/g, (_match, key: string) => this.get(key.trim()))
      .replace(/\$\{([^}]+)}/g, (_match, key: string) => EnvConfig.get(key.trim()));
  }

  static snapshot(): Record<string, string> {
    return Object.fromEntries(this.values.entries());
  }
}
