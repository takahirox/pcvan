import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Generate from the final bundle so every release has an exact, base-relative
// allowlist. Optional AI chunks/workers are cached only when explicitly used.
export default defineConfig({
  // This is the only bare runtime dependency. Explicit optimization finishes
  // before serving pages, avoiding discovery reloads during welcome/registration
  // or mocked sessions on a cold cache. No model files are fetched or loaded.
  optimizeDeps: { include: ['@mlc-ai/web-llm'], noDiscovery: true },
  plugins: [{
    name: 'offline-shell',
    writeBundle(options, bundle) {
      const template = readFileSync(new URL('./scripts/service-worker.js', import.meta.url), 'utf8');
      const shell = new Set(['index.html']);
      function visit(name: string) {
        if (shell.has(name)) return;
        shell.add(name);
        const item = bundle[name];
        if (item?.type === 'chunk') item.imports.forEach(visit);
      }
      for (const [name, item] of Object.entries(bundle)) {
        if (item.type === 'chunk' && item.isEntry) visit(name);
        if (name.endsWith('.css')) shell.add(name);
      }
      const files = Object.keys(bundle).sort();
      const hash = createHash('sha256').update(template);
      const assets: { path: string; integrity: string }[] = [];
      for (const name of files) {
        const item = bundle[name]!;
        const bytes = item.type === 'chunk' ? item.code : item.source;
        hash.update(name).update(bytes);
        assets.push({ path: name, integrity: `sha256-${createHash('sha256').update(bytes).digest('base64')}` });
      }
      const source = template.replace('__VERSION__', hash.digest('hex').slice(0, 20))
        .replace('__SHELL__', JSON.stringify([...shell]))
        .replace('__ASSETS__', JSON.stringify(assets));
      writeFileSync(resolve(options.dir!, 'sw.js'), source);
    },
  }],
});
