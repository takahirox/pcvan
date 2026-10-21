import type { Page } from '@playwright/test';

export async function openSettings(page: Page, panel: 'storage' | 'member' | 'display' | 'ai' | 'offline' | 'about' | 'help') {
  const dialog = page.locator('.settings-dialog');
  if (!await dialog.isVisible()) await page.locator('.open-settings').click();
  const section = page.locator(`.${panel}-controls`);
  const details = ['display', 'ai', 'about', 'help'].includes(panel) ? section : section.locator('details').first();
  if (await details.getAttribute('open') === null) await details.locator(':scope > summary').click();
}

export async function closeSettings(page: Page) {
  if (await page.locator('.settings-dialog').isVisible()) await page.locator('.close-settings').click();
}

/** Follow the explicit consent step only when this model has not been authorized. */
export async function loadModel(page: Page) {
  const authorized = await page.evaluate(async () => {
    const selected = document.querySelector<HTMLSelectElement>('.ai-model')!.value;
    const db = await new Promise<IDBDatabase>((resolve) => { const opening = indexedDB.open('pcvan-local'); opening.onsuccess = () => resolve(opening.result); });
    const row = await new Promise<{ value: { consent?: boolean; modelId: string } } | undefined>((resolve) => {
      const request = db.transaction('settings').objectStore('settings').get('ai-activity');
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return row?.value.consent && row.value.modelId === selected;
  });
  await page.locator('.ai-load').click();
  if (!authorized) await page.locator('.ai-consent-confirm').click();
}
