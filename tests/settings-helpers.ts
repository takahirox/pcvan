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
