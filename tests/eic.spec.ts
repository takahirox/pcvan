import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PcvanController } from '../src/navigation';
import { eicReadings } from '../src/eic';
import { about } from '../src/settings';
import { backupFixture, quietOltFixture } from './backup-fixture';
import type { AiActivity } from '../src/storage/schema';
import { command, start, snapshot, restore, noOtherUi } from './terminal-helpers';

const malformed = ['READ', 'READ 0', 'READ -1', 'READ 01', 'READ 1.5', 'READ 1 extra', 'READ NaN'];
const unrelated = ['WRITE', 'REPLY 1', 'COMPOSE someone', 'WRITE someone', 'SEND text', 'INBOX', 'SENT',
  'MAIL', 'LIBRARY', 'OSL', 'CONFERENCE', 'JOIN 1', '/JOIN 1', '/WHO', '/LIST', 'UPLOAD file', 'DOWNLOAD 1', 'Q'];

function isolated(controller: PcvanController) {
  expect(controller.forum).toBeNull(); expect(controller.mailContext).toBeNull();
  expect(controller.isConference).toBe(false); expect(controller.isOlt).toBe(false);
  expect(controller.needsContent).toBe(false);
}

for (const viaIndex of [false, true]) {
  test(`EIC controller reads every item, rejects contextual errors and follows ${viaIndex ? 'index' : 'direct'} parents`, () => {
    const controller = new PcvanController(), data = backupFixture();
    const original = structuredClone(data); controller.setContent(data); controller.setMemberId('human');
    const parent = viaIndex ? controller.submit('2').slice(1) : controller.welcome;
    const directory = controller.submit('5').slice(1);
    expect(directory.join('\n')).toContain('公共情報と政治\n環境情報ゲートウェイ\n1 EICネット（別ネットワーク）');
    expect(controller.submit('LIST')).toEqual(directory);
    for (const invalid of ['0', '2', '99', '1.0', '01', 'READ 1', ...malformed, ...unrelated]) {
      expect(controller.submit(invalid).join('\n')).toContain('この画面では使えない');
      expect(controller.submit('HELP')).toEqual(directory); isolated(controller);
    }
    const list = controller.submit('1');
    expect(list.join('\n')).toContain('EICネット / 環境情報\n記事一覧：2件');
    expect(list.join('\n')).not.toContain('DAISIZEN');
    expect(controller.submit('LIST')).toEqual(list);
    for (const [index, item] of eicReadings.entries()) {
      expect(list.join('\n')).toContain(`#${index + 1} ${item.title}`);
      const detail = controller.submit(`  read   ${index + 1}  `);
      expect(detail.join('\n')).toContain(item.body);
      expect(controller.submit('HELP')).toEqual(detail);
      expect(controller.submit(`READ ${index + 1}`)).toEqual(detail);
      for (const view of [detail, list]) {
        for (const invalid of ['1', '0', '99', ...malformed, ...unrelated, 'READ 3', 'READ 999', 'READ 9007199254740993']) {
          expect(controller.submit(invalid).join('\n')).toMatch(/この画面では使えない|その番号の記事はありません/);
          expect(controller.submit('HELP')).toEqual(view); isolated(controller);
        }
        if (view === detail) expect(controller.submit('BACK')).toEqual(list);
      }
      controller.submit(`READ ${index + 1}`);
      expect(controller.submit('LIST')).toEqual(list);
    }
    // Reading another item while in an article replaces it without adding a parent.
    controller.submit('READ 1');
    expect(controller.submit('READ 2').join('\n')).toContain(eicReadings[1]!.body);
    expect(controller.submit('BACK')).toEqual(list);
    expect(controller.submit('BACK')).toEqual(directory);
    expect(controller.submit('BACK')).toEqual(parent);
    if (viaIndex) expect(controller.submit('BACK')).toEqual(controller.welcome);
    expect(data).toEqual(original);
  });
}

test('MAIN from every new depth and re-entry clear old articles, service contexts and parents', () => {
  const controller = new PcvanController();
  for (const path of [[], ['1'], ['1', 'READ 2']]) {
    controller.submit('2'); controller.submit('5');
    for (const input of path) controller.submit(input);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    // Enter through a different parent; stale index/article state must not return.
    controller.submit('5'); isolated(controller);
    controller.submit('1'); expect(controller.screen).toBe('eic-list');
    controller.submit('BACK'); expect(controller.submit('BACK')).toEqual(controller.welcome);
  }
  for (const service of ['MAIL', 'CONFERENCE', 'OLT', 'LIBRARY']) {
    controller.submit('13'); controller.submit('2'); controller.submit(service); controller.submit('MAIN');
    controller.submit('5'); isolated(controller); controller.submit('1'); isolated(controller);
    controller.submit('READ 1'); isolated(controller); controller.submit('MAIN');
  }
  for (let visit = 0; visit < 3; visit++) {
    controller.submit('5'); controller.submit('1'); controller.submit('READ 2');
    controller.submit('LIST'); controller.submit('BACK');
    expect(controller.submit('1')[1]).toBe('記事一覧：2件');
    controller.submit('BACK'); expect(controller.submit('BACK')).toEqual(controller.welcome);
  }
});

test('About preserves EIC evidence, chronology, limitations and reconstruction scope', () => {
  const text = about(backupFixture()).join('\n');
  for (const detail of ['2026-10-23', '1995年度14巻6号', '1996年2月', '1996-03-12', '1997-01-31',
    'テキスト方式を併用', '検索抜粋のみ', 'PDF本文は抽出不能', 'ページ画像の取得も失敗',
    '確度は高い', '確度は中〜高', 'MAIN 5への主題による配置', '同梱創作', '日付なし',
    'https://www.nies.go.jp/pr/publications/news/14/14-6/14-6-07.html',
    'https://www.eic.or.jp/eic/aboutus/', 'https://www.env.go.jp/press/256.html',
    'https://www.biodic.go.jp/reports2/5th/96_tebiki/5_96_tebiki.pdf']) expect(text).toContain(detail);
});

for (const handle of [undefined, '資料を読む人']) {
  test(`production EIC journey preserves protected records at 320px (${handle ?? 'anonymous empty world'})`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-23T14:00:00.000Z'));
    await page.setViewportSize({ width: 320, height: 640 });
    const remote: string[] = [];
    page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:14373/')) remote.push(request.url()); });
    await start(page, handle);
    const fixture = await snapshot(page);
    const activity = fixture.settings.find((row) => row.id === 'ai-activity')!.value as unknown as AiActivity;
    activity.maxPosts = 0; activity.consent = false;
    quietOltFixture(fixture);

    if (!handle) {
      fixture.members = []; fixture.sigs = []; fixture.forums = []; fixture.posts = [];
      fixture.mail = []; fixture.readStates = [];
      fixture.settings.find((row) => row.id === 'daisizen-conference')!.value =
        { version: 1, conferenceId: 'DAISIZEN', nextNumber: 1, contributions: [] };
    }
    await restore(page, fixture);
    const before = await snapshot(page);
    const input = page.locator('#command'), output = page.locator('.output');
    for (const viaIndex of [false, true]) {
      if (viaIndex) await command(page, '2', '索引');
      await command(page, '5', '環境情報ゲートウェイ');
      await command(page, 'HELP', '1 EICネット'); await command(page, 'LIST', '環境情報ゲートウェイ');
      await command(page, 'READ 1', 'この画面では使えない');
      await command(page, '2', 'この画面では使えない');
      await command(page, '1', '記事一覧：2件');
      for (const [index, item] of eicReadings.entries()) {
        await command(page, `READ ${index + 1}`, item.body);
        await command(page, 'HELP', item.body);
        for (const invalid of [...malformed, ...unrelated, 'READ 3', 'READ 9007199254740993']) {
          await command(page, invalid, /^(WRITE$|REPLY 1$)/.test(invalid) ? '投稿先の掲示板'
            : /^READ (3|9007199254740993)$/.test(invalid) ? 'その番号の記事はありません' : 'この画面では使えない');
        }
        await command(page, 'HELP', item.body);
        await command(page, 'SETTINGS', '設定 / SETTINGS'); await command(page, 'BACK', item.body);
        await command(page, 'ABOUT', 'テキスト方式を併用'); await command(page, 'BACK', item.body);
        await input.fill('未送信の日本語');
        const transcript = await output.textContent();
        await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
        const modal = page.getByRole('dialog', { name: '設定 / Options', exact: true });
        await modal.locator('.about-panel summary').click();
        await expect(modal.locator('.settings-about')).toContainText('MAIN 5への主題による配置');
        await expect(modal.locator('.settings-about')).toContainText('https://www.env.go.jp/press/256.html');
        await page.keyboard.press('Escape'); await expect(input).toBeFocused();
        await expect(input).toHaveValue('未送信の日本語'); expect(await output.textContent()).toBe(transcript);
        await expect(output.locator('未確認, a, b, script')).toHaveCount(0);
        const bounds = await input.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
        await command(page, index === 0 ? 'LIST' : 'BACK', '記事一覧：2件');
      }
      await command(page, 'BACK', '環境情報ゲートウェイ');
      await command(page, 'BACK', viaIndex ? '索引' : 'ＰＣ－ＶＡＮ');
      if (viaIndex) await command(page, 'BACK', 'ＰＣ－ＶＡＮ');
    }
    // MAIN clears each depth; a repeated visit always starts at the gateway/list.
    for (const depth of [0, 1, 2]) {
      await command(page, '5', '環境情報ゲートウェイ');
      if (depth >= 1) await command(page, '1', '記事一覧：2件');
      if (depth === 2) await command(page, 'READ 2', eicReadings[1]!.body);
      await command(page, 'MAIN', 'ＰＣ－ＶＡＮ');
    }
    const downloading = page.waitForEvent('download'); await command(page, 'LOG', 'ログのダウンロード');
    const log = await readFile((await (await downloading).path())!, 'utf8');
    for (const item of eicReadings) expect(log).toContain(item.body);
    expect(log).toContain('環境情報ゲートウェイ'); expect(log).toContain('<未確認>');
    const after = await snapshot(page);
    for (const key of ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'settings'] as const) expect(after[key]).toEqual(before[key]);
    expect(after.session!.commandHistory).toContain('READ 2');
    expect(remote).toEqual([]); await noOtherUi(page);
  });
}
