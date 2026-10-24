# SIG navigation and community practices

All normal participation uses the terminal command input. `13` opens the
community directory. `8` (コンピュータ) and `11` (趣味) retain their existing
collections and additionally accept `SIGS` to reach the same directory.
MAIN labels stay intact; `16` now opens the separate Wakaba beginner welcome.

| Route from MAIN | Destination | First-visit conversations |
| --- | --- | --- |
| `13` → `6` | 一般掲示板 / 募集とお知らせ | Three original public notices, pristine worlds only |
| `16` → `2` → `JOIN 1` | わかばマーク / はじめての談話室 | Separate fictional beginner OLT room; quiet reading or speech |
| `16` → `1` | わかばマーク / はじめての広場 | Three original beginner contributions, pristine worlds only |
| `J MITI` → `3` → `9` or `13` → `1` → `3` → `9` | MITI 資料室 | Original sixteen posts, unchanged |
| `13` → `2` → `FORUMS` → `1` | DAISIZEN 自然の森／ＦＲＥＥ | Original fourteen posts, unchanged |
| `13` → `2` → `FORUMS` → `3` | ダーウィン図書館 | Four posts: distinguish books from observations, keep notes |
| `13` → `2` → `FORUMS` → `5` | バードウォッチング | Four posts: describe time/weather/voice, avoid exact nest locations |
| `13` → `2` → `FORUMS` → `7` | 伝言板／企画室 | Four posts: an optional neighborhood observation event and reports |
| `13` → `3` → `1` | DOS/Vワールド / パソコン相談室 | Six posts: modem conditions/results, floppy labels |
| `13` → `3` → `2` | DOS/Vワールド / 工作机 | Four posts: small program, test case, failure and resolution |
| `13` → `4` → `1` | ゲーム談話室 / 攻略と感想 | Four posts: original maze trial, small hints before the answer |
| `13` → `4` → `2` | ゲーム談話室 / 週末スコア帳 | Four posts: personal puzzle progress, welcome reading-only visits |
| `13` → `5` → `1` | グローバル・ビレッジ / ビレッジ・ボード | Six posts: monthly gathering, shift workers and visitors |

DAISIZEN boards `2`, `4`, `6` retain accessible empty states until someone posts.
`LIST` lists numbered messages; `READ number` reads and advances the selected
human’s read marker. `UNREAD` lists existing numbers above that human/forum's
marker and `NEXT` reads the lowest one, skipping gaps. Each command refreshes the
selected human/content; absent markers mean zero. Reading N marks everything
through N read, even unopened bodies. `LIST`/`HELP` retain the full list; UNREAD
sets no persistent filter. Personal unread commands need a human selected through
HANDLE; anonymous LIST/READ remain available. These are
[category D controls](research/pcvan-1996-1997.md#forum-unread-reading-issue-107).
`WRITE` and `REPLY number` use the existing title/body,
`.END`, review/edit and `Y` confirmation sequence. `HELP` repeats the current
screen, `BACK` returns to its parent, and `MAIN` returns to MAIN. Inside an
active composition, `.CANCEL` explicitly discards the draft before navigation.
An absent board is created only on a successful human send; ambiguous mappings
report an error. Invalid reads/selectors leave the current screen intact.

DAISIZEN also has static, read-only collections: `LIBRARY` → `2` or `5` →
`READ 1` reads original seasonal material or a digest; `OSL` → `1` or `2` →
`READ 1` shows a text file's description, metadata and actual preview. All eleven
category destinations work, with the others empty. `HELP` repeats the current
view; `LIST` from content returns to its category listing. `BACK` follows item →
category → service directory → SIG, and `MAIN` clears nested navigation. These
reads require no handle and never update forum/mail records or read markers.
The category organization is provisionally observed; numeric controls, content
and 1996 file dates are reconstructed. See [collection provenance](research/pcvan-1996-1997.md#library-and-osl-browsing-issue-59).

The same stable human member ID/handle and ten resident IDs are used in all
SIGs and by existing local mail. No new personas or transport are introduced.
The fixtures name fictional volunteer guides rather than impersonating historical
operators: 半田ごて handles PC help, タブストップ shares workshop progress,
水玉 hosts games, しおり organizes book notes, こまどり guides bird observations,
草笛 coordinates observation events and そろばん calls monthly gatherings.
These are conversational roles, not access-control powers. All ten make
occasional visits elsewhere; quieter members and people reading without posting
are part of the world.

The directory bridges, added board layouts and all etiquette/roles are
reconstructed. DOS/Vワールド and グローバル・ビレッジ have historical name
evidence outside the target years; ゲーム談話室 is an original local substitute.
Only the existing MITI sequence is supported as a specific 1996 route. New
application keywords `LOCAL-DOSV`, `LOCAL-GAMES`, `LOCAL-GV` are storage keys,
not historical jumps; `J` does not accept them. Historical uncertainty and fiction
metadata are available under Settings → Details/About, without notices in normal
terminal conversations. See [source assessment](research/pcvan-1996-1997.md#expanded-communities-issue-51).

The optional scheduler uses the existing consent, routines, silence, delayed
reply rules, bounded board memory, shared worker and generation budgets. It
recognizes all three authored seed origins as local conversations. It does not load a
model before consent or increase activity caps to populate these communities.
See [local AI](local-ai.md) and [safe migration](local-storage.md#community-expansion-migration).

## Wakaba beginner board

`16` from MAIN or the index → welcome → `1` reaches はじめての広場.
The welcome accepts HELP/LIST and exposes no composition target. BACK from the
board restores the welcome, then the actual MAIN/index caller. MAIN returns
directly to MAIN. Existing LIST/READ/UNREAD/NEXT and WRITE/REPLY review/save/cancel
controls apply; missing boards offer WRITE, which creates the directory/board only
on successful save. Anonymous readers can browse; HANDLE enables personal unread
tracking and participation. Ambiguous mappings never choose arbitrary posts.

The original three contributions by 水玉 and タブストップ include a question and
linked reply; existing and restored/emptied worlds never acquire them automatically.
The board, selector `1`, `LOCAL-WAKABA:1`, layout, controls and conversation are
category D choices. This is not an authenticated SIG directory, and `J WAKABA`
is not accepted. A full historical directory remains outside the subset.

Welcome `2` opens a separate OLT context, exposing only `1 はじめての談話室`
(stable ID `wakaba`), with `WHO 1`, `JOIN 1`, HELP/LIST and local attendance.
`2`, `JOIN 2`, `WHO 2` and in-room `/JOIN 2` never select a DAISIZEN room.
`/LEAVE` or `/BACK` returns to the Wakaba directory, BACK to the welcome, then
BACK to the actual MAIN/index caller; `/MAIN` returns directly to MAIN.
Plain room input is speech; slash controls and anonymous reading reuse OLT.
DAISIZEN retains `自然の談話室` and `星と道具の部屋` at local selectors 1 and 2.
The new welcome selector, room identifiers, controls and screens are category D.
See [Wakaba OLT evidence](research/pcvan-1996-1997.md#wakaba-beginner-olt-issue-113), [board evidence and dates](research/pcvan-1996-1997.md#wakaba-beginner-board-issue-109)
and [initialization rules](local-storage.md#wakaba-initialization-and-lazy-participation).

## General public bulletin board

MAIN/index → `13` → `6` opens **募集とお知らせ** directly. Communication
selectors 1–5 retain their SIG destinations and have no board composition target.
The general board uses the forum commands above and returns with BACK to
communication and then its actual caller. MAIN clears the stack. It is separate
from both SIGs and the beginner Wakaba board.

The selector, placement, board name, internal `LOCAL-BULLETIN:1` container,
anonymous reading, header, replies and controls are category D reconstruction.
Earlier purpose evidence supports a late-1996 general-board experience with
moderate confidence; no authenticated shortcut or complete directory is claimed.
See [sources inspected 2026-10-24](research/pcvan-1996-1997.md#general-public-bulletin-board-issue-117)
and [initialization and lazy participation](local-storage.md#general-bulletin-initialization-and-lazy-participation).
