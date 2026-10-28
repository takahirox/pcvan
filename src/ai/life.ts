import type { ResidentProfile } from './personas';
import { random } from './observation';

const HOUR = 3_600_000;
export function routineFactor(profile: ResidentProfile, at: number): number {
  const local = new Date(at + profile.utcOffsetMinutes * 60_000);
  const hours = [0, 6].includes(local.getUTCDay()) ? profile.weekendHours : profile.weekdayHours;
  return hours.includes(local.getUTCHours()) ? 1 : .04;
}
/** A person's current session, derived from their schedule, never a visitor read.
 * Both room attendance and slower reading opportunities use this same life. */
export function residentSession(profile: ResidentProfile, at: number, seed: string) {
  const minutes = profile.sessionMinutes ?? 14;
  const cycle = (minutes + 5) * 60_000;
  const phase = random(`${seed}:olt:${profile.id}:phase`) * cycle;
  const slot = Math.floor((at - phase) / cycle);
  const draw = (key: string) => random(`${seed}:olt:${profile.id}:${slot}:${key}`);
  const since = slot * cycle + phase;
  const until = since + minutes * (.7 + draw('duration') * .3) * 60_000;
  const day = Math.floor((since + profile.utcOffsetMinutes * 60_000) / (24 * HOUR));
  const online = profile.frequency > 0 && at < until && routineFactor(profile, since) === 1 &&
    draw('visit') < Math.min(.95, profile.participation * profile.frequency) &&
    random(`${seed}:olt:${profile.id}:away:${day}`) >= (profile.absence ?? .12);
  return { online, since, until, nextAt: online ? until : since + cycle, draw };
}
