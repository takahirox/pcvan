/** This panel is separate from the historical terminal and never gates startup. */
export function mountOfflineControls(root: HTMLElement) {
  const section = document.createElement('section');
  section.className = 'offline-controls';
  section.setAttribute('aria-label', 'オフラインと保存容量');
  section.innerHTML = `
    <p class="network-status" role="status"></p>
    <details>
    <summary>オフライン保存・容量・バックアップ [reconstructed]</summary>
    <button type="button" class="cache-shell">端末をオフライン用に保存</button>
    <p class="shell-status" role="status">端末は未保存です。初回はオンラインで保存してください。</p>
    <p>端末の保存と AI モデルの重みは別です。モデルは自動ダウンロードしません。
      通信表示はブラウザーの申告で、配布元への接続を保証しません。</p>
    <p class="usage-status" role="status"></p>
    <button type="button" class="refresh-storage">保存容量を再確認</button>
    <button type="button" class="persist-storage">データの永続保存をリクエスト</button>
    <p class="persistence-status" role="status"></p>
    <p>容量はサイト全体の概算（端末・モデル・投稿など）です。通常の保存領域は容量不足で
      削除される場合があります。永続保存が許可されても、サイトデータの消去・プライベート閲覧の終了・
      端末故障には備えられません。JSON バックアップはモデルを含みません。
      <a href="#local-backup">JSON バックアップ・復元へ</a></p>
    </details>
  `;
  root.append(section);
  const get = <T extends HTMLElement>(selector: string) => section.querySelector<T>(selector)!;
  const shellStatus = get('.shell-status');
  const enable = get<HTMLButtonElement>('.cache-shell');
  const persist = get<HTMLButtonElement>('.persist-storage');
  function network() {
    get('.network-status').textContent = navigator.onLine
      ? 'オンライン（ブラウザーの通信状態）' : 'オフライン：保存済みの端末・ローカル投稿を利用できます。';
  }
  network();
  window.addEventListener('online', network);
  window.addEventListener('offline', network);

  async function storage() {
    try {
      if (!navigator.storage?.estimate) throw new Error('unsupported');
      const { usage, quota } = await navigator.storage.estimate();
      const mib = (bytes: number | undefined) => bytes === undefined ? '不明' : `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
      get('.usage-status').textContent = `使用量 約 ${mib(usage)} / 上限 約 ${mib(quota)}`;
    } catch { get('.usage-status').textContent = '保存容量を取得できません。このブラウザーでは不明です。'; }
    try {
      if (!navigator.storage?.persisted) throw new Error('unsupported');
      get('.persistence-status').textContent = await navigator.storage.persisted()
        ? '永続保存：許可済みです。バックアップも保存してください。'
        : '永続保存：未許可です。ブラウザーが自動で削除する場合があります。';
    } catch { get('.persistence-status').textContent = '永続保存の状態を取得できません。バックアップを保存してください。'; }
  }
  persist.disabled = !navigator.storage?.persist;
  persist.addEventListener('click', async () => {
    persist.disabled = true;
    try {
      const granted = await navigator.storage.persist();
      await storage();
      if (!granted) get('.persistence-status').textContent = '永続保存は許可されませんでした。JSON バックアップを保存してください。';
    } catch { get('.persistence-status').textContent = '永続保存をリクエストできませんでした。JSON バックアップを保存してください。'; }
    finally { persist.disabled = false; }
  });
  get('.refresh-storage').addEventListener('click', () => { void storage(); });
  void storage();

  function cached(worker: ServiceWorker, action = 'SHELL_STATUS'): Promise<boolean> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => { channel.port1.close(); resolve(false); }, 10000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout); channel.port1.close(); resolve(event.data === true);
      };
      worker.postMessage(action, [channel.port2]);
    });
  }
  function watch(registration: ServiceWorkerRegistration) {
    function status() {
      if (registration.waiting) shellStatus.textContent = '更新版を保存しました。編集中の内容を保存し、このアプリの全タブを閉じて開き直すと更新されます。';
      else if (registration.installing) shellStatus.textContent = '端末を保存しています…';
      else if (registration.active) {
        void cached(registration.active).then((saved) => {
          if (registration.waiting || registration.installing) return;
          shellStatus.textContent = saved
            ? '端末をオフライン用に保存済みです。保存領域の消去・削除後は再保存が必要です。'
            : '端末の保存が不完全または削除されています。オンラインで再保存してください。';
          enable.disabled = saved;
        });
      }
    }
    function installing() {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'redundant') {
          shellStatus.textContent = '端末の保存・更新に失敗しました。オンラインで再試行してください。端末・手動投稿は利用できます。';
          enable.disabled = false;
        } else status();
      });
      status();
    }
    registration.addEventListener('updatefound', installing);
    window.addEventListener('online', status);
    window.addEventListener('offline', status);
    installing();
  }
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) {
    enable.disabled = true;
    shellStatus.textContent = 'オフライン保存には HTTPS / localhost と対応ブラウザーの本番ビルドが必要です。';
  } else {
    const base = new URL(import.meta.env.BASE_URL, window.location.href);
    async function register(repair = false) {
      enable.disabled = true;
      shellStatus.textContent = '端末を保存しています…';
      try {
        const registration = await navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.href, updateViaCache: 'none' });
        if (repair && registration.active) await cached(registration.active, 'SAVE_SHELL');
        watch(registration);
      }
      catch {
        shellStatus.textContent = '端末を保存できませんでした。オンラインで再試行してください。端末・手動投稿は利用できます。';
        enable.disabled = false;
      }
    }
    enable.addEventListener('click', () => { void register(true); });
    // Respect the initial opt-in; later visits check for updates automatically.
    void navigator.serviceWorker.getRegistration(base.href).then((registration) => {
      if (registration?.scope === base.href) void register();
    }).catch(() => { shellStatus.textContent = '保存状態を確認できません。オンラインで保存を再試行してください。'; });
  }
}
