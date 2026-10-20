import type { Page } from '@playwright/test';

export async function openSettings(page: Page, panel: 'storage' | 'member') {
  const details = page.locator(`.${panel}-controls details`).first();
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
}
