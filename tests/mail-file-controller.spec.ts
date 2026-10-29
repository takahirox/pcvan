import { expect, test } from '@playwright/test';

test('file controller pins identities, invalidates asynchronous waits and consumes failed/repeated acquisition', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374/tests/module.html');
  const result = await page.evaluate(async () => {
    const rp = '/src/storage/repository.ts', cp = '/src/commands.ts';
    const { openRepository, ACTIVE_MEMBER_SETTING } = await import(rp);
    const { TerminalCommands } = await import(cp);
    const repo = await openRepository('file-controller-world');
    await repo.openActivity();
    const human = await repo.createHumanMember('送る人'), second = await repo.createHumanMember('別の人');
    await repo.put('settings', { id: ACTIVE_MEMBER_SETTING, value: human.id });
    let readGate: Promise<void> | undefined, repoGate: Promise<void> | undefined, forceAck = false;
    let enteredRepository: (() => void) | undefined;
    const lines: string[] = [], check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
    const commands = new TerminalCommands({
      print: (...s: string[]) => lines.push(...s), read: async () => { await readGate; return repo.exportBackup(); },
      repository: async () => { enteredRepository?.(); await repoGate; return forceAck ? new Proxy(repo, { get(target, key) {
        if (key === 'createHumanFileMail') return async (...args: Parameters<typeof repo.createHumanFileMail>) => {
          await repo.createHumanFileMail(...args); throw new Error('uncertain acknowledgement');
        };
        return Reflect.get(target, key);
      } }) : repo; },
      mailbox: () => ({ box: 'SENT', title: 'MAIL' }), destination: () => null,
      ai: { stop() {} }, navigate() {},
    });
    let picked: HTMLInputElement | undefined;
    const click = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () { if (this.type === 'file') picked = this; else click.call(this); };
    const select = async (file: File) => {
      check(picked, `missing picker: ${lines.join(' / ')}`);
      const input = picked!; const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
      input.dispatchEvent(new Event('change')); picked = undefined;
      // Wait for the actual File read and validation callback without a fixed sleep.
      await new Promise<void>((resolve) => { const poll = () => { if (commands.fileInputContext?.includes(':review:') || !commands.fileInputContext) resolve(); else setTimeout(poll, 1); }; poll(); });
    };
    const prepare = async () => {
      await commands.submit('WRITE-FILE hoshimori'); await commands.submit('private subject'); await commands.submit('PICK');
      await select(new File([new Uint8Array([0, 255, 192, 10, 13])], 'test.bin'));
    };
    try {
      await prepare();
      const resident = (await repo.list('members')).find((m) => m.id === 'fictional-ai:hoshimori')!;
      await repo.put('members', { ...resident, handle: '改名された人' });
      forceAck = true; await commands.submit('Y'); forceAck = false;
      check((await repo.list('mail')).length === 1, 'uncertain acknowledgement lost committed file');
      await commands.submit('Y'); check((await repo.list('mail')).length === 1, 'failed save auto retried');
      await commands.submit('EDIT'); await commands.submit('PICK');
      check(!picked, 'uncertain committed contents became editable');
      await commands.submit('REVIEW'); await commands.submit('Y');
      const first = (await repo.list('mail'))[0]!;
      check(first.recipientId === resident.id && first.file?.size === 5, 'rename retargeted file');
      check((await repo.list('mail')).length === 1, 'uncertain acknowledgement duplicated file');
      // Cancel late file reads, then let a real read complete. It cannot install a review.
      await commands.submit('WRITE-FILE hoshimori'); await commands.submit('late file'); await commands.submit('PICK');
      let finishRead!: (buffer: ArrayBuffer) => void;
      const file = new File([], 'late.bin'); Object.defineProperty(file, 'arrayBuffer', { value: () => new Promise<ArrayBuffer>((resolve) => { finishRead = resolve; }) });
      const input = picked!, dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; input.dispatchEvent(new Event('change')); picked = undefined;
      // Let the picker promise enter its File read callback.
      await Promise.resolve();
      check(!!finishRead, 'late read gate not entered');
      await commands.submit('CANCEL'); const afterCancel = lines.length; finishRead(new ArrayBuffer(0));
      await new Promise((resolve) => setTimeout(resolve, 0)); check(lines.length === afterCancel, 'late read printed a review');
      await prepare();
      let release!: () => void; repoGate = new Promise<void>((resolve) => { release = resolve; });
      const entered = new Promise<void>((resolve) => { enteredRepository = resolve; });
      const pendingSave = commands.submit('Y'); await entered; enteredRepository = undefined;
      commands.invalidate(); release(); await pendingSave; repoGate = undefined;
      check((await repo.list('mail')).length === 1, 'invalidated repository await saved a file');
      await prepare();
      await repo.put('settings', { id: ACTIVE_MEMBER_SETTING, value: second.id }); await commands.submit('Y');
      check((await repo.list('mail')).length === 1 && commands.recordsHistory, 'selected human change kept file draft');
      await repo.put('settings', { id: ACTIVE_MEMBER_SETTING, value: human.id });
      // Acquisition failures and repeats consume approval even when URL creation throws.
      let downloads = 0, fail = false;
      const nativeUrl = URL.createObjectURL, nativeClick = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = (blob) => { if (fail) throw new Error('synthetic browser failure'); return nativeUrl(blob); };
      HTMLAnchorElement.prototype.click = function () { downloads++; };
      try {
        await commands.submit('ACQUIRE 1'); fail = true; await commands.submit('Y'); fail = false; await commands.submit('Y');
        check(downloads === 0, 'failed acquisition reused approval');
        await commands.submit('ACQUIRE 1'); await Promise.all([commands.submit('Y'), commands.submit('Y'), commands.submit('Y')]);
        check(downloads === 1, 'concurrent approval duplicated acquisition');
        await commands.submit('ACQUIRE 1');
        readGate = new Promise<void>((resolve) => { release = resolve; });
        const acquiring = commands.submit('Y'); commands.invalidate(); release(); await acquiring; readGate = undefined;
        check(downloads === 1, 'invalidated acquisition crossed read await');
        await commands.submit('ACQUIRE 1'); await repo.delete('mail', first.id); await commands.submit('Y');
        check(downloads === 1, 'deleted saved letter downloaded');
        await repo.createHumanFileMail({ id: 'replacement', senderId: human.id, recipientId: resident.id, subject: 'replacement',
          file: { encoding: 'base64', filename: 'test.bin', size: 0, data: '' } });
        await commands.submit('ACQUIRE 2'); await repo.put('settings', { id: ACTIVE_MEMBER_SETTING, value: second.id }); await commands.submit('Y');
        check(downloads === 1, 'changed human acquired old selection');
      } finally { URL.createObjectURL = nativeUrl; HTMLAnchorElement.prototype.click = nativeClick; }
      return { count: (await repo.list('mail')).length, lines: lines.join('\n') };
    } finally { HTMLInputElement.prototype.click = click; repo.close(); }
  });
  expect(result.count).toBe(1); expect(result.lines).toContain('利用者が変更されました');
  expect(result.lines).toContain('取得できませんでした'); expect(result.lines).not.toContain('AP/ACg0=');
});
