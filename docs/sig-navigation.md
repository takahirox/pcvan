# SIG navigation and community practices

All normal participation uses the terminal command input. `13` opens the
community directory. `8` (コンピュータ) and `11` (趣味) retain their existing
collections and additionally accept `SIGS` to reach the same directory.
MAIN labels stay intact; `16` now opens the separate Wakaba beginner welcome.

| Route from MAIN | Destination | First-visit conversations |
| --- | --- | --- |
| `13` → `6` | 一般掲示板 / 募集とお知らせ | Three original public notices, pristine/reset; confirmed empty-default recovery available |
| `16` → `2` → `JOIN 1` | わかばマーク / はじめての談話室 | Separate fictional beginner OLT room; quiet reading or speech |
| `16` → `1` | わかばマーク / はじめての広場 | Three original beginner contributions, pristine/reset; confirmed empty-default recovery available |
| `J MITI` → `3` → `9` or `13` → `1` → `3` → `9` | MITI 資料室 | Original sixteen posts, unchanged |
| `13` → `2` → `FORUMS` → `1` | DAISIZEN 自然の森／ＦＲＥＥ | Original fourteen posts, unchanged |
| `13` → `2` → `FORUMS` → `2` | 風の谷住民会議 | Three posts: organizing long observation logs |
| `13` → `2` → `FORUMS` → `3` | ダーウィン図書館 | Four posts: distinguish books from observations, keep notes |
| `13` → `2` → `FORUMS` → `4` | 大自然絵巻 | Three posts: leaf veins, scale and sketching |
| `13` → `2` → `FORUMS` → `5` | バードウォッチング | Four posts: describe time/weather/voice, avoid exact nest locations |
| `13` → `2` → `FORUMS` → `6` | 山のフォーラム | Four posts: a short walk, turning back and map storage |
| `13` → `2` → `FORUMS` → `7` | 伝言板／企画室 | Four posts: an optional neighborhood observation event and reports |
| `13` → `3` → `1` | DOS/Vワールド / パソコン相談室 | Six posts: modem conditions/results, floppy labels |
| `13` → `3` → `2` | DOS/Vワールド / 工作机 | Four posts: small program, test case, failure and resolution |
| `13` → `4` → `1` | ゲーム談話室 / 攻略と感想 | Four posts: original maze trial, small hints before the answer |
| `13` → `4` → `2` | ゲーム談話室 / 週末スコア帳 | Four posts: personal puzzle progress, welcome reading-only visits |
| `13` → `5` → `1` | グローバル・ビレッジ / ビレッジ・ボード | Six posts: monthly gathering, shift workers and visitors |

DAISIZEN boards `2`, `4`, `6` now have original starter threads on pristine/reset worlds.
Existing worlds retain their saved contents until confirmed Settings recovery.
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
An absent board is created on a successful human send or confirmed Settings recovery; ambiguous mappings
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
recognizes all five authored seed origins as local conversations. It does not load a
model before consent or increase activity caps to populate these communities.
See [local AI](local-ai.md) and [safe migration](local-storage.md#community-expansion-migration).

## Wakaba beginner board

`16` from MAIN or the index → welcome → `1` reaches はじめての広場.
The welcome accepts HELP/LIST and exposes no composition target. BACK from the
board restores the welcome, then the actual MAIN/index caller. MAIN returns
directly to MAIN. Existing LIST/READ/UNREAD/NEXT and WRITE/REPLY review/save/cancel
controls apply; missing boards offer WRITE, which creates the directory/board on successful save or confirmed Settings recovery. Anonymous readers can browse; HANDLE enables personal unread
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

## Public forum content inventory (Issue #131)

Rechecked against baseline `9413594` (the selected upstream adds only GitWeave
checkpoints) and the production terminal. These are **all 15** destinations backed
by local forum `LIST`/`READ`/`WRITE`/`REPLY`; aliases from MAIN/index, `8`/`11` →
`SIGS` and `J MITI` reach the same records, not additional boards.

| MAIN route | Board / application key | Source | Before → fresh/reset now |
| --- | --- | --- | --- |
| `J MITI` → `3` → `9` (also `13` → `1` → `3` → `9`) | 資料室 / `MITI:9` | fictional-community | 16 → 16 |
| `13` → `2` → `FORUMS` → `1` | 自然の森／ＦＲＥＥ / `DAISIZEN:1` | fictional-community | 14 → 14 |
| `13` → `2` → `FORUMS` → `2` | 風の谷住民会議 / `DAISIZEN:2` | forum-starters (new) | 0 → 3 |
| `13` → `2` → `FORUMS` → `3` | ダーウィン図書館 / `DAISIZEN:3` | expanded-community | 4 → 4 |
| `13` → `2` → `FORUMS` → `4` | 大自然絵巻 / `DAISIZEN:4` | forum-starters (new) | 0 → 3 |
| `13` → `2` → `FORUMS` → `5` | バードウォッチング / `DAISIZEN:5` | expanded-community | 4 → 4 |
| `13` → `2` → `FORUMS` → `6` | 山のフォーラム / `DAISIZEN:6` | forum-starters (new) | 0 → 4 |
| `13` → `2` → `FORUMS` → `7` | 伝言板／企画室 / `DAISIZEN:7` | expanded-community | 4 → 4 |
| `13` → `3` → `1` | パソコン相談室 / `LOCAL-DOSV:1` | expanded-community | 6 → 6 |
| `13` → `3` → `2` | 工作机 / `LOCAL-DOSV:2` | expanded-community | 4 → 4 |
| `13` → `4` → `1` | 攻略と感想 / `LOCAL-GAMES:1` | expanded-community | 4 → 4 |
| `13` → `4` → `2` | 週末スコア帳 / `LOCAL-GAMES:2` | expanded-community | 4 → 4 |
| `13` → `5` → `1` | ビレッジ・ボード / `LOCAL-GV:1` | expanded-community | 6 → 6 |
| `16` → `1` | はじめての広場 / `LOCAL-WAKABA:1` | wakaba | 3 → 3 |
| `13` → `6` | 募集とお知らせ / `LOCAL-BULLETIN:1` | bulletin | 3 → 3 |
| **Total** | **15 routes; formerly 12 populated** | **Original authored JSON fixtures** | **72 → 82 (26 threads)** |

Sources above refer to JSON files in `data/pcvan/`. No further empty public forum
route was found. New discussions use three posts about splitting long observation
logs in the SIG council, three about leaf veins/scale in botanical sketches and
four about a short mountain walk, turning back and carrying a map. Activity stays
uneven (3–16 posts per board); no generic repeated welcome or inflated counter.

Existing-profile counts depend on saved history, not current fixtures. An intact
old original-only world has 16 MITI and 14 DAISIZEN-1 posts; its eligible old
expansion adds 36 across eight boards once. A previously expanded world has 66,
with Wakaba/bulletin absent if it predates them. A previous pristine 72-post world
has the twelve previously populated boards above and zero in DAISIZEN 2/4/6. Deleted,
partially customized or imported worlds can have zero anywhere; missing boards
are displayed empty without display-only demos. Reload/consent does not fill them.
These cases are reproduced in deterministic repository/browser tests; no claim is
made about an operator's unrelated personal browser data. Settings recovery
previews the actual saved-world eligibility/counts and fills only explicitly
confirmed empty default destinations; see [recovery rules](local-storage.md#empty-default-board-recovery-issue-131).
Wakaba's existing three authored posts are visible to anonymous fresh/reset users
through MAIN `16` → `1`, without WebGPU, a model, registration or Settings.

Other quiet screens have different semantics. DAISIZEN LIBRARY/OSL categories and
other bundled information collections are read-only service content (OSL also
allows explicit file registration); empty categories need separately researched
material if expanded. Mailboxes may legitimately have no incoming mail. OLT rooms
may have nobody present and search may have zero matches. Retained electronic
conference contributions use their own topic workflow (three on fresh/reset),
and NetNews has its own six bundled articles and posting rules. None is an extra
local forum board. Keep accurate empty states and contextual instructions there;
do not fabricate mail, presence, articles or search hits to hide zeros. Deliberate
empty/imported/custom forums remain valid saved worlds.

See the [validation record](validation.md#complete-public-forum-starters-and-safe-recovery-issue-131) for the production and repository checks.
