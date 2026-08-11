// Minimal dependency-free static server + dynamic element pages.
// Run:  node server.js
// Open: http://localhost:1429/index.html

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 1429;
const ROOT = __dirname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// Local data store, keyed by atomic number.
const ELEMENTS = JSON.parse(fs.readFileSync(path.join(ROOT, "elements.json"), "utf8"));
const BY_NUM = {};
for (const el of ELEMENTS) BY_NUM[el.num] = el;

// Relative atomic mass as it is shown on the card. elements.json keeps the exact
// IUPAC value; the rounding rule lives here:
//   - every element is rounded to a whole number (O 15.999 -> 16);
//   - chlorine alone keeps one decimal place (35.45 -> 35.5), the way school
//     tables print it, because its two isotopes make the halfway value matter.
const AR_DECIMALS = { 17: 1 };

function formatAr(el) {
  return el.ar.toFixed(AR_DECIMALS[el.num] || 0);
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

  // Static files (index.html, style.css, app.js, elements.json).
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) {
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
