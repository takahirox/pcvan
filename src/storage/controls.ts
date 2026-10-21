import { RepositoryError, validateBackup } from './repository';
import { canPopulateCommunity } from './community';
import { WORLD_SETTING } from './schema';
import type { Backup } from './schema';
import type { LocalRepository } from './repository';

export function mountStorageControls(root: HTMLElement, repository: Promise<LocalRepository>,
  enqueue: (action: () => Promise<void>) => Promise<void>, restoreJson: (text: string) => Promise<void>,
  populate: () => Promise<void>, resetWorld: () => Promise<void>) {
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
    <h2>初期状態に戻す</h2>
    <p id="reset-description">このブラウザーに保存した投稿・会員・既読・AIの活動設定・表示設定・履歴を削除し、最初の30件の投稿がある状態に戻します。この操作は取り消せません。</p>
    <p>AI住人のプロフィール・モデル読込への同意も初期化します。保存済みのモデルと端末のオフライン用キャッシュは削除しません。
      必要なら先に「JSON バックアップを保存」を選んでください。</p>
    <button type="button" class="reset-world" aria-haspopup="dialog" disabled>初期状態に戻す</button>
    </details>
    <details><summary>初期状態・来歴</summary><p class="community-provenance"></p></details>
    <div class="community-population" hidden>
      <p>空のコミュニティに、10人の住人による30件・8つの話題を追加できます。
        MITI 資料室と DAISIZEN 自然の森／ＦＲＥＥに、最近約2週間の架空の会話を保存します。
        アプリ用に書いた原文で、史料やモデル生成ではありません。既存の会員・掲示板設定を保持します。</p>
      <button type="button" class="populate-community">この内容で空のコミュニティを準備</button>
    </div>
    <p class="storage-status" role="status" aria-label="ローカル保存の状態" aria-live="polite">ローカル保存を準備しています…</p>
  `;
  root.append(section);
  const confirmation = document.createElement('dialog');
  confirmation.className = 'reset-confirmation';
  confirmation.setAttribute('aria-labelledby', 'reset-heading');
  confirmation.setAttribute('aria-describedby', 'reset-warning');
  confirmation.innerHTML = `<h2 id="reset-heading">初期状態に戻しますか？</h2>
    <p id="reset-warning">保存した投稿・会員・既読・AI住人のプロフィール・活動設定・モデル読込への同意・表示設定・履歴をすべて削除します。この操作は取り消せません。
      最初の10人・30件の投稿がある状態に戻し、開いている他のタブも再読み込みします。JSON バックアップで以前の状態を復元できます。</p>
    <button type="button" class="reset-cancel" autofocus>キャンセル</button>
    <button type="button" class="reset-confirm">すべて削除して初期状態に戻す</button>`;
  root.append(confirmation);
  root.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a[href="#local-backup"]')) {
      section.querySelector('details')!.open = true;
    }
  });
  const backup = section.querySelector<HTMLButtonElement>('.backup')!;
  const file = section.querySelector<HTMLInputElement>('.backup-file')!;
  const restore = section.querySelector<HTMLButtonElement>('.restore')!;
  const reset = section.querySelector<HTMLButtonElement>('.reset-world')!;
  const status = section.querySelector<HTMLElement>('.storage-status')!;
  let busy = false;
  const reportError = (error: unknown) => {
    status.textContent = error instanceof RepositoryError && error.code === 'quota'
      ? '保存容量が足りません。JSON バックアップを保存し、ブラウザーの空き容量を確認してください。'
      : `ローカル保存エラー: ${error instanceof Error ? error.message : String(error)}`;
  };
  const population = section.querySelector<HTMLElement>('.community-population')!;
  const populateButton = section.querySelector<HTMLButtonElement>('.populate-community')!;
  const enable = () => {
    populateButton.disabled = busy;
    backup.disabled = busy;
    file.disabled = busy;
    restore.disabled = busy || !file.files?.length;
    reset.disabled = busy;
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
  populateButton.addEventListener('click', async () => {
    if (busy || !window.confirm('30件の架空の会話を2つの掲示板へ追加します。モデルのダウンロードはありません。続けますか？')) return;
    busy = true; enable();
    try {
      await enqueue(populate);
      status.textContent = 'コミュニティの状態を確認しました。投稿は LIST / READ で読めます。他のタブは再読み込みしてください。';
    } catch (error) { reportError(error); }
    finally { busy = false; enable(); }
  });
  function dismiss() { confirmation.close(); reset.focus({ preventScroll: true }); }
  reset.addEventListener('click', () => { if (!busy) confirmation.showModal(); });
  confirmation.querySelector('.reset-cancel')!.addEventListener('click', dismiss);
  confirmation.addEventListener('cancel', (event) => { event.preventDefault(); dismiss(); });
  confirmation.addEventListener('click', (event) => {
    const box = confirmation.getBoundingClientRect();
    if (event.target === confirmation && (event.clientX < box.left || event.clientX > box.right ||
        event.clientY < box.top || event.clientY > box.bottom)) dismiss();
  });
  confirmation.querySelector('.reset-confirm')!.addEventListener('click', async () => {
    if (busy) return;
    dismiss(); busy = true; enable();
    try {
      // The caller invalidates AI immediately, before waiting for queued storage.
      await resetWorld();
      reportReset();
    } catch (error) { reportError(error); }
    finally { busy = false; enable(); }
  });
  function reportReset() {
    status.textContent = '初期状態に戻しました。10人の住人と30件の投稿を準備しました。AI の利用には改めて同意が必要です。';
  }
  function refresh(content: Backup) {
    population.hidden = !canPopulateCommunity(content);
    const row = content.settings.find((s) => s.id === WORLD_SETTING);
    section.querySelector('.community-provenance')!.textContent = row
      ? `初期状態・来歴 / ${JSON.stringify(row.value)} / local-seed:fictional はアプリ同梱の創作原文です。local-ai:webllm: は後からモデルで生成した投稿です。`
      : '';
  }
  return { reportError, reportReset, refresh };
}
