import type { Backup, TerminalPreferences } from './storage/schema';
import { TERMINAL_SETTING } from './storage/schema';
import type { LocalRepository } from './storage/repository';
import type { createAiControls } from './ai/controls';
import type { ResidentProfile } from './ai/personas';

interface Actions {
  repository(): Promise<LocalRepository>;
  read(): Promise<Backup>;
  applyPreferences(value: TerminalPreferences): void;
  ai: ReturnType<typeof createAiControls>;
}

/** Both application presentations use the same mutations and cancellation rules. */
export function createSettingsActions(actions: Actions) {
  return {
    async display(value: TerminalPreferences) {
      await (await actions.repository()).put('settings', { id: TERMINAL_SETTING, value: { ...value } });
      actions.applyPreferences(value);
      return actions.read();
    },
    async activity(maxPosts: number, modelId: string) {
      actions.ai.invalidate();
      await (await actions.repository()).configureActivity(maxPosts, modelId);
      const content = await actions.read();
      if (maxPosts) actions.ai.resume();
      return content;
    },
    async resident(profile: ResidentProfile, expected?: string) {
      actions.ai.invalidate();
      await (await actions.repository()).configureResident(profile, undefined, expected);
      const content = await actions.read();
      actions.ai.resume();
      return content;
    },
    async defer(expected: string) {
      await (await actions.repository()).deferAiSetup(expected);
      return actions.read();
    },
  };
}
