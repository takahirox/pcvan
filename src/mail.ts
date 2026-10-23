import { serviceDate } from './calendar';
import type { HistoricalCalendar } from './calendar';
import type { Mail, Member } from './storage/schema';
import type { Mailbox } from './sections';
import { identityToken, penName } from './member-presentation';

export function mailCorrespondent(member?: Member): string {
  return `(${identityToken(member)}) ${penName(member)}`;
}

export const internetMailHelp = 'WRITE INET#address / COMPOSE INET#address（例: INET#observer@letters.example.invalid）。このブラウザー内だけに保存し、メールサーバーへ送信しません。';
export const mailHelp = 'INBOX: 受信箱 / SENT: 送信済み / LIST: 一覧 / READ 番号: 本文 / WRITE 宛先: 新規 / REPLY 番号: 返信 / MEMBERS: 宛先一覧 / INET#address: Internet宛先（ブラウザー内保存のみ）';
export function mailboxRows(mail: readonly Mail[], humanId: string | undefined, box: Mailbox): Mail[] {
  if (!humanId) return [];
  return mail.filter((m) => box === 'INBOX' ? m.recipientId === humanId : m.senderId === humanId).sort((a, b) => a.number - b.number);
}
export function renderMailList(mail: readonly Mail[], members: readonly Member[], humanId: string | undefined, box: Mailbox, calendar?: HistoricalCalendar): string[] {
  const rows = mailboxRows(mail, humanId, box);
  return [`メール一覧：${rows.length}件`, ...(!rows.length ? ['現在、メールはありません。'] : rows.map((m) =>
    `#${m.number} ${m.subject} / ${box === 'INBOX' && m.senderInternetAddress !== undefined ? m.senderInternetAddress : box === 'SENT' && m.internetAddress !== undefined ? `INET#${m.internetAddress}` : mailCorrespondent(members.find((p) => p.id === (box === 'INBOX' ? m.senderId : m.recipientId)))} / ${serviceDate(m.simulation?.simulatedAt ?? m.createdAt, calendar)} [${box === 'INBOX' ? (m.readAt ? '既読' : '未読') : (m.internetAddress !== undefined ? 'ブラウザー内保存・外部送信なし' : m.recipientConfirmation ? '既読確認あり' : '既読確認なし')}]${m.senderInternetAddress !== undefined ? ` [創作サンプル・ローカル追加] 宛先：${mailCorrespondent(members.find((p) => p.id === m.recipientId))}` : ''}${m.replyToMailId ? ` RE#${mail.find((p) => p.id === m.replyToMailId)?.number ?? '?'}` : ''}`)), mailHelp];
}
export function renderMail(mail: Mail, members: readonly Member[], all: readonly Mail[], calendar?: HistoricalCalendar): string[] {
  const name = (id: string | undefined) => mailCorrespondent(members.find((m) => m.id === id));
  return [`メール #${mail.number}`, `差出人：${mail.senderInternetAddress ?? name(mail.senderId)}`, `宛先：${mail.internetAddress !== undefined ? `INET#${mail.internetAddress}` : name(mail.recipientId)}`,
    `日時：${serviceDate(mail.simulation?.simulatedAt ?? mail.createdAt, calendar)} (JST)`, `件名：${mail.subject}`,
    ...(mail.senderInternetAddress !== undefined ? ['創作サンプル：設定からローカルに追加した手紙です。実際のネットワーク受信ではありません。'] : []),
    ...(mail.internetAddress !== undefined ? ['このブラウザー内に保存済み。メールサーバーへ送信していません。'] : []),
    ...(mail.internetAddress === undefined && members.some((m) => m.id === mail.senderId && m.actor === 'human') ? [mail.recipientConfirmation
      ? `既読確認：${serviceDate(mail.recipientConfirmation.at, calendar)} (JST)` : '既読確認：確認なし'] : []),
    ...(mail.replyToMailId ? [`返信先：#${all.find((m) => m.id === mail.replyToMailId)?.number ?? '?'}`] : []),
    '★内容', mail.body, mailHelp, 'BACK: 戻る / MAIN: MAIN / HELP: 案内', 'コマンド='];
}
