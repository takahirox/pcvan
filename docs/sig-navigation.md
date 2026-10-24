# SIG navigation and community practices

All normal participation uses the terminal command input. `13` opens the
community directory. `8` (コンピュータ) and `11` (趣味) retain their existing
collections and additionally accept `SIGS` to reach the same directory.
Every MAIN selector `1`–`21`, `X`, `Q` retains its existing destination.

| Route from MAIN | Destination | First-visit conversations |
| --- | --- | --- |
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
recognizes both authored seed origins as local conversations. It does not load a
model before consent or increase activity caps to populate these communities.
See [local AI](local-ai.md) and [safe migration](local-storage.md#community-expansion-migration).
