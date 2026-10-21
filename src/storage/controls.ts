/** Native browser actions are invoked only by a terminal command. */
export function downloadText(text: string, kind: 'backup' | 'terminal') {
  const url = URL.createObjectURL(new Blob([text], { type: kind === 'backup' ? 'application/json' : 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `pcvan-${kind}-${new Date().toISOString().replaceAll(':', '-')}.${kind === 'backup' ? 'json' : 'txt'}`;
  link.hidden = true;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function chooseBackup(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
    document.body.append(input);
    function finish() { input.remove(); document.querySelector<HTMLElement>('#command')?.focus({ preventScroll: true }); }
    input.addEventListener('cancel', () => { finish(); resolve(null); }, { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0]; finish();
      if (file) void file.text().then(resolve, reject); else resolve(null);
    }, { once: true });
    try { input.click(); } catch (error) { finish(); reject(error); }
  });
}
