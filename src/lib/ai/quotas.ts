export const AI_QUOTA_WINDOW_MS = 10 * 60 * 1000;
export const AI_QUOTA_WINDOW_LIMIT = 10;
export const AI_QUOTA_DAY_MS = 24 * 60 * 60 * 1000;
export const AI_QUOTA_DAY_LIMIT = 60;

export const AI_QUOTA_SUMMARY = `${AI_QUOTA_WINDOW_LIMIT} requests per 10 minutes and ${AI_QUOTA_DAY_LIMIT} per day.`;

export type AiQuotaCheck =
  | {
      allowed: true;
      windowRemaining: number;
      dailyRemaining: number;
    }
  | {
      allowed: false;
      windowRemaining: number;
      dailyRemaining: number;
      message: string;
      retryAt: string;
    };

function parseTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function evaluateAiQuota(
  events: ReadonlyArray<{ createdAt: string }>,
  now: Date = new Date(),
): AiQuotaCheck {
  const nowMs = now.getTime();
  const windowStart = nowMs - AI_QUOTA_WINDOW_MS;
  const dayStart = nowMs - AI_QUOTA_DAY_MS;

  const recent: number[] = [];
  let dailyCount = 0;

  for (const event of events) {
    const time = parseTime(event.createdAt);
    if (time === null || time > nowMs) continue;
    if (time >= dayStart) dailyCount += 1;
    if (time >= windowStart) recent.push(time);
  }

  recent.sort((a, b) => a - b);
  const windowRemaining = Math.max(
    0,
    AI_QUOTA_WINDOW_LIMIT - recent.length,
  );
  const dailyRemaining = Math.max(0, AI_QUOTA_DAY_LIMIT - dailyCount);

  if (recent.length >= AI_QUOTA_WINDOW_LIMIT) {
    const retryMs =
      (recent[recent.length - AI_QUOTA_WINDOW_LIMIT] ?? nowMs) +
      AI_QUOTA_WINDOW_MS;

    return {
      allowed: false,
      windowRemaining: 0,
      dailyRemaining,
      message: `You reached the short-term AI limit (${AI_QUOTA_WINDOW_LIMIT} requests in 10 minutes). Try again in a few minutes.`,
      retryAt: new Date(Math.max(retryMs, nowMs + 60_000)).toISOString(),
    };
  }

  if (dailyCount >= AI_QUOTA_DAY_LIMIT) {
    return {
      allowed: false,
      windowRemaining,
      dailyRemaining: 0,
      message: `You reached the daily AI limit (${AI_QUOTA_DAY_LIMIT} requests). The limit resets as older requests leave the 24-hour window.`,
      retryAt: new Date(nowMs + AI_QUOTA_DAY_MS).toISOString(),
    };
  }

  return {
    allowed: true,
    windowRemaining,
    dailyRemaining,
  };
}
