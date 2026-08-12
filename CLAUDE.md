# CLAUDE.md — Project: Interactive Periodic Table (`chem`)

A minimal, local, fast web app that displays the periodic table of the elements.
This file holds all the working info for the project and the current plan.
Keep it updated as new tasks are agreed in chat.

---

## Core requirements (from the user)

- **Minimal code** — no frameworks, no build step, as few files as possible.
- **Local** — runs fully offline on the user's machine.
- **Fast** — instant load, no heavy dependencies.

## Tech stack (chosen)

- **Frontend:** Vanilla JavaScript + HTML + CSS. No frameworks, no bundler, no npm.
- **Serving / backend:** Node.js built-in `http` module (`server/server.js`). No
  external packages, no `npm install` — just `node server\server.js`, or
  `start.cmd`. Serves `public/` on port 1429 and renders the per-element pages on
  the fly.
- **Data store:** a plain local JSON file (`data/elements.json`) — see "Data storage".
- **Why:** A framework or heavy backend would add code and slow things down, which
  breaks the "minimal / fast" requirement. The user is comfortable running
  `node server.js`, and Node's built-in `http` server needs zero dependencies while
  staying fast and fully offline.

## Data storage — local JSON, not SQLite

- All element data lives in **`data/elements.json`** (one array, one object per element:
  `{ num, sym, col, row, en, ru, group, metal, noble, ar, conf }`). This is the **single source of truth** — the
  front-end grid and the server-rendered element pages both read it.
- **Why JSON instead of SQLite:** the dataset is 118 fixed, read-only rows. A JSON
  file is dependency-free (no `npm install`, no native module, no experimental
  `node:sqlite` flag), loads instantly, and is trivial to edit by hand — it fits the
  project's "minimal / local / fast" rules. SQLite would add setup and moving parts
  for zero benefit at this scale. **If the data later grows or needs real querying,
  relations, or writes from the app, revisit and migrate to SQLite then.**

## Port

- `3000` is **already in use** on this machine — do **not** use it.
- This project runs on **port 1429**.
- URL: `http://localhost:1429/index.html`

## Run / dev commands

```bash
# from the project root (the chem/ folder)
start.cmd          # or, the same thing:  node server\server.js
# then open http://localhost:1429/index.html in the browser
```

The server resolves `../data` and `../public` relative to its own file, so it can
be started from any working directory.

## Project structure

```
chem/
├── data/
│   ├── elements.json    # 118 elements
│   │                    # { num, sym, col, row, en, ru, group, ox, oxm, metal, noble, dia, ar, conf }
│   └── solubility_table.json  # solubility: cations[23], anions[14], grid[14] rows of Р/М/Н/—
├── public/              # everything the browser may load — the static root
│   ├── index.html       # long form (18 groups): markup + root grid container
│   ├── app.js           # fetches elements.json, renders the long-form grid of links
│   ├── short.html       # short form (8 groups): markup + grid + series containers
│   ├── short.js         # renders the short-form table from the same elements.json
│   ├── solubility_table.html  # solubility of acids, bases and salts in water
│   ├── solubility_table.js    # renders it; builds every formula from the ion charges
│   └── style.css        # both grids + solubility table + hover + element-page styles
├── server/
│   └── server.js        # Node server: static files + dynamic /N.html pages (port 1429)
├── start.cmd            # launcher: node server\server.js
├── CLAUDE.md            # this file — project info & plan
├── chemistry_lessons.md
├── chem.url             # shortcut to http://localhost:1429/index.html
├── ppl.cmd              # git add/commit/push helper
├── todo, todo-*.txt, work-*.txt   # task briefs and work logs
└── backup/              # older flat copy of the app files
```

**URLs are independent of this layout** — the browser asks for `/index.html`,
`/short.html`, `/solubility_table.html`, `/style.css`, `/app.js`, `/short.js`,
`/solubility_table.js`, `/N.html`, and for data by bare name
(`/elements.json`, `/solubility_table.json`); nothing carries a folder prefix.

## Conventions

- Dependency-free. No npm packages, no bundler, no CDN.
- One responsibility per folder: data (`data/`) / everything the browser may load
  (`public/`) / the code that serves it (`server/`); and one per file inside them:
  markup (`index.html`) / style (`style.css`) / logic (`app.js`).
- **`data/` and `server/` are never reachable over HTTP.** Only `public/` is a
  static root; the datasets in `data/` are published through one `.json` route.
- A new browser-facing file goes in `public/`; a new element field goes in
  `data/elements.json`, a new dataset in its own `data/*.json` (served
  automatically). Nothing new belongs in the project root.
- **Labels that can be computed are computed, not stored** — the Ar rounding
  lives in `server.js`, the 322 solubility formulas in `solubility_table.js`.
  Data and its captions must not be able to drift apart.
- All 118 elements live in `data/elements.json` as
  `{ num, sym, col, row, en, ru, group, metal, noble, conf }` —
  the lanthanides (57–71) sit in grid row 9 and the actinides (89–103) in grid
  row 10 (row 8 is an empty spacer).
- Prefer CSS for layout and the hover effect; use JS only for data + rendering.

---

## Task 1 — Periodic table with hover-to-reveal atomic number — ✅ DONE

**Goal:** The user opens the browser and sees a wide periodic table. Each cell is a
square showing **only the element symbol** (e.g. `O`). On hover, the symbol is
**replaced by its atomic number** in the same square (e.g. oxygen `O` → `8`).

**How it was built:** an 18-column CSS Grid (`style.css`) in the standard
periodic-table shape; `app.js` creates one cell per element; each cell holds a
`.sym` (symbol) and a `.num` (atomic number) span; pure-CSS `:hover` hides the
symbol and shows the number. Served by `node server.js` on port 1429.

**Verified:** 118 unique elements, valid non-overlapping grid positions; the render
loop produces 118 cells; oxygen shows `O` by default and `8` on hover.

## Task 2 — Click an element to open its page (`/N.html`) — ✅ DONE

**Goal:** Clicking an element (e.g. `8`) opens `http://localhost:1429/8.html`. At the
top of that page: **"8. O"**, then the element name **in English**, then **in
Russian** (e.g. `Oxygen` / `Кислород`). All data stored locally.

**How it was built:**

1. **Data** — added English + Russian names to `elements.json` (now the single
   source of truth: `{ num, sym, col, row, en, ru, group, metal, conf }`).
2. **Grid links** — `app.js` now fetches `elements.json` and renders each cell as an
   `<a href="N.html">` (the symbol→number hover is unchanged).
3. **Element pages** — `server.js` matches `/<number>.html`, looks the element up in
   `elements.json`, and renders the page on the fly (no 118 static files). Header is
   `N. Sym`, then the English name, then the Russian name. Unknown numbers → 404.
4. **Styling** — element-page styles added to `style.css`; a small "← Periodic table"
   back link returns to the grid.

**Verified:** `/8.html` → `8. O` / `Oxygen` / `Кислород`; `/1.html` → Hydrogen /
Водород; `/118.html` → Oganesson / Оганесон; `/`, `/style.css`, `/app.js`,
`/elements.json` all HTTP 200; `/999.html`, `/0.html`, `/nope.html` → 404; the grid
renders 118 `<a>` cells each linking to the correct `N.html`.

## Task 3 — Group, electron formula & orbital diagram on the element page — ✅ DONE

**Goal:** Enrich each element (and `elements.json`) with: the **group** as a Roman
numeral (I…VIII), the **electron configuration** (with superscripts), and a
**quantum-cell diagram** of the outer (valence) level — squares with up/down
arrows for the electrons. Everything fits on one screen.

**How it was built:**

1. **Data** — `elements.json` gained two fields per element: `group` (Roman numeral,
   derived from the column; lanthanides/actinides = III) and `conf`, the full
   electron configuration in Klechkovsky/Aufbau filling order as `[n, l, count]`
   entries. Electron counts sum to Z for all 118.
2. **Electron formula** — `server.js` renders `conf` as `1s² 2s² 2p⁴ …` using
   `<sup>` for the superscripts.
3. **Orbital diagram** — the outer valence level is drawn: every subshell of the
   highest shell n (ns, np) plus a partially-filled (n-1)d / (n-2)f, each labelled
   (2s, 2p, …) with its boxes (s=1, p=3, d=5, f=7), filled by Hund's rule (one ↑
   per box, then pair with ↓). A filled inner d¹⁰/f¹⁴ stays in the core and is not
   drawn. E.g. carbon → `2s` ↑↓ | `2p` ↑ ↑ ▯.
4. **Layout** — compact centered card; labels in Russian (Группа, Электронная
   формула, Графическая формула). Header/paddings trimmed so it fits on screen.

**Note on configurations:** these follow the idealized Klechkovsky/Aufbau order, so
known real-world exceptions (Cr, Cu, Pd, Au, La, …) appear in their "textbook rule"
form (e.g. Cr = …4s² 3d⁴). Real ground-state exceptions can be layered in later.

**Verified:** `conf` sums equal Z for all 118; groups valid; outer-level diagram
spot-checks — C → `2s` ↑↓ / `2p` ↑ ↑ ▯; O → `2s` ↑↓ / `2p` ↑↓ ↑ ↑;
Ne → `2s` ↑↓ / `2p` ↑↓ ↑↓ ↑↓; Na → `3s` ↑; Fe → `4s` ↑↓ / `3d` ↑↓ ↑ ↑ ↑ ↑;
Kr → `4s` ↑↓ / `4p` ↑↓ ↑↓ ↑↓ (filled 3d hidden); groups I/V/VI/VIII correct.

## Task 4 — Short form of the table (`short.html`) — ✅ DONE

**Goal:** A second page, `short.html`, with the same 118 elements laid out in the
**short (8-group) form** of the periodic system, with **period numbers** and
**group numbers**.

**Research — are Roman numerals used?** Yes, for the short form. The short form
numbers its groups **I…VIII in Roman numerals**, each split into a **главная (А)**
and a **побочная (Б)** subgroup; the group number is printed above the column.
The modern IUPAC scheme (Arabic **1–18**, no A/B) belongs to the *long* form and
explicitly deprecates the old Roman "IA/VIIB" labels — they are ambiguous because
CAS and old-IUPAC assign A and B to opposite halves. So: **long form → Arabic 1–18,
short form → Roman I–VIII + А/Б.** Periods stay Arabic (1–7).

**How it was built:**

1. **No new data.** The short-form position is derived in `short.js` from the
   long-form `col`/`row` already in `elements.json`:
   - period — `row` 1–7; lanthanide row 9 → period 6, actinide row 10 → period 7;
   - ряд — small periods (1–3) take one row, big periods take two: the d-block
     half (`col ≤ 10`) first, the p-block half (`col ≥ 11`) second → 11 rows;
   - group — `el.group` (the Roman numeral added in Task 3) *is* the 8-group number;
   - subgroup — А for `col` 1–2 and 13–18 (s-/p-block), Б for `col` 3–12 (d-block).
2. **Layout — one uniform lattice.** CSS grid: column 1 = period number (spans both
   rows of a big period), then **17 equal 44px columns with the same 4px gap**, so
   every element sits in its own cell and the spacing is identical everywhere.
   Groups I–VII take **2 columns each** (А left, Б right — the standard variant, so
   K/Cu, Sc/Ga, Mn/Br sit in neighbouring columns); group VIII takes **3** for the
   triads Fe Co Ni / Ru Rh Pd / Os Ir Pt / Hs Mt Ds, with the noble gases in the
   first of the three. Column of an element = `2·group − 1` (А) or `2·group` (Б);
   group VIII = `15 + (col − 8)`.
   **→ Superseded by Task 7:** group VIII is now **4** columns (18 in total) so the
   triads sit in Б, not in the А column shared with the noble gases.
3. **Lanthanides / actinides** — La (57) and Ac (89) stay in group III Б marked
   `La*` / `Ac**`; 58–71 and 90–103 are listed in two rows under the table.
4. **Behaviour** — identical to the long form: symbol → atomic number on hover,
   each cell links to `/N.html`. Cross-links between `index.html` and `short.html`.

**Verified:** `short.js` was run against a DOM shim — 118 elements placed exactly
once (90 in the grid + 28 in the series rows), **no two elements share a grid cell**,
all 17 columns used, every cell links to `N.html`, the column always matches
`el.group`, А columns hold only главные подгруппы and Б columns only побочные,
8 Roman headers spanning the right columns, 7 period labels with the right two-row
spans. Spot-checks:
H → 1/IА, He → 1/VIIIА, K → IА and Cu → IБ, Sc → IIIБ and Ga → IIIА, Mn → VIIБ and
Br → VIIА, Fe Co Ni → VIIIБ, La* → IIIБ, Ac** → IIIБ, Rf → IVБ, Nh → IIIА,
Og → VIIIА. Server: `/short.html`, `/short.js` → 200.

## Task 5 — Metals tinted on the long form (`index.html`) — ✅ DONE

**Goal:** On `index.html`, fill the metal cells with a barely-visible, pleasant
background color (color chosen by Claude).

**How it was built:**

1. **Classification** — non-metals are the unmetals + noble gases + the metalloids
   (B, Si, Ge, As, Sb, Te, At); everything else is a metal and gets the extra class
   `metal` on its cell. Initially a `NON_METALS` set inside `app.js`; **moved into
   `elements.json` as the `metal` boolean in Task 6**, when the short form needed
   the same flag.
2. **Color** — `.cell.metal { background: #fdf3e3; }` — a faint warm sand tint,
   readable next to the white non-metals without shouting. Hover is
   `#f4e4c6` (a shade deeper of the same warm tone, so metals still visibly
   respond to hover); non-metals keep the neutral `#eeeeee` hover.
   `.cell.metal:hover` outranks `.cell:hover` on specificity.
3. **Scope** — long form only. `short.html` / `short.js` are untouched.

**Verified:** 118 cells rendered, 92 metals / 26 non-metals; the non-metal set is
exactly `H He B C N O F Ne Si P S Cl Ar Ge As Se Br Kr Sb Te I Xe At Rn Ts Og`;
spot-checks Fe/Li/Al/La/U/Po/Au/Hg → metal, O/He/B/Si/As/I/At/Og → not; every cell
still links to `N.html` with both the symbol and number spans; `short.js` has no
reference to the class.

## Task 6 — Same metal tint on the short form (`short.html`) — ✅ DONE

**Goal:** Color the elements on `short.html` exactly like the long form — the same
elements, the same color.

**How it was built:**

1. **Flag moved into the data.** As Task 5 anticipated, a second page now needs the
   metal flag, so the hard-coded `NON_METALS` set left `app.js` and became a 9th
   field in `elements.json`: `{ num, sym, col, row, en, ru, group, metal, conf }`,
   `metal` being a boolean. One source of truth, no duplicated set — and the
   server-rendered element pages can use it later for free.
2. **Both renderers read it.** `app.js` and `short.js` each set
   `cell.className = el.metal ? "cell metal" : "cell"`. Because `short.js` builds
   every cell through the shared `cellLink()`, the lanthanide/actinide rows under
   the table are tinted too.
3. **No new CSS.** The `.cell.metal` rules from Task 5 already apply on both pages —
   `style.css` is shared.

**Verified:** both forms render 118 cells with 92 metals / 26 non-metals and
**zero mismatches element-by-element** between the long and the short form; the
short form matches the `metal` flag in `elements.json` for all 118; all 28
lanthanide/actinide series cells are tinted; the short grid still places 90 cells
with no overlaps and every cell links to `N.html`; `conf` sums still equal Z for
all 118 after the file was rewritten.

## Task 7 — Triads moved into subgroup Б of group VIII (`short.html`) — ✅ DONE

**Goal:** Fe, Ru, Os and Hs (and with them the whole triad) must sit in the
**побочная подгруппа Б** of group VIII, not in the А column with the noble gases.

**Research — who is right?** The user is. VIII А is the noble gases (p-elements,
completed shell); VIII Б is the iron triad (Fe Co Ni) plus the two platinum triads
(Ru Rh Pd, Os Ir Pt) and their 7th-period analogues Hs Mt Ds — d-elements, so
побочная подгруппа. In the classic *printed* short table the group VIII box is 3
cells wide, the triad fills it and the noble gas is printed flush left, i.e.
visually under Fe — but that table prints no per-column А/Б captions; subgroup
membership is shown by shifting the symbol left (главная) or right (побочная)
inside the box. **This** table does print А/Б as column headers, so the old
compromise stopped working: a column captioned «А» cannot contain iron. Widening
group VIII also follows the classic "главные слева, побочные справа" rule more
faithfully than the previous layout did.

**How it was built:**

1. **Group VIII is now 4 lattice columns** — one А column (15) for the noble gases,
   then three Б columns (16–18) for the triad. The lattice went 17 → **18** columns
   (`grid-template-columns: 40px repeat(18, 44px)` in `style.css`).
2. **`short.js`** — `place()` now returns `VIII_A + 1 + (col − 8)` for the d-block
   half of group VIII (`VIII_A = 15`); the noble gases keep column 15. The header
   loop spans the Roman `VIII` over 4 columns and its `Б` caption over 3.
3. **Nothing else changed** — periods, ряды, series rows, links and hover are
   untouched, and the long form is not affected at all.

**Verified:** DOM shim — 90 grid cells + 28 series = 118, no overlaps, all 18
columns used, `VIII` header spans `16 / span 4`, its `Б` spans `17 / span 3`,
А columns are exactly 2,4,6,8,10,12,14,16, and **every** element's column matches
its subgroup (0 errors). Positions: Fe/Ru/Os/Hs → first Б column, Co/Rh/Ir/Mt →
second, Ni/Pd/Pt/Ds → third; He Ne Ar Kr Xe Rn Og all in the А column. Server:
`/short.html`, `/short.js`, `/26.html` → 200.

## Task 8 — Noble gases tinted on both forms — ✅ DONE

**Goal:** Give the inert gases their own quiet background color, stored and applied
the same way as the metal tint.

**How it was built:**

1. **Flag in the data** — a new boolean `noble` in `elements.json` (10th field, right
   after `metal`), true for He, Ne, Ar, Kr, Xe, Rn, Og. Same pattern as `metal`:
   one source of truth, both renderers read it, the element pages can use it later.
2. **Both renderers** — `app.js` and `short.js` now compose the class list:
   `"cell" + (el.metal ? " metal" : "") + (el.noble ? " noble" : "")`.
3. **Color** — `.cell.noble { background: #eaf1f8; }`, a faint cool blue — the cold
   counterpart of the warm metal sand, so the two categories never read as the same
   tint. Hover `#cfe0f0`, a shade deeper of the same tone.
4. **No conflict with `metal`** — noble gases are non-metals, so no cell ever carries
   both classes.

**Verified:** 7 noble cells on each form (`He Ne Ar Kr Xe Rn Og`), 92 metals
unchanged, **zero class mismatches element-by-element** between the long and the
short form, no cell is both `metal` and `noble`, all 118 cells still link to
`N.html`, and `conf` sums still equal Z for all 118 after the JSON was rewritten.

## Task 9 — Relative atomic mass Ar on the element card — ✅ DONE

**Goal:** Show the relative atomic mass **Ar** on every element page — rounded to a
whole number for all elements (oxygen → 16), with **chlorine** the single exception
at one decimal place (35.5).

**How it was built:**

1. **Data** — an 11th field `ar` in `elements.json`, inserted between `noble` and
   `conf`: `{ num, sym, col, row, en, ru, group, metal, noble, ar, conf }`. It holds
   the **exact IUPAC standard atomic weight** (abridged: H 1.0080, O 15.999,
   Cl 35.45 …); for the elements with no stable isotope it is the mass number of
   the most stable isotope (Tc 97, Pm 145, Po 209 … Og 294).
2. **Rounding is a display rule, not stored data.** `server.js` gained
   `formatAr(el)` with an `AR_DECIMALS = { 17: 1 }` table: everything renders via
   `toFixed(0)`, chlorine via `toFixed(1)`. Keeping the true value in the JSON and
   the rule in one function means the precision of any element can be changed by
   one number, and the data stays honest.
3. **Layout** — a new `.prop` row, «Относительная атомная масса A<sub>r</sub>», the
   first line of the props block, above Группа. No new CSS beyond `.prop sub`
   sharing the existing small-superscript size.

**Source:** IUPAC standard atomic weights via Wikipedia, *List of chemical elements*
(abridged values; `[ ]` entries = mass number of the most stable isotope).

**Note on Dy:** dysprosium is exactly 162.50, the one halfway value in the table.
It renders as **163** (round half up). If a textbook the user works from prints 162,
this is the single line to change.

**Verified:** all 118 elements have a numeric `ar`; `ar ≥ Z` and within a plausible
range for every element; only chlorine renders with a decimal point, and it renders
`35.5`; 36 hand-checked values against the reference table (H 1, O 16, Ar 40, K 39,
Ca 40, Fe 56, Cu 64, Ag 108, Au 197, Pb 207, U 238, Og 294 …) all match. No
regression after the JSON rewrite: 118 elements numbered 1–118, key order intact,
`conf` sums still equal Z, 92 metals / 7 noble gases unchanged. Server: `/`,
`/index.html`, `/short.html`, `/style.css`, `/app.js`, `/short.js`,
`/elements.json`, `/8.html` → 200; `/999.html` → 404. Rendered cards spot-checked:
H 1, O 16, Cl 35.5, Ar 40, Fe 56, Dy 163, Pb 207, Og 294.

## Task 10 — Molecular index ₂ for the diatomic elements — ✅ DONE

**Goal:** In both tables the seven elements whose simple substance is a diatomic
molecule — **H₂ N₂ O₂ F₂ Cl₂ Br₂ I₂** — show a subscript 2 to the lower right of
the symbol instead of the bare letter, and the element card shows it too.

**How it was built:**

1. **Flag in the data** — a 10th field `dia` (boolean) in `elements.json`, between
   `noble` and `ar`: `{ num, sym, col, row, en, ru, group, metal, noble, dia, ar,
   conf }`. True for 1, 7, 8, 9, 17, 35, 53. Same pattern as `metal`/`noble`: three
   consumers (long form, short form, element page) read one source of truth.
2. **Both renderers** — `app.js` and `short.js` append a `<sub>2</sub>` node to the
   `.sym` span when `el.dia`. In `short.js` this happens after the `*` / `**`
   lanthanide marks, so `La*` is unaffected (no diatomic element carries a mark).
3. **Element page** — `server.js` renders the header as `8. O<sub>2</sub>`; the
   `<title>` uses the Unicode subscript (`8. O₂ — Oxygen`) since a tab title
   cannot hold markup.
4. **Styling** — `.cell .sym sub { font-size: 0.6em; line-height: 0; }` —
   `line-height: 0` keeps the subscript out of the line box, so the symbol stays
   vertically centred in the 44px square exactly as before. Card header:
   `.element-head sub { font-size: 0.5em; }`.
5. **Hover is untouched** — the subscript lives inside `.sym`, which `:hover` hides
   in favour of `.num`, so hovering still shows the plain atomic number (`8`).

**Scope note:** only the seven classic diatomics. Other elemental molecules (P₄,
S₈, O₃) are *not* marked — if they are ever wanted, `dia` should become a number
(atoms per molecule) instead of a boolean.

**Verified:** `dia` is boolean on all 118 and true for exactly `H N O F Cl Br I`;
key order and every other field intact (`conf` sums = Z, 92 metals, 7 noble gases,
`ar` unchanged). DOM shim — both forms render 118 cells, **exactly 7** of them
carry `<sub>2</sub>`, each of those is `Sym<sub>2</sub>` and nothing else, every
cell's hover number still equals its `num`, the short grid still places 90 cells
with no overlaps, `La*` intact. Server: `/`, `/index.html`, `/short.html`,
`/style.css`, `/app.js`, `/short.js`, `/elements.json`, `/1.html`, `/8.html`,
`/17.html`, `/26.html` → 200, `/999.html` → 404; headers render `1. H₂`, `7. N₂`,
`8. O₂`, `9. F₂`, `17. Cl₂`, `35. Br₂`, `53. I₂`, while `He`, `Fe`, `Og` stay bare.

## Task 11 — Oxidation states on the element card — ✅ DONE

**Goal:** Every element page shows its possible oxidation states, with the
characteristic ones highlighted, plus a «высшая / низшая» line.

**How it was built:**

1. **Data — two arrays** in `elements.json`, right after `group`, so the key order
   is now `{ num, sym, col, row, en, ru, group, ox, oxm, metal, noble, dia, ar,
   conf }`:
   - `ox` — **every documented** oxidation state, ascending;
   - `oxm` — the **characteristic** (stable, textbook) subset, always ⊆ `ox`.
   **Zero is not stored**: every element has it, it distinguishes nothing. The
   noble gases He, Ne, Ar have `ox: []` — they form no compounds.
2. **Source.** `oxm` is based on the **PubChem periodic-table CSV**
   (`OxidationStates` column, `https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/CSV`),
   `ox` on the standard list of documented states (Wikipedia, *Oxidation state*).
   Every state PubChem lists is checked to be present in `ox`.
3. **Rendering** (`server.js`): `signed()` prints the sign with a typographic
   minus (`−`, U+2212); `oxListHtml()` joins the list and wraps the characteristic
   ones in `<b>`; `oxRangeHtml()` prints the range. CSS: `.prop .ox` is normal
   weight so only the `<b>` states stand out.
4. **The range is computed over `oxm`, not `ox`** — deliberately. Over all
   documented states iron would claim «высшая +7» and copper «+4», and the school
   rule *высшая = номер группы* would stop working. **Низшая = 0** when no
   characteristic state is negative (metals — "простое вещество"). Oxygen and
   fluorine have *only* a negative characteristic state, so they print a single
   line «Характерная степень окисления: −2 / −1» instead of the same number twice.

**Deliberate deviations from the PubChem column** (25 elements, all reviewed):

- **N** — PubChem marks all eight states as common; textbooks call −3, +3, +5
  characteristic. **Si** — +2 (SiO) is not characteristic. **Kr, Xe, Rn** —
  PubChem gives only 0, but KrF₂, XeF₂/XeF₄/XeO₃ and RnF₂ exist. **Mo** — +4
  alongside +6. **Ru** — +4 and +8 (RuO₄) alongside +3. **Pd** — +3 is rare, +2 is
  the characteristic one. **Os** — +8 (OsO₄). **At** — behaves as a halogen: −1,
  +1. **Br** — +7 added (perbromates, HBrO₄), so the highest state reaches the
  group number VII.
- **105–118** — PubChem publishes the whole *predicted* list there; `oxm` keeps
  only the predicted most stable state (Db +5, Sg +6, Bh +7, Hs +8 …).

**Caveats:** for the transactinides (104–118) every value is predicted, not
measured, and relativistic effects break the "highest = group number" rule (Fl is
credited with +6). Exotic records are kept in `ox` — Ir **+9** (the highest known
oxidation state, IrO₄⁺) and B **−5**. Lithium is **+1** only: the −1 mentioned in
chat is not part of the mainstream tables and was dropped.

**Verified** (`outputs/ox/verify.py`): all 118 have `ox`/`oxm` sorted, unique,
integer, zero-free, `oxm ⊆ ox`, `oxm` empty iff `ox` empty; every PubChem-listed
state is present in `ox`; for main-group elements (rows 1–7, Z < 104) the highest
state never exceeds the group number and the lowest never goes below *group − 8*;
the difference set between `oxm` and PubChem is exactly the documented list above.
Spot-checks: F `−1` only, O `−2 −1 +1 +2` with `−2` characteristic, He/Ne/Ar
empty, Cl `−1 +1 +5 +7`, Mn `+2 +3 +4 +7`, Fe `+2 +3`, Ir up to +9, Xe up to +8.
The «высшая ≠ номер группы» report lists only the expected exceptions
(O, F, Kr, Xe, Rn, Po, At). Server: all **118** element pages → 200, `/999.html`
→ 404, both grids still render 118 cells (no regression after the JSON rewrite).

## Task 12 — Three-folder layout: `data/` · `public/` · `server/` — ✅ DONE

**Goal:** Split the flat project into three folders — `data`, `public`, `server` —
by **copying**, never moving: the user's server was running while the work was
done, so no file in the root could be touched. The old flat layout and the new
tree therefore both exist and both work; the user removes the old copies himself
from a delivered list.

**How it was built:**

1. **Copies only.** `elements.json` → `data/`; `index.html`, `short.html`,
   `app.js`, `short.js`, `style.css` → `public/`; `server.js` → `server/`. The six
   front-end/data copies are **byte-identical** to their originals.
2. **`server/server.js` repointed** — the only copied file that differs.
   `ROOT = __dirname` became two anchors relative to the file itself,
   `PUBLIC = ../public` and `DATA = ../data`, so the server no longer depends on
   the working directory it is started from. The static handler serves from
   `PUBLIC`, and the traversal guard became `path.resolve` +
   `startsWith(PUBLIC + path.sep)` — the old `startsWith(ROOT)` string test would
   also have accepted a sibling folder like `public-old`.
3. **One route for `/elements.json`.** `app.js` and `short.js` both
   `fetch("elements.json")`, but the file now sits in `data/`, outside the static
   root. Rather than keep a second copy inside `public/` — which is exactly what
   the "single source of truth" rule in *Data storage* exists to prevent — the
   server publishes the `data/` file through one named route. Four lines, and both
   front-end files stayed untouched.
4. **`start.cmd`** in the root runs `node "%~dp0server\server.js"`. Port stays
   1429, so `chem.url` still works, and every URL is unchanged.

**Deliberately left in the root:** `CLAUDE.md`, `chemistry_lessons.md`, the
`todo*` / `work-*.txt` logs, `chem.url`, `ppl.cmd` and `backup/`.

**Verified:** the tree was assembled and run in a sandbox first, so nothing had to
be tested against the live server on 1429. Six copies byte-identical to their
originals (`cmp`), `server/server.js` the only difference. Server started from an
unrelated cwd: `/`, `/index.html`, `/short.html`, `/style.css`, `/app.js`,
`/short.js`, `/elements.json` → 200; **all 118** element pages → 200;
`/999.html`, `/0.html`, `/119.html`, `/nope.html` → 404. `data/` and `server/`
unreachable: `/../server/server.js`, `/..%2fserver%2fserver.js`,
`/../data/elements.json`, `/..%2f..%2fetc%2fpasswd`, `/server/server.js`,
`/data/elements.json`, `/../start.cmd` all refused, server source never served;
the guard was re-checked under `path.win32` rules including `/..\server\server.js`
— nothing resolves outside `public/`. Content unchanged: `/8.html` → `8. O₂` /
Oxygen / Кислород / Ar 16; `/17.html` → 35.5; `/26.html` → Железо; `/118.html` →
Oganesson; `/1.html` → `1. H₂`; `/2.html` → «соединений не образует». The JSON at
`/elements.json` is byte-identical to `data/elements.json`: 118 records 1–118,
`conf` sums = Z, 92 metals, 7 noble gases, 7 diatomics. `node --check` on the
deployed file parses clean.

## Task 13 — Таблица растворимости (`solubility_table.html`) — ✅ DONE

**Goal:** A second table — the solubility of acids, bases and salts in water at
standard conditions. Anions down the left (~14, OH⁻ … SiO₃²⁻), cations across the
top (~23, H⁺ … Cu²⁺); the counts in the brief were approximate.

**How it was built:**

1. **Exactly 14 × 23**, because at those counts the rows land on the ends the
   brief names. Cations: `H Li K Na NH₄ | Ba Ca Mg Sr | Al Cr Fe²⁺ Fe³⁺ | Mn Zn
   Ni Co Cd Sn Pb | Ag Hg Cu` — iron appears twice, as two columns, because FeI₂
   exists and FeI₃ does not. Anions: `OH F Cl Br I S SO₃ SO₄ NO₃ NO₂ PO₄ CO₃
   CH₃COO SiO₃`.
2. **Data** — a new file `data/solubility_table.json`: `cations[23]`,
   `anions[14]` (`{sym, charge, poly, ru}`) and `grid[14]`, one **string** per
   anion with one character per cation. A string, not 322 objects, so the whole
   dataset fits on a screen and a row can be checked against a printed table by
   eye. Values: **Р** растворимо (>1 g/100 g), **М** малорастворимо (0.1–1 g),
   **Н** практически нерастворимо (<0.1 g), **—** не существует (hydrolysed by
   water or never obtained). 179 Р / 18 М / 94 Н / 31 — , no empty cell.
3. **No formula is stored.** All 322 are built in `solubility_table.js` from the
   ion charges by lowest common multiple (Al³⁺ + SO₄²⁻ → Al₂(SO₄)₃, a polyatomic
   ion parenthesised when its index exceeds 1). Same reason the Ar rounding lives
   in `server.js` and not in the JSON: a computed label cannot drift from its
   data. Two exceptions where the accepted spelling differs from the mechanical
   one — H⁺ + OH⁻ is H₂O, and acetic acid is CH₃COOH. The formula shows in the
   cell's tooltip together with the meaning: «BaSO₄ — практически нерастворимо».
4. **The dash is a fact, not a gap.** Al₂S₃, Cr₂(CO₃)₃, Fe₂(CO₃)₃ and their kin
   hydrolyse completely; AgOH turns into Ag₂O at once; CuI₂ and FeI₃ cannot exist
   because iodide reduces Cu²⁺ and Fe³⁺. Those cells carry «—», never «Н» — the
   distinction is on the syllabus.
5. **One data route.** `server.js` no longer names `elements.json`: any request
   ending in `.json` is looked up in `data/` by `path.basename`, so a new dataset
   needs no new route and cannot address a file outside `data/`.
6. **Colour** — Р faint green, М the same warm sand as the metals, Н faint pink,
   «—» grey. The colour is a hint; the letter is the data, so the table survives
   black-and-white printing. Both periodic tables link to the page and back.

**On the sources:** no reference table could be extracted from the web — nearly
all of them are images, and the machine-readable copies contradict each other
(one marks NaOH as non-existent). The table was therefore built from solubility
rules and reference solubilities; the judgement calls (LiOH Р, the whole fluoride
row, the mercury and tin dashes, CuSO₃) are listed one by one in
`work-12-08-2026-2.txt`. Each is one character in one `grid` row.

**Verified:** `check-solubility.js` encodes the solubility rules *separately from
the table*, so it cross-checks two independent statements rather than restating
one. 14 rows × 23 chars, alphabet `РМН—` only, no repeated ion, ends match the
brief; all 322 formulas electroneutral with integral, irreducible indices, 26
checked character by character; alkali-metal and ammonium salts soluble except a
named list (LiF, Li₃PO₄, Li₂CO₃, Li₂SiO₃, H₂SiO₃, (NH₄)₂SiO₃); every nitrate Р;
every acetate Р but CH₃COOAg; AgCl/AgBr/AgI Н, PbCl₂/PbBr₂ М, PbI₂ Н;
BaSO₄/SrSO₄/PbSO₄ Н, CaSO₄/Ag₂SO₄ М; no stray «Р» among the carbonates,
phosphates, silicates or sulfites; the hydrolysis and non-existence cells all
dashed; 10 syllabus landmarks (BaSO₄ and AgCl as the qualitative tests, CaCO₃,
CuS, Ag₃PO₄, Cu(OH)₂, Fe(OH)₃, limewater) correct. In real Chromium: 322 cells,
23 headers, 14 side labels, no overlaps, distribution identical to the JSON, a
tooltip on every cell, 4 legend rows, 4 distinct backgrounds, links both ways,
and no regression — `index.html` 118 cells, `short.html` 90, the oxygen card
intact, no console errors.

## Decisions (resolved in chat)

- **Server:** Node (`node server\server.js`, via `start.cmd`), dependency-free —
  chosen over Python because the user already runs servers that way.
- **Hover:** the symbol is **replaced** by the atomic number (not a badge/tooltip).
- **Element pages:** rendered **dynamically** by `server.js` from `elements.json`
  (not 118 static HTML files) to keep the file count low.
- **Storage:** local **JSON** (`data/elements.json`), not SQLite — see "Data storage".
- **Layout:** three folders — `data/` (source of truth), `public/` (the static
  root, the only thing the browser may load), `server/` (the code). Data files are
  **not** duplicated into `public/`; any `/*.json` request is served from `data/`
  by basename (Tasks 12–13). URLs are unchanged by the split.
- **Solubility table:** 23 cations × 14 anions, values Р / М / Н / **—**, where
  the dash means «не существует» (full hydrolysis, or never obtained) and is a
  deliberate answer, not a missing one. Fe²⁺ and Fe³⁺ are separate columns. The
  grid is stored as 14 strings, one per anion; formulas are computed, never
  stored. Judgement calls where sources disagree are listed in
  `work-12-08-2026-2.txt`.
- **Scope:** grid cells show a single centered letter; the category colors are the
  warm metal tint (Tasks 5–6) and the cool noble-gas tint (Task 8), both on both
  forms.
- **Metals:** metalloids (B, Si, Ge, As, Sb, Te, At) count as **non**-metals and stay
  white; Po is a metal. Ts and Og are treated as non-metals.
- **Noble gases:** He Ne Ar Kr Xe Rn **and Og** (group by column 18, even though Og
  is predicted to be reactive) — they get the cool tint, never the metal one.
- **Group VIII of the short form:** 4 columns — А for the noble gases, three Б for
  the triads (Task 7). The А/Б column captions are authoritative: no element may
  stand in the column of the other subgroup.
- **Atomic mass:** `elements.json` stores the **exact** IUPAC value; the rounding
  (integers everywhere, one decimal for Cl) is a **render rule** in `server.js`.
  Radioactive elements use the mass number of the most stable isotope. Dy 162.50
  rounds **up** to 163.
- **Oxidation states:** `elements.json` stores all documented states (`ox`) and
  the characteristic subset (`oxm`); **0 is never stored**. The card prints the
  full list with the characteristic ones bold, and computes «высшая / низшая»
  **from `oxm`** (низшая = 0 if none of them is negative). Source: PubChem for the
  characteristic states, with a documented list of deviations in Task 11.
- **Diatomic index:** the seven classic diatomics (H N O F Cl Br I) print a
  subscript 2 in both grids and in the card header; the flag `dia` lives in
  `elements.json`. Hover still shows the bare atomic number. P₄/S₈/O₃ are out of
  scope.
- **Electron config:** idealized Klechkovsky/Aufbau order (no real ground-state
  exceptions yet). The graphical formula shows the **outer valence level** — the
  highest-shell ns/np plus a partially-filled (n-1)d / (n-2)f; a filled inner
  d¹⁰/f¹⁴ stays in the core and is not drawn.

## Roadmap (future — not started)

- Further tasks to be defined in chat. Update this file whenever a new task is agreed.
- Solubility table follow-ups: highlight the whole row and column on hover (only
  the cell is highlighted now); precipitate colours (CuS black, Ag₃PO₄ yellow,
  Fe(OH)₃ brown) as another field in the data; a link from a cell to the cation's
  element card; printing the table onto one A4 page.
- Element pages now show number, symbol, EN/RU names, Ar, group, electron formula
  and the outer-level orbital diagram. Possible next steps: real ground-state config
  exceptions, or further properties (density, melting point, electronegativity) —
  all as new fields in `elements.json`.
- Ar could also be printed in the grid cells themselves (a small number under the
  symbol), the way a wall chart does it.
- The short form could also show the А/Б subgroup on the element page, or mark the
  s-/p-/d-/f-block with color on both grids.
- A small legend under the grids ("металлы / инертные газы") would make the two
  tints self-explanatory; the element page could show the same tint in its header.
