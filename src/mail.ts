import { serviceDate } from './calendar';
import type { HistoricalCalendar } from './calendar';
import type { Mail, Member } from './storage/schema';
import type { Mailbox } from './sections';
import { identityToken, penName } from './member-presentation';

export function mailCorrespondent(member?: Member): string {
  return `(${identityToken(member)}) ${penName(member)}`;
}

export const mailHelp = 'INBOX: 受信箱 / SENT: 送信済み / LIST: 一覧 / READ 番号: 本文 / WRITE 宛先: 新規 / REPLY 番号: 返信 / MEMBERS: 宛先一覧';
export function mailboxRows(mail: readonly Mail[], humanId: string | undefined, box: Mailbox): Mail[] {
  if (!humanId) return [];
  return mail.filter((m) => box === 'INBOX' ? m.recipientId === humanId : m.senderId === humanId).sort((a, b) => a.number - b.number);
}
export function renderMailList(mail: readonly Mail[], members: readonly Member[], humanId: string | undefined, box: Mailbox, calendar?: HistoricalCalendar): string[] {
  const rows = mailboxRows(mail, humanId, box);
  return [`メール一覧：${rows.length}件`, ...(!rows.length ? ['現在、メールはありません。'] : rows.map((m) =>
    `#${m.number} ${m.subject} / ${mailCorrespondent(members.find((p) => p.id === (box === 'INBOX' ? m.senderId : m.recipientId)))} / ${serviceDate(m.simulation?.simulatedAt ?? m.createdAt, calendar)}${box === 'INBOX' ? ` [${m.readAt ? '既読' : '未読'}]` : ''}${m.replyToMailId ? ` RE#${mail.find((p) => p.id === m.replyToMailId)?.number ?? '?'}` : ''}`)), mailHelp];
}
export function renderMail(mail: Mail, members: readonly Member[], all: readonly Mail[], calendar?: HistoricalCalendar): string[] {
  const name = (id: string) => mailCorrespondent(members.find((m) => m.id === id));
  return [`メール #${mail.number}`, `差出人：${name(mail.senderId)}`, `宛先：${name(mail.recipientId)}`,
    `日時：${serviceDate(mail.simulation?.simulatedAt ?? mail.createdAt, calendar)} (JST)`, `件名：${mail.subject}`,
    ...(mail.replyToMailId ? [`返信先：#${all.find((m) => m.id === mail.replyToMailId)?.number ?? '?'}`] : []),
    '★内容', mail.body, mailHelp, 'BACK: 戻る / MAIN: MAIN / HELP: 案内', 'コマンド='];
}
