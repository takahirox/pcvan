import { expect, test } from '@playwright/test';

// Same browser, fixture and iteration counts. These are generous regression
// bounds, not promises about low-end hardware or real WebGPU generation latency.
test('10/100 roster metadata, planning, OLT, navigation and real IndexedDB hydration remain bounded', async ({ page }) => {
  await page.goto('http://127.0.0.1:14374');
  const measurements = await page.evaluate(async () => {
    const rp = '/src/storage/repository.ts', pp = '/src/ai/personas.ts', ap = '/src/ai/activity.ts';
    const op = '/src/olt-state.ts', np = '/src/navigation.ts';
    const { openRepository } = await import(rp) as typeof import('../src/storage/repository');
    const { personas, residentProfiles } = await import(pp) as typeof import('../src/ai/personas');
    const { emptyActivity, scheduleActivity } = await import(ap) as typeof import('../src/ai/activity');
    const { emptyOlt, observeOlt } = await import(op) as typeof import('../src/olt-state');
    const { PcvanController } = await import(np) as typeof import('../src/navigation');
    const anchor = '2026-10-21T13:04:00.000Z', now = Date.parse(anchor);
    const repo = await openRepository('scale-performance');
    const bootstrapStart = performance.now(); await repo.openActivity(anchor);
    const bootstrapMs = performance.now() - bootstrapStart;
    const baseline = await repo.exportBackup();
    const rows = [];
    const measure = (iterations: number, work: () => void) => {
      for (let i = 0; i < 5; i++) work();
      const start = performance.now(); for (let i = 0; i < iterations; i++) work();
      return (performance.now() - start) / iterations;
    };
    for (const count of [10, 100]) {
      const data = structuredClone(baseline);
      data.members = data.members.filter((m) => personas.slice(0, count).some((p) => m.id === `fictional-ai:${p.id}`));
      data.settings.find((s) => s.id === 'ai-residents')!.value = { version: count === 10 ? 1 : 2, profiles: personas.slice(0, count) } as never;
      const state = { ...emptyActivity(anchor, 'performance'), consent: true };
      data.settings.find((s) => s.id === 'ai-activity')!.value = state as never;
      const profileMs = measure(1000, () => { residentProfiles(data).find((p) => p.id === 'komadori'); });
      const planningMs = measure(100, () => { scheduleActivity(data, state, new Date(now + 72 * 3_600_000).toISOString()); });
      const observationMs = measure(200, () => { observeOlt(emptyOlt(anchor), data, now); });
      const navigationMs = measure(200, () => {
        const controller = new PcvanController(); controller.setContent(data);
        for (const command of ['13', '2', 'OLT', 'BACK', 'MAIN', 'J MITI', '9', 'LIST', 'MAIN']) controller.submit(command);
      });
      const start = performance.now(); await repo.replaceFromJson(JSON.stringify(data), { confirmReplace: true });
      await repo.openActivity(anchor); const hydrationMs = performance.now() - start;
      rows.push({ count, profileMs, planningMs, observationMs, navigationMs, hydrationMs,
        rosterBytes: new TextEncoder().encode(JSON.stringify(residentProfiles(data))).length,
        backupBytes: new TextEncoder().encode(JSON.stringify(data)).length });
    }
    repo.close();
    return { userAgent: navigator.userAgent, bootstrapMs, rows,
      heapBytes: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize };
  });
  console.log('COMMUNITY_PERFORMANCE', JSON.stringify(measurements));
  for (const row of measurements.rows) {
    expect(row.planningMs).toBeLessThan(100); expect(row.observationMs).toBeLessThan(20);
    expect(row.navigationMs).toBeLessThan(20); expect(row.hydrationMs).toBeLessThan(2000);
  }
  expect(measurements.bootstrapMs).toBeLessThan(2000);
});
