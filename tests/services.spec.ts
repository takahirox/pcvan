import { expect, test } from '@playwright/test';
import evidence from '../data/pcvan/sig-evidence.json' with { type: 'json' };
import { command, start, snapshot, restore, noOtherUi } from './terminal-helpers';
import { categoryItems } from '../src/service-collections';
import { PcvanController } from '../src/navigation';

const entries = [
  ['MAIL', '電子メール', '受信箱：0件'],
  ['LIBRARY', 'ライブラリィ', '2 自然の森（歳時記）'],
  ['CONFERENCE', '電子会議室', '発言一覧：0件'],
  ['OLT', 'ＯＬＴ（＊）', '参加者：0人'],
  ['OSL', 'ＯＳＬ', '1 ＳＩＧの道具箱'],
] as const;

function daisizen() {
  const controller = new PcvanController();
  controller.submit('13');
  controller.submit('2');
  return controller;
}

test('service helpers preserve provisional metadata and show concise operational labels', () => {
  const controller = daisizen();
  const output = controller.submit('HELP').join('\n');
  for (const [input, label] of entries) {
    const section = evidence.daisizen.sections.find((item) => item.label === label)!;
    expect(section.selector).toBeNull();
    expect(section.status).toBe('provisional');
    expect(section.demo_entry).toEqual({ input, evidence_category: 'D', status: 'reconstructed' });
    expect(output).toContain(`${label}`);
    expect(output).toContain(`${input}: ${label}`);
  }
});

for (const [input, label, empty] of entries) {
  test(`${input} opens its service view with stable HELP, BACK and MAIN`, () => {
    const controller = daisizen();
    const directory = controller.submit('HELP');
    const output = controller.submit(`  ${input.toLowerCase()}  `);
    expect(controller.screen).toBe('daisizen-service');
    expect(controller.needsContent).toBe(['MAIL', 'OLT', 'CONFERENCE'].includes(input));
    expect(output.join('\n')).toContain(`大自然＆動植物（DAISIZEN） / ${label}`);
    expect(output.join('\n')).toContain(empty);
    expect(output.join('\n')).not.toMatch(/未実装|利用不可/);
    expect(controller.submit('LIST')).toEqual(output);
    for (const command of [...(['LIBRARY', 'OSL'].includes(input) ? ['0', '99', '-1', '1.5', '9007199254740993'] : ['1', '2']), 'Q', 'E', 'H', 'RB1', 'TL1', 'DL1', 'KW', 'READ 1', 'SEND hello', 'UPLOAD file', 'hello', '<b>発言</b>', 'FORUMS', ...entries.map(([helper]) => helper)]) {
      expect(controller.submit(command).join('\n')).toContain(input === 'CONFERENCE' && command === 'READ 1' ? 'その番号の発言はありません' : 'この画面では使えない');
      expect(controller.screen).toBe('daisizen-service');
      expect(controller.submit('HELP')).toEqual(output);
    }
    expect(controller.submit('BACK')).toEqual(directory);
    expect(controller.screen).toBe('daisizen');
    controller.submit(input);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    expect(controller.screen).toBe('main');
  });
}

test('service helpers stay scoped to the SIG; forum reading and MITI navigation still work', () => {
  const controller = new PcvanController();
  const paths = [[], ['13'], ['2', 'FORUMS'], ['1'], ['MAIN', 'J MITI'], ['3'], ['9']];
  for (const path of paths) {
    for (const command of path) controller.submit(command);
    const before = controller.screen;
    for (const [input] of entries) {
      expect(controller.submit(input).join('\n')).toContain('この画面では使えない');
      expect(controller.screen).toBe(before);
    }
    if (before === 'forum' || before === 'miti-materials') {
      expect(controller.submit('READ 1').join('\n')).toContain('★内容');
    }
  }
});

const categories = {
  LIBRARY: ['説明', '自然の森（歳時記）', '山の情報バンク', 'ライブラリィ実験室', 'フォーラムダイジェスト'],
  OSL: ['ＳＩＧの道具箱', 'データベース', 'ユーティリティ', '画像データ', 'バイナリ書庫', 'その他'],
};

for (const service of ['LIBRARY', 'OSL'] as const) {
  test(`${service} visits every category, reads bundled items and returns through the actual parents`, () => {
    const controller = daisizen(), sig = controller.submit('HELP');
    const directory = controller.submit(service);
    expect(directory.slice(1, 1 + categories[service].length)).toEqual(categories[service].map((label, i) => `${i + 1} ${label}`));
    expect(evidence.daisizen.collections[service]).toMatchObject({ status: 'provisional', evidence_category: 'B' });
    let populated = 0;
    for (const [index, label] of categories[service].entries()) {
      const listing = controller.submit(String(index + 1));
      expect(controller.screen).toBe('service-category');
      expect(listing[1]).toBe(label);
      expect(controller.submit('HELP')).toEqual(listing);
      expect(controller.submit('LIST')).toEqual(listing);
      for (const invalid of ['0', '1', '99', 'READ 0', 'READ -1', 'READ 1.5', 'READ 9007199254740993', 'WRITE', 'REPLY 1', 'INBOX', 'JOIN 1', 'UPLOAD file', 'DOWNLOAD 1', 'LIBRARY', 'OSL']) {
        expect(controller.submit(invalid).join('\n')).toMatch(/READ 番号|LIST/);
        expect(controller.submit('HELP')).toEqual(listing);
      }
      const items = categoryItems(service, index + 1);
      if (!items.length) {
        expect(listing.join('\n')).toContain('一覧：0件');
        expect(controller.submit('READ 1').join('\n')).toContain('その番号の項目はありません');
        expect(controller.submit('HELP')).toEqual(listing);
      } else {
        populated++;
        for (const [itemIndex, item] of items.entries()) {
          expect(listing.join('\n')).toContain(`#${itemIndex + 1} `);
          expect(listing.join('\n')).toContain(item.title);
          const detail = controller.submit(`  read   ${itemIndex + 1}  `);
          expect(controller.screen).toBe('service-item');
          expect(detail.join('\n')).toContain(item.body);
          expect(controller.submit('HELP')).toEqual(detail);
          expect(controller.submit(`READ ${itemIndex + 1}`)).toEqual(detail);
          for (const invalid of ['READ 2', 'READ 999', '1', 'WRITE', 'REPLY 1', 'MAIL', 'SENT', 'OLT', 'OSL', 'LIBRARY']) {
            controller.submit(invalid);
            expect(controller.submit('HELP')).toEqual(detail);
          }
          expect(controller.forum).toBeNull(); expect(controller.mailContext).toBeNull();
          expect(controller.isOlt).toBe(false); expect(controller.needsContent).toBe(false);
          if (service === 'OSL') {
            for (const output of [listing, detail]) {
              for (const field of [item.filename!, item.purpose!, item.date!, `${Buffer.byteLength(item.body, 'utf8')} bytes（UTF-8）`]) expect(output.join('\n')).toContain(field);
            }
            expect(detail.join('\n')).toContain('テキストプレビュー');
          }
          expect(controller.submit('BACK')).toEqual(listing);
          controller.submit(`READ ${itemIndex + 1}`);
          expect(controller.submit('LIST')).toEqual(listing);
        }
      }
      expect(controller.submit('BACK')).toEqual(directory);
    }
    expect(populated).toBeGreaterThanOrEqual(2);
    expect(controller.submit('BACK')).toEqual(sig);
    controller.submit(service);
    controller.submit(service === 'LIBRARY' ? '2' : '1'); controller.submit('READ 1');
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    controller.submit('13'); controller.submit('2');
    expect(controller.submit(service)).toEqual(directory);
    expect(controller.submit('BACK')).toEqual(sig);
    expect(controller.submit('BACK')[0]).toBe('コミュニケーション');
    expect(controller.submit('BACK')).toEqual(controller.welcome);
  });
}

test('switching services and MAIN from every collection depth cannot retain an old category or item', () => {
  const controller = daisizen();
  for (const service of ['LIBRARY', 'OSL', 'LIBRARY'] as const) {
    const directory = controller.submit(service);
    controller.submit(service === 'LIBRARY' ? '5' : '2');
    controller.submit('READ 1'); controller.submit('BACK'); controller.submit('BACK'); controller.submit('BACK');
    expect(controller.submit(service)).toEqual(directory);
    expect(controller.submit('READ 1').join('\n')).toContain('この画面では使えない');
    controller.submit('BACK');
  }
  for (const path of [['LIBRARY'], ['OSL', '2'], ['LIBRARY', '5', 'READ 1']]) {
    for (const input of path) controller.submit(input);
    expect(controller.submit('MAIN')).toEqual(controller.welcome);
    controller.submit('13'); controller.submit('2');
    controller.submit('MAIL'); expect(controller.mailContext).not.toBeNull();
    controller.submit('BACK'); controller.submit('OLT'); expect(controller.isOlt).toBe(true);
    controller.submit('BACK');
  }
});

for (const handle of [undefined, '読む人']) {
  test(`production reading and preview journeys preserve community records (${handle ?? 'no handle'})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await start(page, handle);
    const empty = await snapshot(page); empty.posts = []; empty.readStates = [];
    await restore(page, empty);
    const before = await snapshot(page);
    await command(page, '13', 'コミュニケーション'); await command(page, '2', 'DAISIZEN');
    for (const service of ['LIBRARY', 'OSL'] as const) {
      await command(page, service, categories[service][0]);
      for (const [index, label] of categories[service].entries()) {
        await command(page, String(index + 1), label);
        const items = categoryItems(service, index + 1);
        if (items.length) {
          await command(page, 'READ 999', 'その番号の項目はありません');
          await command(page, 'READ 1', items[0]!.body.split('\n')[0]);
          const input = page.locator('#command'), output = page.locator('.output');
          await input.fill('未送信の日本語');
          const transcript = await output.textContent();
          await page.getByRole('button', { name: '設定 / Options', exact: true }).click();
          const modal = page.getByRole('dialog', { name: '設定 / Options', exact: true });
          await expect(modal).toBeVisible(); await page.keyboard.press('Escape');
          await expect(modal).not.toBeVisible(); await expect(input).toHaveValue('未送信の日本語');
          expect(await output.textContent()).toBe(transcript);
          await command(page, 'SETTINGS', '設定 / SETTINGS');
          await command(page, 'BACK', items[0]!.body.split('\n')[0]);
          await command(page, 'ABOUT', 'UTF-8（BOMなし、改行LF）');
          await command(page, 'BACK', items[0]!.body.split('\n')[0]);
          for (const invalid of ['WRITE', 'REPLY 1', 'COMPOSE someone', 'INBOX', 'JOIN 1', 'DOWNLOAD 1', 'UPLOAD file']) {
            await command(page, invalid, /^(WRITE|REPLY)/.test(invalid) ? '投稿先の掲示板' : 'この画面では使えない');
          }
          await command(page, 'HELP', items[0]!.body.split('\n')[0]);
          await command(page, 'BACK', '一覧：1件');
        } else await command(page, 'READ 1', 'その番号の項目はありません');
        await command(page, 'BACK', categories[service][0]);
      }
      await command(page, 'BACK', 'FORUMS:');
    }
    await command(page, 'FORUMS', 'ダーウィン図書館'); await command(page, '3', '投稿はありません');
    await command(page, 'READ 1', 'その番号の投稿はありません');
    await command(page, 'MAIN', 'MAIN'); await command(page, 'J MITI', '未知の世界');
    await command(page, '3', 'フォーラム'); await command(page, '9', '投稿はありません');
    const after = await snapshot(page);
    for (const key of ['members', 'sigs', 'forums', 'posts', 'mail', 'readStates', 'settings'] as const) expect(after[key]).toEqual(before[key]);
    await noOtherUi(page);
  });
}
