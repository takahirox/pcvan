/** Optional app-shell storage; no registration before the first explicit shell-save action. */
export function createOfflineControls(print: (...text: string[]) => void) {
  let status = '端末は未保存です。CACHE で保存できます。';
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
    function updateStatus() {
      if (registration.waiting) status = '更新版を保存しました。編集中の内容を保存し、このアプリの全タブを閉じて開き直すと更新されます。';
      else if (registration.installing) status = '端末を保存しています…';
      else if (registration.active) {
        void cached(registration.active).then((saved) => {
          if (registration.waiting || registration.installing) return;
          status = saved
            ? '端末をオフライン用に保存済みです。保存領域の消去・削除後は再保存が必要です。'
            : '端末の保存が不完全または削除されています。オンラインで再保存してください。';
          print(status);
        });
      }
    }
    function installing() {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'redundant') {
          status = '端末の保存・更新に失敗しました。オンラインで再試行してください。端末・手動投稿は利用できます。';
          print(status);
        } else updateStatus();
      });
      updateStatus();
    }
    registration.addEventListener('updatefound', installing);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    installing();
  }

  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  const supported = import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator;
  async function register(repair = false) {
    if (!supported) { print('オフライン保存には HTTPS / localhost と対応ブラウザーの本番ビルドが必要です。'); return; }
    status = '端末を保存しています…'; print(status);
    try {
      const registration = await navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.href, updateViaCache: 'none' });
      if (repair && registration.active) await cached(registration.active, 'SAVE_SHELL');
      watch(registration);
    } catch { status = '端末を保存できませんでした。オンラインで CACHE を再試行してください。'; print(status); }
  }
  if (supported) void navigator.serviceWorker.getRegistration(base.href).then((registration) => {
    if (registration?.scope === base.href) void register();
  }).catch(() => { status = '保存状態を確認できません。'; });
  async function storage() {
    print(navigator.onLine ? 'オンライン（ブラウザーの申告）' : 'オフライン');
    print(status, '端末とモデルの重みは別の保存です。CACHE はモデルを取得しません。');
    try {
      const { usage, quota } = await navigator.storage.estimate();
      const mib = (bytes: number | undefined) => bytes === undefined ? '不明' : `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
      print(`サイト全体の使用量 約 ${mib(usage)} / 上限 約 ${mib(quota)}`);
      print(await navigator.storage.persisted() ? '永続保存：許可済み' : '永続保存：未許可');
    } catch { print('容量・永続保存の状態を取得できません。'); }
    print('永続保存でもサイトデータ消去・故障には備えられません。JSON バックアップを保存してください。');
  }
  return {
    storage,
    cache: () => register(true),
    async persist() {
      try { print(await navigator.storage.persist() ? '永続保存：許可されました。' : '永続保存は許可されませんでした。'); }
      catch { print('永続保存をリクエストできませんでした。'); }
      await storage();
    },
  };
}
