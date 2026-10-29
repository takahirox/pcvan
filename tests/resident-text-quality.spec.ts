import { expect, test } from '@playwright/test';
import { backupFixture } from './backup-fixture';
import { validateGeneration } from '../src/ai/generation';
import { validateMailGeneration } from '../src/ai/mail';
import { copiedContribution, unfinishedContribution } from '../src/ai/text';
import { personas, personaMemberId } from '../src/ai/personas';

const question = '星を見たい初心者です。手持ちの双眼鏡は何倍くらいが使いやすいですか。';
const advice = '両肘を机に置いて双眼鏡を支えると、手ぶれを抑えやすいです。まず座って月を眺めてみてはいかがでしょう。';

test('forum commit rejects an adopted first-person question and a near-copy with a changed ending', () => {
  const data = backupFixture(), request = { personaId: 'hoshimori', forumId: 'forum', replyToPostId: 'first' };
  data.posts[0]!.body = question;
  const validate = (body: string) => validateGeneration(JSON.stringify({ ...request, title: '双眼鏡', body }), data, request);
  expect(() => validate(question + 'おすすめは2.5倍から4倍です。')).toThrow(/コピー/);
  data.posts[0]!.body = advice;
  expect(() => validate(advice.replace('でしょう。', 'です。'))).toThrow(/コピー/);
  data.posts[0]!.body = 'すみません、一度、水面をどう決定するかをもう一度確認させていただきます。まず、目盛りがない場合、どのように水面を判断しますか？';
  expect(() => validate('目盛りがない場合、どのように水面を判断しますか？')).toThrow(/コピー/);
  expect(validate('三脚がなければ、椅子に座って両肘を机で支えてみてください。')).toMatchObject({ replyToPostId: 'first' });
});

test('forum commit rejects captured dangling prose and a profile sentence used as the title', () => {
  const data = backupFixture(), request = { personaId: 'hoshimori', forumId: 'forum' };
  const validate = (title: string, body: string) => validateGeneration(JSON.stringify({ ...request, title, body }), data, request);
  expect(() => validate('双眼鏡', '手持ちの双眼鏡は何倍くらいが使いやすいですか？2.5倍から4倍くらいが一般的に良いとされています。測定方法や環境によって多少の差があるかもしれませんが、その他の要素を考慮すると2.5倍から4倍の間に選ぶのがバランスの良')).toThrow(/未完了/);
  expect(() => validate('タイトル：', advice)).toThrow(/無効/);
  expect(() => validate(personas.find((p) => p.id === 'hoshimori')!.profile, advice)).toThrow(/人物設定/);
});

test('addressed mail rejects promised-but-absent steps and copied questions; accepts an actual suggestion', () => {
  const data = backupFixture(), id = personaMemberId('hoshimori');
  data.members.push({ id, handle: '星守', actor: 'ai' });
  data.mail = [{ id: 'letter', number: 1, senderId: 'human', recipientId: id, subject: '星見の相談',
    body: question, origin: 'local-human', createdAt: '2026-10-21T13:04:00Z' }];
  const target = { humanId: 'human', replyToMailId: 'letter' };
  const validate = (body: string) => validateMailGeneration(JSON.stringify({ personaId: 'hoshimori', recipientId: 'human',
    replyToMailId: 'reply-target', subject: '手ぶれのこと', body }), data, 'hoshimori', target);
  expect(() => validate('月を観察する際、手ぶれの問題は避けるのが一番です。しかし、それでも手ぶれが発生した場合、以下の手順で補正することができます。')).toThrow(/Unfinished/);
  expect(() => validate(question + 'ありがとうございます。')).toThrow(/Copied/);
  expect(validate(advice)).toEqual({ subject: '手ぶれのこと', body: advice });
});

test('lexical checks permit short acknowledgements, quoted sources with a new contribution and completed steps', () => {
  expect(copiedContribution(`「${question}」`, [question])).toBe(true);
  expect(copiedContribution('こんにちは！', ['こんにちは。'])).toBe(false);
  expect(copiedContribution(`「${question}」とのことですが、まず椅子に座って肘を支えると楽ですよ。`, [question])).toBe(false);
  expect(copiedContribution('月の観察には興味があります。まずは肉眼でも月の形を確かめてみます。', [advice])).toBe(false);
  expect(unfinishedContribution('以下の手順です。\nまず椅子に座って肘を机につけてください。')).toBe(false);
  expect(unfinishedContribution('なるほど、試してみます')).toBe(false);
});
