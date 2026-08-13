// Таблица растворимости кислот, оснований и солей в воде.
//
// Данные — data/solubility_table.json (единственный источник правды):
//   cations[23]  катионы, слева направо  (H+ … Cu2+)
//   anions[14]   анионы, сверху вниз     (OH- … SiO3 2-)
//   grid[14]     по строке на анион, по одному символу на катион:
//                Р растворимо · М малорастворимо · Н нерастворимо ·
//                — не существует (разлагается водой)
// Строка grid[i] описывает анион anions[i]; её j-й символ — вещество из
// cations[j] и anions[i]. Ни одна формула в файле не хранится: подписи ионов,
// формула вещества и адрес его страницы собираются в formula.js из зарядов
// ионов, поэтому данные нельзя рассинхронизировать с подписями.
//
// formula.js подключён в solubility_table.html раньше этого файла; оттуда
// берутся ionText, formula, formulaAscii и slug. Тот же самый файл читает
// server.js, когда отдаёт страницу вещества, — формула в клетке, адрес
// ссылки и заголовок страницы по построению совпадают.

const CLASS = { Р: "sol-p", М: "sol-m", Н: "sol-n", "—": "sol-x" };

// Ни одна подпись не содержит разметки — только текст, поэтому textContent,
// а не innerHTML. С href клетка становится ссылкой на страницу вещества,
// без href — обычной клеткой (шапка, боковик, образцы в легенде).
function cell(className, text, col, row, title, href) {
  const div = document.createElement(href ? "a" : "div");
  div.className = className;
  div.textContent = text;
  div.style.gridColumn = col;
  div.style.gridRow = row;
  if (title) div.title = title;
  if (href) div.href = href;
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
        const ascii = formulaAscii(c, a);
        const name = `${formulaText(ascii)} — ${legendOf(legend, v)}`;
        table.appendChild(
          cell("sol-cell " + CLASS[v], v, j + 2, row, name, slug(ascii) + ".html")
        );
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
