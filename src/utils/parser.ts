import { VariableStore } from './variableStore';

export function parseKeyValueList(input?: unknown): Record<string, string> {
  const raw = String(input ?? '').trim();
  if (!raw) return {};

  return raw.split(/[;\n]/).reduce<Record<string, string>>((acc, part) => {
    const item = part.trim();
    if (!item) return acc;

    const separator = item.includes('=') ? '=' : ':';
    const index = item.indexOf(separator);
    if (index < 0) return acc;

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (key) acc[key] = String(VariableStore.resolve(value));
    return acc;
  }, {});
}

export function parseRequestBody(input?: unknown): unknown {
  const raw = String(input ?? '').trim();
  if (!raw) return undefined;

  const resolved = String(VariableStore.resolve(raw));
  try {
    return JSON.parse(resolved);
  } catch {
    return resolved;
  }
}

export function appendQueryParams(url: URL, queryParams?: unknown): void {
  const params = parseKeyValueList(queryParams);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
}

export function applyPathParams(endpoint: string, pathParams?: unknown): string {
  const params = parseKeyValueList(pathParams);
  let resolvedEndpoint = String(VariableStore.resolve(endpoint));

  for (const [key, value] of Object.entries(params)) {
    resolvedEndpoint = resolvedEndpoint
      .replace(new RegExp(`:${escapeRegExp(key)}\\b`, 'g'), encodeURIComponent(value))
      .replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g'), encodeURIComponent(value));
  }

  return resolvedEndpoint;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
