const CANAIS = ['Varejo', 'Distribuidor', 'E-commerce', 'Exportação'];
const REGIOES = ['Sul', 'Sudeste', 'Nordeste', 'Centro-Oeste'];
const PRODUTOS = ['Linha A', 'Linha B', 'Linha C'];
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function buildSyntheticData() {
  const rows = [];
  let id = 1;

  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const mes = MESES[mIdx];

    CANAIS.forEach(canal => {
      REGIOES.forEach(regiao => {
        PRODUTOS.forEach(produto => {
          const receita = Math.round(10000 + Math.random() * 20000);
          const margemPct = 0.15 + Math.random() * 0.25;
          const margem = Math.round(receita * margemPct);
          const custo = receita - margem;

          rows.push({ id: id++, mes, canal, regiao, produto, receita, custo, margem });
        });
      });
    });
  }

  return rows;
}

const dados = buildSyntheticData();

let db;

async function initDb() {
  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  db = new SQL.Database();

  db.run(`
    CREATE TABLE vendas (
      id INTEGER PRIMARY KEY,
      mes TEXT,
      canal TEXT,
      regiao TEXT,
      produto TEXT,
      receita REAL,
      custo REAL,
      margem REAL
    );
  `);

  const stmt = db.prepare(`INSERT INTO vendas VALUES (?,?,?,?,?,?,?,?)`);
  dados.forEach(r => {
    stmt.run([r.id, r.mes, r.canal, r.regiao, r.produto, r.receita, r.custo, r.margem]);
  });
  stmt.free();

  console.log("Banco criado! Total de linhas:", dados.length);

  const teste = db.exec(`
    SELECT canal, SUM(margem) AS margem_total
    FROM vendas
    GROUP BY canal
    ORDER BY margem_total DESC
  `);
  console.log("Teste de consulta:", teste);
}

initDb();

async function askClaude(question) {
  const resp = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });

  const data = await resp.json();
  console.log("Resposta bruta do servidor:", data);

  const textBlock = data.content.find(c => c.type === "text");
  const clean = textBlock.text.trim();
  const parsed = JSON.parse(clean);

  return parsed;
}

function renderTable(columns, values) {
  let html = '<table border="1" cellpadding="6" style="border-collapse: collapse;">';

  html += '<tr>';
  columns.forEach(col => {
    html += `<th>${col}</th>`;
  });
  html += '</tr>';

  values.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += '</tr>';
  });

  html += '</table>';

  document.getElementById('resultArea').innerHTML = html;
}

let chartInstance;

function renderChart(columns, values, xField, yField, chartType) {
  const xIdx = columns.findIndex(c => c.toLowerCase() === String(xField).toLowerCase());
  const yIdx = columns.findIndex(c => c.toLowerCase() === String(yField).toLowerCase());

  const safeX = xIdx >= 0 ? xIdx : 0;
  const safeY = yIdx >= 0 ? yIdx : (columns.length > 1 ? 1 : 0);

  const labels = values.map(row => String(row[safeX]));
  const data = values.map(row => Number(row[safeY]) || 0);

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = document.getElementById('chart').getContext('2d');

  chartInstance = new Chart(ctx, {
    type: chartType === 'pie' ? 'pie' : (chartType === 'line' ? 'line' : 'bar'),
    data: {
      labels: labels,
      datasets: [{
        label: yField,
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    }
  });
}

document.getElementById('askBtn').addEventListener('click', async () => {
  const question = document.getElementById('question').value.trim();
  if (!question) return;

  const sqlOutput = document.getElementById('sqlOutput');
  const resultArea = document.getElementById('resultArea');

  sqlOutput.textContent = "Pensando...";
  resultArea.innerHTML = "";

  try {
    const parsed = await askClaude(question);
    sqlOutput.textContent = parsed.sql;

    const execResult = db.exec(parsed.sql);

    if (!execResult || execResult.length === 0) {
      resultArea.textContent = "A consulta rodou, mas não retornou linhas.";
      return;
    }

    const { columns, values } = execResult[0];
    renderTable(columns, values);
    renderChart(columns, values, parsed.x_field, parsed.y_field, parsed.chart_type);

  } catch (err) {
    console.error(err);
    sqlOutput.textContent = "Erro: " + err.message;
  }
});