import { bulletin } from './bulletin';
import { wakaba } from './wakaba';
import expanded from '../data/pcvan/expanded-sigs.json' with { type: 'json' };
import starters from '../data/pcvan/forum-starters.json' with { type: 'json' };

export const quietBoards = starters.boards;

/** Application keys and bridge selectors; never historical jump commands. */
export const additionalSigs = expanded.sigs;
export const expandedBoards = [
  ...expanded.daisizenBoards.map((b) => ({ keyword: b.keyword, boardNo: b.number, name: b.label, culture: b.culture })),
  ...additionalSigs.flatMap((s) => s.boards.map((b) => ({ keyword: s.keyword, boardNo: b.number, name: b.label, culture: b.culture }))),
];
export function boardCulture(keyword: string, boardNo: number): string | undefined {
  if (keyword.toUpperCase() === bulletin.keyword && boardNo === bulletin.boardNo) return bulletin.culture;
  if (keyword.toUpperCase() === wakaba.keyword && boardNo === wakaba.boardNo) return wakaba.culture;
  return [...expandedBoards, ...quietBoards].find((b) => b.keyword === keyword.toUpperCase() && b.boardNo === boardNo)?.culture;
}
