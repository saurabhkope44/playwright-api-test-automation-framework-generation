export function readJsonPath(source: unknown, pathExpression: string): unknown {
  const expression = pathExpression.trim();
  if (!expression || expression === '$') return source;

  const normalized = expression
    .replace(/^\$\./, '')
    .replace(/^\$/, '')
    .replace(/\[(\d+)]/g, '.$1')
    .replace(/\['([^']+)']/g, '.$1')
    .replace(/\["([^"]+)"]/g, '.$1');

  if (!normalized) return source;

  return normalized.split('.').filter(Boolean).reduce<unknown>((current, segment) => {
    if (current === undefined || current === null) return undefined;
    if (segment === 'length' && (Array.isArray(current) || typeof current === 'string')) return current.length;
    if (Array.isArray(current) && /^\d+$/.test(segment)) return current[Number(segment)];
    if (typeof current === 'object') return (current as Record<string, unknown>)[segment];
    return undefined;
  }, source);
}
