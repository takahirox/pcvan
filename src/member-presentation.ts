import type { Member } from './storage/schema';

// Presentation only: versioned FNV-1a/64 over the full UTF-8 member ID. Never
// truncate a record key, assign by array order, or write on a read. This is a
// synthetic label, not authentication or a privacy/security hash.
export function identityToken(member?: Member): string {
  if (!member) return '不明';
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(`pcvan-forum-v1:${member.id}`)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return `SYN-${hash.toString(32).toUpperCase().padStart(13, '0')}`;
}

export function penName(member?: Member): string {
  const handle = member?.handle.trim();
  return handle && handle !== member?.id && !/fictional-ai:|[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu.test(handle)
    ? handle : '名無し';
}
