type RateEntry = {
  count: number;
  expiresAt: number;
};

const store = new Map<string, RateEntry>();

type RateLimitOptions = {
  identifier: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export function checkRateLimit({ identifier, limit, windowMs, now = Date.now() }: RateLimitOptions): boolean {
  const existing = store.get(identifier);

  if (!existing || existing.expiresAt <= now) {
    store.set(identifier, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

export function resetRateLimits() {
  store.clear();
}
