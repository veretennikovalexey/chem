// Таблица растворимости кислот, оснований и солей в воде.
//
// Данные — data/solubility_table.json (единственный источник правды):
//   cations[23]  катионы, слева направо  (H+ … Cu2+)
//   anions[14]   анионы, сверху вниз     (OH- … SiO3 2-)
//   grid[14]     по строке на анион, по одному символу на катион:
//                Р растворимо · М малорастворимо · Н нерастворимо ·
//                — не существует (разлагается водой)
// Строка grid[i] описывает анион anions[i]; её j-й символ — вещество из
// cations[j] и anions[i]. Ни одна формула в файле не хранится: формула
// вещества собирается здесь из зарядов ионов, поэтому данные нельзя
// рассинхронизировать с подписями.

// В подписи иона встречаются ДВЕ разные цифры, и путать их нельзя:
//   число атомов в группе — внизу: SO₄, NO₂, NH₄, CH₃COO
//   заряд иона            — вверху: ²⁻, ³⁻, ⁺
// Опаснее всего NO₂⁻ и NH₄⁺: если обе цифры набрать одинаково, «NO2-»
// читается как заряд 2−, хотя двойка здесь — два атома кислорода, а заряд
// у нитрит-иона единичный. Поэтому обе цифры берутся из юникода: у ₂ и ² в
// шрифте разная высота по рисунку глифа, а не по сдвигу через CSS, и они не
// сливаются даже вплотную. Разметка <sub>/<sup> тут не годится — при мелком
// кегле оба индекса оказываются на одной высоте.
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const MINUS = "−"; // типографский минус, как на карточке элемента

// "SO4" -> "SO₄";  цифры внутри формулы группы — это всегда число атомов.
const textSym = (s) => s.replace(/\d/g, (d) => SUB[+d]);

// Заряд: "²⁻", "³⁻", "⁺". Единицу не пишут — Cl⁻, а не Cl¹⁻.
function chargeText(q) {
  const n = Math.abs(q) > 1 ? SUP[Math.abs(q)] : "";
  return n + (q > 0 ? "⁺" : "⁻");
}

// Готовая подпись иона, обычным текстом: SO₄²⁻, NO₂⁻, NH₄⁺, Fe³⁺.
const ionText = (ion) => textSym(ion.sym) + chargeText(ion.charge);

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

// Формула вещества из катиона и аниона: индексы — по наименьшему общему
// кратному зарядов; многоатомный ион с индексом больше 1 берётся в скобки.
// Два исключения, где обычная запись отличается от механической:
// H+ + OH- это вода, а уксусная кислота пишется CH3COOH, а не HCH3COO.
function formula(cat, an) {
  if (cat.sym === "H" && an.sym === "OH") return "H₂O";
  if (cat.sym === "H" && an.sym === "CH3COO") return "CH₃COOH";
  const g = gcd(cat.charge, -an.charge);
  const nCat = -an.charge / g;
  const nAn = cat.charge / g;
  const part = (ion, n) =>
    (ion.poly && n > 1 ? "(" + textSym(ion.sym) + ")" : textSym(ion.sym)) +
    (n > 1 ? textSym(String(n)) : "");
  return part(cat, nCat) + part(an, nAn);
}

const CLASS = { Р: "sol-p", М: "sol-m", Н: "sol-n", "—": "sol-x" };

// Ни одна подпись больше не содержит разметки — только текст, поэтому
// textContent, а не innerHTML.
function cell(className, text, col, row, title) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  div.style.gridColumn = col;
  div.style.gridRow = row;
  if (title) div.title = title;
  return div;
}

fetch("solubility_table.json")
  .then((r) => r.json())
  .then((data) => {
    const { cations, anions, grid, legend } = data;
    document.getElementById("sol-title").textContent = data.title;
    document.title = data.title;

    const table = document.getElementById("solub");
    table.style.gridTemplateColumns = `120px repeat(${cations.length}, 40px)`;

    // ---- шапка: катионы ----
    table.appendChild(cell("sol-corner", "", 1, 1, ""));
    cations.forEach((c, j) => {
      table.appendChild(cell("sol-head", ionText(c), j + 2, 1, c.ru));
    });

    // ---- строки: анион + 23 клетки ----
    anions.forEach((a, i) => {
      const row = i + 2;
      table.appendChild(cell("sol-side", ionText(a), 1, row, `${a.ru}-ион`));

      const values = [...grid[i]];
      values.forEach((v, j) => {
        const c = cations[j];
        const name = `${formula(c, a)} — ${legendOf(legend, v)}`;
        table.appendChild(cell("sol-cell " + CLASS[v], v, j + 2, row, name));
      });
    });

    // ---- легенда ----
    const box = document.getElementById("legend");
    legend.forEach((l) => {
      const item = document.createElement("div");
      item.className = "sol-leg";
      const mark = document.createElement("span");
      mark.className = "sol-cell " + CLASS[l.code];
      mark.textContent = l.code;
      const text = document.createElement("span");
      text.className = "sol-leg-text";
      text.textContent = "— " + l.name + (l.note ? ", " + l.note : "");
      item.appendChild(mark);
      item.appendChild(text);
      box.appendChild(item);
    });
    const cond = document.createElement("div");
    cond.className = "sol-cond";
    cond.textContent = data.conditions;
    box.appendChild(cond);
  });

function legendOf(legend, code) {
  const l = legend.find((x) => x.code === code);
  return l ? l.name : code;
}
