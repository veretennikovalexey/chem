// Minimal dependency-free static server + dynamic element pages.
// Run:  node server\server.js   (or double-click start.cmd in the project root)
// Open: http://localhost:1429/index.html
//
// The project is split in three folders; this file resolves both of the others
// relative to itself, so the server can be started from any working directory:
//   data/    elements.json, solubility_table.json, compounds.json — the single
//            source of truth
//   public/  what the browser may load: index.html, short.html,
//            solubility_table.html, app.js, short.js, solubility_table.js,
//            formula.js, style.css
//   server/  this file
// The URLs are unchanged by the split: /index.html, /short.html, /style.css,
// /app.js, /short.js, /elements.json, /N.html — plus one page per substance of
// the solubility table, /mgcl2.html, /al2-so4-3.html and so on.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 1429;
const PUBLIC = path.join(__dirname, "..", "public"); // static root
const DATA = path.join(__dirname, "..", "data"); // never served as a folder

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// Local data store, keyed by atomic number.
const ELEMENTS_FILE = path.join(DATA, "elements.json");
const ELEMENTS = JSON.parse(fs.readFileSync(ELEMENTS_FILE, "utf8"));
const BY_NUM = {};
const BY_SYM = {};
for (const el of ELEMENTS) {
  BY_NUM[el.num] = el;
  BY_SYM[el.sym] = el;
}

// HTML escaping for anything that comes out of a data file.
const esc = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// Relative atomic mass as it is shown on the card. elements.json keeps the exact
// IUPAC value; the rounding rule lives here:
//   - every element is rounded to a whole number (O 15.999 -> 16);
//   - chlorine alone keeps one decimal place (35.45 -> 35.5), the way school
//     tables print it, because its two isotopes make the halfway value matter.
const AR_DECIMALS = { 17: 1 };

function formatAr(el) {
  return el.ar.toFixed(AR_DECIMALS[el.num] || 0);
}

// Oxidation states. elements.json keeps every documented state in `ox`
// (ascending, without 0 — every element has it) and the characteristic ones in
// `oxm`; the sign and the bold face are added here.
const MINUS = "−"; // typographic minus, not a hyphen

function signed(v) {
  return v < 0 ? MINUS + -v : "+" + v;
}

function oxListHtml(el) {
  if (!el.ox.length) return "0 — соединений не образует";
  const main = new Set(el.oxm);
  return el.ox
    .map((v) => (main.has(v) ? `<b>${signed(v)}</b>` : signed(v)))
    .join(", ");
}

// Highest / lowest state — counted over the CHARACTERISTIC states (`oxm`), not
// over every exotic one: otherwise iron would claim +7 and copper +4, and the
// school rule "highest = group number" would stop working. Metals have no
// negative characteristic state, so their lowest is 0 (the free element).
function oxRangeHtml(el) {
  if (!el.oxm.length) return "";
  const lo = Math.min(...el.oxm);
  // Oxygen and fluorine have no positive characteristic state at all, so a
  // "highest / lowest" pair would print the same number twice.
  if (Math.max(...el.oxm) < 0) {
    return (
      `<div class="prop"><span class="k">Характерная степень окисления:</span> ` +
      `<span class="v">${signed(lo)}</span></div>`
    );
  }
  return (
    `<div class="prop"><span class="k">Высшая:</span> ` +
    `<span class="v">${signed(Math.max(...el.oxm))}</span> · ` +
    `<span class="k">низшая:</span> ` +
    `<span class="v">${lo < 0 ? signed(lo) : "0"}</span></div>`
  );
}

// Electron formula as text with superscripts: 1s² 2s² 2p⁴ ...
function formulaHtml(conf) {
  return conf.map(([n, l, c]) => `${n}${l}<sup>${c}</sup>`).join(" ");
}

// Graphical formula of the OUTER (valence) level. Each subshell is drawn as
// squares (orbitals: s=1, p=3, d=5, f=7) with up/down arrows for electrons,
// filled by Hund's rule: one ↑ per box first, then pair with a ↓.
const ORBITALS = { s: 1, p: 3, d: 5, f: 7 };

function subshellBoxes(l, count) {
  const n = ORBITALS[l];
  const boxes = new Array(n).fill(0); // 0 empty, 1 = ↑, 2 = ↑↓
  for (let i = 0; i < n && i < count; i++) boxes[i] = 1;
  let rem = count - n;
  for (let i = 0; i < n && rem > 0; i++, rem--) boxes[i] = 2;
  return boxes
    .map((b) => `<span class="box">${b === 2 ? "↑↓" : b === 1 ? "↑" : ""}</span>`)
    .join("");
}

// The subshells that make up the outer level we draw:
//   - every subshell of the highest shell n (its ns and np);
//   - plus a partially-filled (n-1)d and (n-2)f (the d-/f-block valence).
// A filled inner d10 / f14 stays part of the core and is not drawn.
function valenceSubshells(conf) {
  const maxN = Math.max(...conf.map((s) => s[0]));
  return conf.filter(
    ([n, l, c]) =>
      n === maxN ||
      (l === "d" && n === maxN - 1 && c < 10) ||
      (l === "f" && n === maxN - 2 && c < 14)
  );
}

function diagramHtml(conf) {
  return valenceSubshells(conf)
    .map(
      ([n, l, c]) =>
        `<span class="orb"><span class="orb-label">${n}${l}</span>` +
        `<span class="orb-boxes">${subshellBoxes(l, c)}</span></span>`
    )
    .join("");
}

function renderElementPage(el) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${el.num}. ${el.sym}${el.dia ? "₂" : ""} — ${el.en}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="element-page">
    <a class="back" href="index.html">← Таблица Менделеева</a>
    <div class="element-head">${el.num}. ${el.sym}${el.dia ? "<sub>2</sub>" : ""}</div>
    <div class="element-name-en">${el.en}</div>
    <div class="element-name-ru">${el.ru}</div>

    <div class="props">
      <div class="prop"><span class="k">Относительная атомная масса A<sub>r</sub>:</span> <span class="v">${formatAr(el)}</span></div>

      <div class="prop"><span class="k">Группа:</span> <span class="v">${el.group}</span></div>

      <div class="prop"><span class="k">Степени окисления:</span> <span class="ox">${oxListHtml(el)}</span></div>
      ${oxRangeHtml(el)}

      <div class="prop"><span class="k">Электронная формула:</span></div>
      <div class="formula">${formulaHtml(el.conf)}</div>

      <div class="prop"><span class="k">Графическая формула (внешний уровень):</span></div>
      <div class="diagram">${diagramHtml(el.conf)}</div>
    </div>
  </main>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// A page per substance of the solubility table: /mgcl2.html, /al2-so4-3.html.
//
// The formula, its URL and the label printed in the table cell are all built by
// one shared module, public/formula.js — the browser loads it as a script, this
// file requires it. Two copies of that code would eventually disagree and the
// links would point at pages that do not exist.
// ---------------------------------------------------------------------------
const F = require("../public/formula.js");
const SOLUB = JSON.parse(fs.readFileSync(path.join(DATA, "solubility_table.json"), "utf8"));
const COMPOUNDS = JSON.parse(fs.readFileSync(path.join(DATA, "compounds.json"), "utf8"));

const LEGEND = {};
for (const l of SOLUB.legend) LEGEND[l.code] = l;

// slug -> everything a page needs, built once from the table itself, so every
// cell has a page and no page exists without a cell. compounds.json adds only
// what cannot be computed: the Russian name and the description.
const BY_SLUG = {};
SOLUB.anions.forEach((an, i) => {
  [...SOLUB.grid[i]].forEach((value, j) => {
    const cat = SOLUB.cations[j];
    const ascii = F.formulaAscii(cat, an);
    BY_SLUG[F.slug(ascii)] = { cat, an, value, ascii, text: COMPOUNDS[ascii] || null };
  });
});

const FILLED = Object.keys(COMPOUNDS).filter((k) => k[0] !== "_").length;
const TOTAL = Object.keys(BY_SLUG).length;

// Molar mass, computed the same way Ar is: elements.json keeps the exact IUPAC
// values, the rounding is a render rule and lives here. M(MgCl₂) = 95 г/моль.
function molarMass(ascii) {
  const atoms = F.atomCounts(ascii);
  let m = 0;
  for (const sym in atoms) {
    if (!BY_SYM[sym]) return null;
    m += BY_SYM[sym].ar * atoms[sym];
  }
  return Math.round(m);
}

// Which class the substance belongs to follows from the pair of ions alone.
function substanceClass(cat, an) {
  if (cat.sym === "H" && an.sym === "OH") return "оксид водорода";
  if (cat.sym === "H") return "кислота";
  if (an.sym === "OH") return "основание";
  return "соль";
}

// A monatomic ion has an element card; a polyatomic one (SO₄²⁻, NH₄⁺) has not.
function ionHtml(ion) {
  const el = ion.poly ? null : BY_SYM[ion.sym];
  const label = esc(F.ionText(ion));
  return el ? `<a href="${el.num}.html">${label}</a>` : label;
}

function renderCompoundPage(c) {
  const shown = esc(F.formulaText(c.ascii));
  const exists = c.value !== "—";
  const legend = LEGEND[c.value];
  const m = exists ? molarMass(c.ascii) : null;

  const name = c.text
    ? `<div class="element-name-en">${esc(c.text.ru)}</div>`
    : "";

  const about = c.text
    ? `<p class="about">${esc(c.text.about)}</p>`
    : `<p class="about about-empty">Название и описание этого вещества пока не добавлены: ` +
      `в таблице растворимости заполнено ${FILLED} страниц из ${TOTAL}. Всё остальное на ` +
      `этой странице посчитано по формуле и по таблице, поэтому верно уже сейчас.</p>`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${c.text ? esc(c.text.ru) + " " : ""}${shown}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="element-page">
    <a class="back" href="solubility_table.html">← Таблица растворимости</a>
    <div class="element-head">${shown}</div>
    ${name}

    <div class="props">
      <div class="prop"><span class="k">Класс:</span> <span class="v">${substanceClass(c.cat, c.an)}</span></div>

      <div class="prop"><span class="k">Растворимость в воде:</span> <span class="v">${esc(legend.name)}</span>${
        legend.note ? ` <span class="k">— ${esc(legend.note)}</span>` : ""
      }</div>
      ${
        m
          ? `<div class="prop"><span class="k">Молярная масса M:</span> <span class="v">${m} г/моль</span></div>`
          : ""
      }

      <div class="prop"><span class="k">Ионы:</span> <span class="ox">${ionHtml(c.cat)} и ${ionHtml(c.an)}</span></div>
    </div>

    ${about}
  </main>
</body>
</html>
`;
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  // Dynamic element page: /8.html -> element number 8.
  const m = urlPath.match(/^\/(\d+)\.html$/);
  if (m) {
    const el = BY_NUM[parseInt(m[1], 10)];
    if (el) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderElementPage(el));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  // Substance page from the solubility table: /mgcl2.html, /al2-so4-3.html.
  // The requested name is put through the same slug() that builds the links, so
  // /MgCl2.html and even /Al2(SO4)3.html land on the same page. A name that is
  // not a substance (index, short, solubility_table) is not in the map and
  // falls through to the static handler below.
  const c = urlPath.match(/^\/(.+)\.html$/);
  if (c) {
    const compound = BY_SLUG[F.slug(c[1])];
    if (compound) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderCompoundPage(compound));
      return;
    }
  }

  // The data files live in data/, outside the static root, but the front-end
  // asks for them by bare name (/elements.json, /solubility_table.json) — so
  // any .json is looked up in data/. One copy of every dataset, one source of
  // truth; the pages need no path prefix and no change when data is added.
  // path.basename strips any directory part, so this route cannot be used to
  // read a file outside data/.
  if (urlPath.endsWith(".json")) {
    fs.readFile(path.join(DATA, path.basename(urlPath)), (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }
      res.writeHead(200, { "Content-Type": TYPES[".json"] });
      res.end(data);
    });
    return;
  }

  // Static files from public/ (index.html, short.html, style.css, app.js,
  // short.js). path.resolve collapses any ".." before the check, so a request
  // can never climb out of public/ into data/ or server/.
  const filePath = path.resolve(PUBLIC, "." + path.posix.normalize(urlPath));
  if (filePath !== PUBLIC && !filePath.startsWith(PUBLIC + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`chem is running -> http://localhost:${PORT}/index.html`);
});
