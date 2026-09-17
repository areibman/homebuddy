export function readableError(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : fallback;
  const line = raw.split('\n')[0] ?? fallback;
  const uncaught = line.match(/Uncaught \w+: (.+)$/);
  return (uncaught?.[1] ?? line.replace(/^\[CONVEX.*?\]\s*/, '')).trim() || fallback;
}
