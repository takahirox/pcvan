import type { Backup, Post } from './storage/schema';
import type { ForumDestination } from './storage/repository';
import { activeHuman } from './forums';

interface ComposeDraft { authorId: string; title: string; body: string; replyToPostId?: string }
interface ComposerActions {
  createMember(handle: string): Promise<void>;
  selectMember(id: string): Promise<void>;
  save(destination: ForumDestination, draft: ComposeDraft): Promise<void>;
}

/** All prompts and controls are original reconstruction, never a transcript. */
export function mountComposer(root: HTMLElement, actions: ComposerActions) {
  const section = document.createElement('section');
  section.className = 'member-controls';
  section.setAttribute('aria-label', 'フォーラムの利用者設定');
  section.innerHTML = `
    <details>
    <summary>利用者設定・新規登録 [reconstructed]</summary>
    <label for="local-member">ローカル利用者</label>
    <select id="local-member" class="member"></select>
    <label>新しいハンドル <input class="handle" type="text" /></label>
    <button type="button" class="create-member">人間の利用者を作成</button>
    <p class="member-message" aria-live="polite"></p>
    </details>
    <dialog aria-labelledby="compose-heading">
      <h2 id="compose-heading">投稿エディター [D / reconstructed]</h2>
      <p>1996–97年の編集・確認・返信キーは未確認です。この操作は創作の再構成です。</p>
      <p class="destination"></p>
      <p>初回送信時にローカル掲示板を作成します。創作デモはコピーされません。</p>
      <div class="edit-fields">
        <label>投稿タイトル <input class="post-title" type="text" /></label>
        <label>投稿本文 <textarea class="post-body" rows="8"></textarea></label>
      </div>
      <pre class="post-preview" hidden></pre>
      <p class="compose-error" aria-live="polite"></p>
      <button type="button" class="review">内容を確認</button>
      <button type="button" class="edit" hidden>編集に戻る</button>
      <button type="button" class="send-post" hidden>この内容で投稿する</button>
      <button type="button" class="cancel-post">投稿をキャンセル</button>
    </dialog>
  `;
  root.append(section);
  const select = section.querySelector<HTMLSelectElement>('.member')!;
  const handle = section.querySelector<HTMLInputElement>('.handle')!;
  const create = section.querySelector<HTMLButtonElement>('.create-member')!;
  const message = section.querySelector<HTMLElement>('.member-message')!;
  const dialog = section.querySelector<HTMLDialogElement>('dialog')!;
  const title = section.querySelector<HTMLInputElement>('.post-title')!;
  const body = section.querySelector<HTMLTextAreaElement>('.post-body')!;
  const fields = section.querySelector<HTMLElement>('.edit-fields')!;
  const preview = section.querySelector<HTMLElement>('.post-preview')!;
  const error = section.querySelector<HTMLElement>('.compose-error')!;
  const review = section.querySelector<HTMLButtonElement>('.review')!;
  const edit = section.querySelector<HTMLButtonElement>('.edit')!;
  const send = section.querySelector<HTMLButtonElement>('.send-post')!;
  const cancel = section.querySelector<HTMLButtonElement>('.cancel-post')!;
  let destination: ForumDestination;
  let authorId: string;
  let parent: Post | undefined;
  let composing = false;
  let saving = false;
  let reviewed: ComposeDraft | undefined;

  function editing(value: boolean): void {
    fields.hidden = !value;
    preview.hidden = value;
    review.hidden = !value;
    edit.hidden = value;
    send.hidden = value;
  }
  dialog.addEventListener('compositionstart', () => { composing = true; });
  dialog.addEventListener('compositionend', () => { composing = false; });
  // Enter in a title or IME confirmation can never activate a send button.
  title.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault();
  });
  review.addEventListener('click', () => {
    if (composing) return;
    if (!title.value.trim() || !body.value.trim()) {
      error.textContent = 'タイトルと本文を入力してください。空白だけでは投稿できません。';
      return;
    }
    reviewed = { authorId, title: title.value, body: body.value,
      ...(parent ? { replyToPostId: parent.id } : {}) };
    preview.textContent = `${parent ? `RE#${parent.number}\n` : ''}${title.value}\n\n${body.value}`;
    error.textContent = '';
    editing(false);
    edit.focus();
  });
  edit.addEventListener('click', () => { editing(true); title.focus(); });
  send.addEventListener('click', async () => {
    if (!reviewed || composing || saving) return;
    saving = true;
    send.disabled = edit.disabled = cancel.disabled = true;
    try {
      await actions.save(destination, reviewed);
      dialog.close();
    } catch (reason) {
      error.textContent = `投稿を保存できませんでした。入力は残っています。${reason instanceof Error ? reason.message : String(reason)}`;
    } finally {
      saving = false;
      send.disabled = edit.disabled = cancel.disabled = false;
    }
  });
  dialog.addEventListener('cancel', (event) => { if (saving) event.preventDefault(); });
  cancel.addEventListener('click', () => { if (!saving) dialog.close(); });
  dialog.addEventListener('close', () => {
    reviewed = undefined;
    title.value = body.value = '';
    root.querySelector<HTMLInputElement>('#command')!.focus();
  });

  create.addEventListener('click', async () => {
    if (!handle.value.trim()) { message.textContent = 'ハンドルを入力してください。'; return; }
    create.disabled = true;
    try { await actions.createMember(handle.value); handle.value = ''; message.textContent = ''; }
    catch (reason) { message.textContent = `利用者を保存できませんでした。${String(reason)}`; }
    finally { create.disabled = false; }
  });
  select.addEventListener('change', async () => {
    select.disabled = true;
    try { await actions.selectMember(select.value); message.textContent = ''; }
    catch (reason) { message.textContent = `利用者を選択できませんでした。${String(reason)}`; }
    finally { select.disabled = false; }
  });

  return {
    refresh(content: Backup) {
      select.replaceChildren();
      for (const member of content.members.filter((member) => member.actor === 'human')) {
        select.add(new Option(`${member.handle} (${member.id})`, member.id));
      }
      const active = activeHuman(content);
      if (active) select.value = active;
      else select.add(new Option('利用者を作成してください', ''));
    },
    open(target: ForumDestination, content: Backup, reply?: Post) {
      const memberId = activeHuman(content);
      if (!memberId) { section.querySelector('details')!.open = true; message.textContent = '投稿・既読の記録にはローカル利用者を作成してください。'; handle.focus(); return; }
      authorId = memberId;
      destination = target;
      parent = reply;
      composing = false;
      reviewed = undefined;
      title.value = reply ? `RE#${reply.number} ${reply.title}` : '';
      body.value = '';
      section.querySelector('.destination')!.textContent = `${target.keyword} / ${target.name} — ${content.members.find((member) => member.id === memberId)!.handle}${reply ? ` / 返信先 RE#${reply.number}` : ''}`;
      error.textContent = '';
      editing(true);
      dialog.showModal();
      title.focus();
    },
  };
}
