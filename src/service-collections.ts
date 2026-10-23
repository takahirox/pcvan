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
}

export function serviceCategories(service: ReadingService): readonly string[] {
  return evidence.daisizen.collections[service].labels;
}

export function categoryItems(service: ReadingService, category: number): readonly ReadingItem[] {
  const collection: Readonly<Record<string, readonly ReadingItem[]>> = examples[service];
  return collection[String(category)] ?? [];
}

export function fileMetadata(item: ReadingItem): string[] {
  return [`${item.filename} / ${item.title}`, `用途：${item.purpose}`,
    `日付：${item.date} / サイズ：${new TextEncoder().encode(item.body).byteLength} bytes（UTF-8）`];
}

export function renderServiceDirectory(service: ReadingService): string[] {
  return [...serviceCategories(service).map((label, index) => `${index + 1} ${label}`),
    `1–${serviceCategories(service).length}: 分類を選択 / LIST: 分類一覧`];
}

export function renderServiceCategory(service: ReadingService, category: number): string[] {
  const items = categoryItems(service, category);
  return [serviceCategories(service)[category - 1]!,
    `${service === 'LIBRARY' ? '記事一覧' : 'ファイル一覧'}：${items.length}件`,
    ...(items.length ? items.flatMap((item, index) => service === 'LIBRARY'
      ? [`#${index + 1} ${item.title}`]
      : [`#${index + 1} ${fileMetadata(item)[0]}`, ...fileMetadata(item).slice(1)])
      : [service === 'LIBRARY' ? 'まだ記事がありません。' : 'まだファイルがありません。']),
    ...(service === 'OSL' ? ['DOWNLOAD 番号: ファイル取得'] : []),
    'READ 番号: 閲覧 / LIST: 一覧 / BACK: 分類一覧'];
}

export function renderServiceItem(service: ReadingService, category: number, index: number): string[] {
  const item = categoryItems(service, category)[index]!;
  return [serviceCategories(service)[category - 1]!,
    ...(service === 'LIBRARY' ? [`#${index + 1} ${item.title}`]
      : [`#${index + 1}`, ...fileMetadata(item), 'テキストプレビュー']),
    ...item.body.split('\n'),
    ...(service === 'OSL' ? ['DOWNLOAD 番号: ファイル取得'] : []), 'LIST / BACK: 一覧に戻る'];
}
