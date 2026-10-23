// Browser-local collection views, not historical submenu transcriptions. Names
// and selectors in the historical fixtures remain the navigation authority.
export type CollectionKind = 'mail' | 'articles' | 'databases' | 'catalog' | 'publications' | 'files' | 'room' | 'conference';

export const mainCollections: Record<string, CollectionKind> = {
  '1': 'mail', '3': 'articles', '4': 'databases', '5': 'articles',
  '6': 'articles', '7': 'articles', '8': 'articles', '9': 'catalog',
  '10': 'publications', '11': 'articles', '12': 'articles',
  '14': 'articles', '15': 'articles', '16': 'articles', '17': 'articles',
  '18': 'articles', '19': 'articles', '20': 'publications', '21': 'articles',
  'X': 'mail',
};

export const serviceCollections: Record<string, CollectionKind> = {
  MAIL: 'mail', LIBRARY: 'articles', OSL: 'files', OLT: 'room', CONFERENCE: 'conference',
};

export const mailboxes = { INBOX: '受信箱', SENT: '送信済み' } as const;
export type Mailbox = keyof typeof mailboxes;

const emptyLists = {
  articles: ['記事一覧：0件', 'まだ記事がありません。'],
  databases: ['データベース一覧：0件', 'まだデータベースがありません。'],
  catalog: ['商品カタログ：0件', 'まだ商品がありません。'],
  publications: ['刊行物一覧：0件', 'まだ刊行物がありません。'],
  files: ['ファイル一覧：0件', 'まだファイルがありません。'],
  conference: ['発言一覧：0件', 'まだ発言はありません。WRITE で最初の発言をどうぞ。'],
  room: ['参加者：0人', '現在、ほかの参加者はいません。', 'BACK で退出できます。'],
};

export function renderCollection(title: string, kind: CollectionKind): string[] {
  return [title, ...(kind === 'mail'
    ? ['受信箱：0件 / 送信済み：0件', '現在、メールはありません。', 'INBOX: 受信箱 / SENT: 送信済み']
    : emptyLists[kind])];
}
