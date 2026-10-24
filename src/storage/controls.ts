/** Native browser actions are invoked only by an explicit application action. */
export function downloadText(text: string, kind: 'backup' | 'terminal') {
  downloadFile(text, `pcvan-${kind}-${new Date().toISOString().replaceAll(':', '-')}.${kind === 'backup' ? 'json' : 'txt'}`,
    kind === 'backup' ? 'application/json' : 'text/plain;charset=utf-8');
}

/** Text keeps exact UTF-8; binary input is passed to Blob without transcoding. */
export function downloadFile(text: string | Uint8Array<ArrayBuffer>, filename: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([typeof text === 'string' ? new TextEncoder().encode(text) : text], { type }));
  let link: HTMLAnchorElement | undefined;
  try {
    link = document.createElement('a');
    link.href = url; link.download = filename; link.hidden = true;
    document.body.append(link); link.click();
  } finally {
    link?.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function chooseBackup(focusRoot: ParentNode = document): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
    document.body.append(input);
    function finish() { input.remove(); focusRoot.querySelector<HTMLElement>(focusRoot === document ? '#command' : '.import-json')?.focus({ preventScroll: true }); }
    input.addEventListener('cancel', () => { finish(); resolve(null); }, { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0]; finish();
      if (file) void file.text().then(resolve, reject); else resolve(null);
    }, { once: true });
    try { input.click(); } catch (error) { finish(); reject(error); }
  });
}

/** Called synchronously from an explicit PICK action; bytes are never decoded as text. */
export function chooseMailFile(): Promise<File | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file'; input.hidden = true;
    document.body.append(input);
    const finish = (file: File | null) => {
      input.remove(); document.querySelector<HTMLElement>('#command')?.focus({ preventScroll: true }); resolve(file);
    };
    input.addEventListener('cancel', () => finish(null), { once: true });
    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true });
    try { input.click(); } catch (error) { input.remove(); reject(error); }
  });
}
