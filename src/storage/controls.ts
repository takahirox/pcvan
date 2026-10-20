import { RepositoryError, validateBackup } from './repository';
import type { LocalRepository } from './repository';

export function mountStorageControls(root: HTMLElement, repository: Promise<LocalRepository>,
  enqueue: (action: () => Promise<void>) => Promise<void>, restoreJson: (text: string) => Promise<void>) {
  const section = document.createElement('section');
  section.className = 'storage-controls';
  section.id = 'local-backup';
  section.tabIndex = -1;
  section.setAttribute('aria-label', 'ローカルデータ');
  section.innerHTML = `
    <details>
    <summary>JSON バックアップ・復元</summary>
    <div class="storage-actions">
      <button type="button" class="backup" disabled>JSON バックアップを保存</button>
      <label>復元ファイル <input class="backup-file" type="file" accept=".json,application/json" disabled /></label>
      <button type="button" class="restore" disabled>全データを置き換えて復元</button>
    </div>
    <p>データはこのブラウザー内に保存されます。容量制限やブラウザーの操作で消えることがあります。
      大切なデータは JSON バックアップを保存してください。</p>
    </details>
    <p class="storage-status" role="status" aria-label="ローカル保存の状態" aria-live="polite">ローカル保存を準備しています…</p>
  `;
  root.append(section);
  root.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a[href="#local-backup"]')) {
      section.querySelector('details')!.open = true;
    }
  });
  const backup = section.querySelector<HTMLButtonElement>('.backup')!;
  const file = section.querySelector<HTMLInputElement>('.backup-file')!;
  const restore = section.querySelector<HTMLButtonElement>('.restore')!;
  const status = section.querySelector<HTMLElement>('.storage-status')!;
  let busy = false;
  const reportError = (error: unknown) => {
    status.textContent = error instanceof RepositoryError && error.code === 'quota'
      ? '保存容量が足りません。JSON バックアップを保存し、ブラウザーの空き容量を確認してください。'
      : `ローカル保存エラー: ${error instanceof Error ? error.message : String(error)}`;
  };
  const enable = () => {
    backup.disabled = busy;
    file.disabled = busy;
    restore.disabled = busy || !file.files?.length;
  };
  file.addEventListener('change', enable);
  void repository.then(() => { status.textContent = 'ローカル保存を利用できます。'; enable(); }).catch(reportError);
  backup.addEventListener('click', async () => {
    busy = true; enable();
    try {
      await enqueue(async () => {
        const json = await (await repository).exportJson();
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `pcvan-backup-${new Date().toISOString().replaceAll(':', '-')}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      status.textContent = 'バックアップのダウンロードを開始しました。保存先を確認してください。';
    } catch (error) { reportError(error); }
    finally { busy = false; enable(); }
  });
  restore.addEventListener('click', async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    busy = true; enable();
    try {
      const text = await selected.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { throw new RepositoryError('validation', 'Backup is not valid JSON.'); }
      validateBackup(parsed);
      if (!window.confirm('このブラウザー内の全データ（投稿・会員・設定・履歴）をバックアップで置き換えます。続けますか？')) return;
      await enqueue(() => restoreJson(text));
      status.textContent = 'バックアップを復元しました。他のタブは再読み込みしてください。';
      file.value = '';
    } catch (error) { reportError(error); }
    finally { busy = false; enable(); }
  });
  return { reportError };
}
