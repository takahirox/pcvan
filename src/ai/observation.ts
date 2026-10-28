import type { ResidentProfile } from './personas';

/** Shared cheap observation policy. No model access, human/AI distinction or tab state. */
export interface ResidentObservation {
  id: string;
  service: 'olt' | 'forum' | 'mail';
  authorId: string;
  text: string;
  at: number;
  interested?: boolean;
  addressed?: boolean;
}
export function random(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d); hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967296;
}
export function observeResident(profile: ResidentProfile, event: ResidentObservation, seed: string) {
  const key = `${seed}:${profile.id}:${event.service}:${event.id}`;
  const affinity = profile.affinities[event.authorId.replace('fictional-ai:', '')] ?? 0;
  const interest = profile.interests.some((word) => event.text.includes(word));
  const relevant = event.service !== 'forum' || event.interested || event.addressed || interest || affinity > .5;
  const greeting = event.service === 'olt' && /こんにちは|こんばんは|おはよう|はじめまして/.test(event.text);
  const probability = Math.min(1, profile.reply + (event.addressed || greeting ? .25 : 0) + (interest ? .15 : 0) + affinity * .1) * (1 - profile.inactivity);
  // Individual response readiness; execution may wait for the one worker. OLT
  // uses seconds, boards and private correspondence use a person's reading pace.
  const delay = event.service === 'olt' ? random(`${key}:pace`) * (greeting ? 3000 : 8000)
    : random(`${key}:pace`) ** 2 * (event.service === 'mail' ? 90 : 45) * 60_000 / Math.max(.2, profile.frequency);
  return { write: relevant && profile.reply > 0 && profile.frequency > 0 && random(`${key}:reply`) < probability,
    readyAt: event.at + delay };
}
