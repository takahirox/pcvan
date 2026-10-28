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
  depth?: number;
  participations?: number;
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
  // A resident's conversational disposition is stable. Context, rather than a
  // fresh coin toss for each event, determines whether they have something to add.
  const engagement = profile.reply * (1 - profile.inactivity) +
    (event.addressed ? .25 : 0) + (interest ? .25 : 0) + Math.max(0, affinity) * .2;
  const threshold = .35 + random(`${seed}:${profile.id}:listening`) * .3 + (event.depth ?? 0) * .15 + (event.participations ?? 0) * .25;
  // Reading opportunities provide the slower board/mail pace. There is no
  // second probabilistic gate or human-specific greeting rule.
  const delay = event.service === 'olt' ? random(`${key}:pace`) * 3000 : 0;
  return { write: relevant && profile.reply > 0 && profile.frequency > 0 && engagement >= threshold,
    readyAt: event.at + delay };
}
