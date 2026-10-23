import examples from '../data/pcvan/ftp-examples.json' with { type: 'json' };
import { fileMetadata } from './service-collections';

// Original documentation examples, never seeded into the durable world.
export const ftpFiles = examples;

export function renderFtp(index?: number): string[] {
  const item = index === undefined ? undefined : ftpFiles[index];
  return ['FTP / info.mac（接続先限定）', '同梱の創作テキスト例 / HELP・ABOUT: 案内・来歴',
    ...(item ? [`#${index! + 1}`, ...fileMetadata(item), 'テキストプレビュー', ...item.body.split('\n')]
      : [`ファイル一覧：${ftpFiles.length}件`, ...ftpFiles.flatMap((file, i) =>
        [`#${i + 1} ${fileMetadata(file)[0]}`, ...fileMetadata(file).slice(1)])]),
    'READ 番号: 閲覧 / DOWNLOAD 番号: ファイル取得 / LIST: 一覧',
    item ? 'BACK: ファイル一覧' : 'BACK: インターネット'];
}
