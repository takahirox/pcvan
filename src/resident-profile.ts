import type { Backup } from './storage/schema';
import { personas, personaMemberId, residentProfiles } from './ai/personas';
import { identityToken, penName } from './member-presentation';

// Keep the argument literal: current handles may contain repeated internal spaces.
export function profileArgument(line: string): string | null {
  const match = /^\s*PROFILE(?:\s+([\s\S]*))?$/i.exec(line);
  return match ? (match[1] ?? '').trim() : null;
}

function bounded(text: string, limit: number): string {
  const chars = Array.from(text.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' '));
  return chars.length > limit ? chars.slice(0, limit - 1).join('') + '…' : chars.join('');
}

/** Public projection only. No initialization, attendance, model or persistence calls. */
export function renderResidentProfile(data: Pick<Backup, 'members' | 'settings'>, argument: string, inRoom = false): string[] {
  if (!argument) return [`使い方：${inRoom ? '/' : ''}PROFILE 宛先ID・SYN-表示ID・ハンドル`];
  const unavailable = ['プロフィールを利用できません。'];
  if (/^INET#/i.test(argument)) return unavailable;
  // Reserved destination keys (including missing residents) precede tokens, then
  // exact safe handles. Resolve across all members so unsupported/human names
  // cannot silently select a supported namesake. Never choose by array order.
  const key = personas.find((p) => argument === p.id || argument === personaMemberId(p.id));
  const byId = data.members.filter((m) => m.id === (key ? personaMemberId(key.id) : argument));
  const matches = key || byId.length ? byId
    : /^SYN-[0-9A-V]{13}$/i.test(argument)
      ? data.members.filter((m) => identityToken(m) === argument.toUpperCase())
      : data.members.filter((m) => penName(m) === argument);
  if (matches.length > 1) return ['同じ表示の会員が複数います。宛先IDまたはSYN-表示IDを指定してください。'];
  const member = matches[0];
  const supported = member?.actor === 'ai' && personas.find((p) => personaMemberId(p.id) === member.id);
  const profile = supported && residentProfiles(data).find((p) => p.id === supported.id);
  if (!member || !profile) return unavailable;
  return [`ハンドル：${bounded(penName(member), 80)}`, `表示ID：${identityToken(member)}`,
    `職業：${bounded(profile.occupation, 80)}`, `興味：${profile.interests.slice(0, 8).map((s) => bounded(s, 40)).join('、')}`];
}
