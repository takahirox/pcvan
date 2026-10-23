import type { AiActivity, Backup, CommunityWorld } from './storage/schema';
import type { NetNewsState, ConferenceState } from './storage/schema';
import type { OltState } from './olt-state';

export const CALENDAR_SETTING = 'historical-calendar';
export interface HistoricalCalendar { version: 1; sourceAnchor: string }
const day = 86_400_000;
const jst = 9 * 3_600_000;

/** Canonical target-era instants are conservative legacy imports, never shifted twice. */
export function isHistorical(instant: string): boolean {
  const year = new Date(Date.parse(instant) + jst).getUTCFullYear();
  return year === 1996 || year === 1997;
}

/** H is the matching weekday and JST time in the fictional week Nov 18–24. */
export function historicalAnchor(sourceAnchor: string): number {
  const local = new Date(Date.parse(sourceAnchor) + jst);
  return Date.UTC(1996, 10, 18 + (local.getUTCDay() + 6) % 7) - jst +
    ((local.getTime() % day) + day) % day;
}

export function calendarSetting(content: { settings?: Backup['settings'] }): HistoricalCalendar | undefined {
  return content.settings?.find((s) => s.id === CALENDAR_SETTING)?.value as unknown as HistoricalCalendar | undefined;
}

/** Legacy fallback examines timestamp fields only, never authored text or fixture metadata.
 * Prefer operational world provenance; otherwise use the earliest operational record
 * (including pending catch-up runs). Historical-only data uses its earliest instant
 * plus 28 UTC years as a deterministic surrogate source clock, never the era marker
 * itself. Only entirely undated worlds use activation time. Persist before activity.
 */
export function initialCalendar(content: Backup, now: string): HistoricalCalendar {
  const world = content.settings.find((s) => s.id === 'community-world')?.value as unknown as CommunityWorld | undefined;
  if (world && !isHistorical(world.createdAt)) return { version: 1, sourceAnchor: world.createdAt };
  const activity = content.settings.find((s) => s.id === 'ai-activity')?.value as unknown as AiActivity | undefined;
  const conference = content.settings.find((s) => s.id === 'daisizen-conference')?.value as unknown as ConferenceState | undefined;
  const netnews = content.settings.find((s) => s.id === 'netnews-local')?.value as unknown as NetNewsState | undefined;
  const olt = content.settings.find((s) => s.id === 'olt-rooms')?.value as unknown as OltState | undefined;
  const stamps = [world?.createdAt, content.session?.lastLoginAt, content.session?.lastLogoutAt,
    ...content.posts.flatMap((p) => [p.createdAt, p.simulation?.simulatedAt]),
    ...(content.mail ?? []).flatMap((m) => [m.createdAt, m.simulation?.simulatedAt, m.readAt, m.recipientConfirmation?.at]),
    ...(conference?.contributions.map((r) => r.createdAt) ?? []),
    ...(netnews?.contributions.map((r) => r.createdAt) ?? []),
    activity?.lastActivityAt, activity?.batch?.from, activity?.batch?.to,
    ...(activity?.batch?.runs.map((r) => r.simulatedAt) ?? []),
    ...(activity?.nextDue ? Object.values(activity.nextDue) : []), olt?.windowAt,
    ...(olt?.rooms.flatMap((r) => [r.observedAt, r.nextTurnAt, r.pending?.until,
      ...r.lines.map((l) => l.createdAt), ...r.residents.flatMap((p) => [p.joinedAt, p.until]),
      ...r.visitors.map((v) => v.until)]) ?? []),
  ].filter((s): s is string => !!s).sort((a, b) => Date.parse(a) - Date.parse(b));
  const operational = stamps.find((s) => !isHistorical(s));
  if (operational) return { version: 1, sourceAnchor: operational };
  if (!stamps.length) return { version: 1, sourceAnchor: now };
  const surrogate = new Date(stamps[0]!);
  surrogate.setUTCFullYear(surrogate.getUTCFullYear() + 28);
  return { version: 1, sourceAnchor: surrogate.toISOString() };
}

/** Presentation only. No browser timezone, mutation, per-render epoch or year wrapping. */
export function serviceDate(instant: string, calendar?: HistoricalCalendar, style: 'date' | 'forum' | 'netnews' = 'date'): string {
  const source = Date.parse(instant);
  const projected = calendar && !isHistorical(instant)
    ? historicalAnchor(calendar.sourceAnchor) + source - Date.parse(calendar.sourceAnchor) : source;
  const date = new Date(projected + jst).toISOString();
  if (style === 'netnews') return `${new Date(projected + jst).toUTCString().replace(' GMT', '')} +0900`;
  if (style === 'forum') return `${date.slice(2, 4)}/${date.slice(5, 7)}/${date.slice(8, 10)}  ${date.slice(11, 16)}`;
  return `${date.slice(2, 4)}年${date.slice(5, 7)}月${date.slice(8, 10)}日 ${date.slice(11, 19)}`;
}
