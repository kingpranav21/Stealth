export function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(n < 10_240 ? 1 : 0)} KB`;
  }
  if (n < 1024 * 1024 * 1024) {
    return `${(n / (1024 * 1024)).toFixed(n < 10_485_760 ? 1 : 0)} MB`;
  }
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function cacheMaxBytesFromMb(mb: number): number {
  return Math.max(1, mb) * 1024 * 1024;
}

export function totalCacheBytes(
  files: Record<string, { bytes: number }>
): number {
  return Object.values(files).reduce((sum, e) => sum + e.bytes, 0);
}
