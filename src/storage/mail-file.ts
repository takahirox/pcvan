/** Application limits for browser-local native file mail, not historical host limits. */
export const MAIL_FILE_LIMIT = 262_144;
export interface MailFile { encoding: 'base64'; filename: string; size: number; data: string }
export function validMailFilename(name: string): boolean {
  return name.length <= 64 && /^[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/.test(name) &&
    !name.includes('..') && !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name);
}
export const mailExportName = (file: MailFile): string => `pcvan-mail-${file.filename}`;
export function encodeMailBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
/** Canonical RFC 4648 base64 only, with a bounded decode and exact count. */
export function decodeMailFile(value: unknown): Uint8Array<ArrayBuffer> {
  const file = value as MailFile | null;
  if (!file || typeof file !== 'object' || Array.isArray(file) ||
      Object.keys(file).length !== 4 || !['encoding', 'filename', 'size', 'data'].every((k) => Object.hasOwn(file, k)) ||
      file.encoding !== 'base64' || typeof file.filename !== 'string' || !validMailFilename(file.filename) ||
      !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAIL_FILE_LIMIT || typeof file.data !== 'string' ||
      file.data.length !== Math.ceil(file.size / 3) * 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)) {
    throw new Error('ファイルは0〜262144 bytes、名前は英数字から始まる64文字以内の英数字・_・-・.（末尾の.、..、予約名は不可）にしてください。');
  }
  const binary = atob(file.data);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  if (bytes.length !== file.size || encodeMailBytes(bytes) !== file.data) throw new Error('ファイルの符号化またはバイト数が一致しません。選び直してください。');
  return bytes;
}
