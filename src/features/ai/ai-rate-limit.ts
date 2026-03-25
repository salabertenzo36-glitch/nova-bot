const buckets = new Map<string, number>();

export function getCooldownRemainingMs(scopeId: string, cooldownSeconds: number): number {
  if (cooldownSeconds <= 0) {
    return 0;
  }

  const nextAllowedAt = buckets.get(scopeId) ?? 0;
  const remaining = nextAllowedAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function markCooldown(scopeId: string, cooldownSeconds: number): void {
  if (cooldownSeconds <= 0) {
    return;
  }

  buckets.set(scopeId, Date.now() + cooldownSeconds * 1000);
}
