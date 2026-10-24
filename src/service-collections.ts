import { oslState } from './storage/schema';
import type { Backup } from './storage/schema';
import { calendarSetting, serviceDate } from './calendar';
import { identityToken, penName } from './member-presentation';
import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import examples from '../data/pcvan/daisizen-collections.json' with { type: 'json' };

export type ReadingService = 'LIBRARY' | 'OSL';
export interface ServiceDownload {
  filename: string;
  body: string;
  returnTo(): readonly string[];
}

export interface ReadingItem {
  title: string;
  body: string;
  filename?: string;
  purpose?: string;
  date?: string;
  author?: string;
}

export function serviceCategories(service: ReadingService): readonly string[] {
  return evidence.daisizen.collections[service].labels;
}

type CatalogContent = Partial<Pick<Backup, 'settings' | 'members'>>;
export function categoryItems(service: ReadingService, category: number, content: CatalogContent = {}): readonly ReadingItem[] {
  const collection: Readonly<Record<string, readonly ReadingItem[]>> = examples[service];
  const bundled = collection[String(category)] ?? [];
  if (service !== 'OSL') return bundled;
  return [...bundled.map((item) => ({ ...item, author: '同梱の創作（著者設定なし）' })),
    ...oslState(content).entries.filter((row) => row.category === category).sort((a, b) => a.number - b.number).map((row) => {
      const author = content.members?.find((m) => m.id === row.authorId);
      return { ...row, date: serviceDate(row.createdAt, calendarSetting(content)), author: `${penName(author)} (${identityToken(author)})` };
    })];
}

export function fileMetadata(item: ReadingItem): string[] {
  return [`${item.filename} / ${item.title}`, `用途：${item.purpose}`,
    ...(item.author ? [`著者：${item.author}`] : []),
    `日付：${item.date} / サイズ：${new TextEncoder().encode(item.body).byteLength} bytes（UTF-8）`];
}

export function renderServiceDirectory(service: ReadingService): string[] {
  return [...serviceCategories(service).map((label, index) => `${index + 1} ${label}`),
    `1–${serviceCategories(service).length}: 分類を選択 / LIST: 分類一覧`];
}

export function renderServiceCategory(service: ReadingService, category: number, content: CatalogContent = {}): string[] {
  const items = categoryItems(service, category, content);
  return [serviceCategories(service)[category - 1]!,
    `${service === 'LIBRARY' ? '記事一覧' : 'ファイル一覧'}：${items.length}件`,
    ...(items.length ? items.flatMap((item, index) => service === 'LIBRARY'
      ? [`#${index + 1} ${item.title}`]
      : [`#${index + 1} ${fileMetadata(item)[0]}`, ...fileMetadata(item).slice(1)])
      : [service === 'LIBRARY' ? 'まだ記事がありません。' : 'まだファイルがありません。']),
    ...(service === 'OSL' ? ['DOWNLOAD 番号: ファイル取得', ...([1, 2].includes(category) ? ['REGISTER: オリジナルのテキストを登録'] : [])] : []),
    'READ 番号: 閲覧 / LIST: 一覧 / BACK: 分類一覧'];
}

export function renderServiceItem(service: ReadingService, category: number, index: number, content: CatalogContent = {}): string[] {
  const item = categoryItems(service, category, content)[index];
  if (!item) return ['その番号の項目はありません。LIST で一覧を確認してください。'];
  return [serviceCategories(service)[category - 1]!,
    ...(service === 'LIBRARY' ? [`#${index + 1} ${item.title}`]
      : [`#${index + 1}`, ...fileMetadata(item), 'テキストプレビュー']),
    ...item.body.split('\n'),
    ...(service === 'OSL' ? ['DOWNLOAD 番号: ファイル取得'] : []), 'LIST / BACK: 一覧に戻る'];
}
