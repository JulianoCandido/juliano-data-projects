require('dotenv').config();
console.log("Chave carregada? ", !!process.env.ANTHROPIC_API_KEY);
console.log("Tamanho da chave:", process.env.ANTHROPIC_API_KEY?.length);
console.log("Primeiros caracteres:", process.env.ANTHROPIC_API_KEY?.slice(0, 15));
const express = require('express');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('.')); // serve o index.html, app.js, etc direto da pasta

app.post('/api/ask', async (req, res) => {
  const { question } = req.body;

  const system = `Você converte perguntas em português sobre vendas para SQL (dialeto SQLite).

Esquema da tabela "vendas":
- mes TEXT (ex: "Jan", "Fev", ... "Dez")
- canal TEXT (Varejo, Distribuidor, E-commerce, Exportação)
- regiao TEXT (Sul, Sudeste, Nordeste, Centro-Oeste)
- produto TEXT (Linha A, Linha B, Linha C)
- receita REAL
- custo REAL
- margem REAL

Responda APENAS com um objeto JSON válido, sem markdown, sem crases, sem texto antes ou depois, no formato exato:
{"sql": "consulta SELECT válida em SQLite", "chart_type": "bar" ou "line" ou "pie", "x_field": "nome da coluna ou alias para o eixo X", "y_field": "nome da coluna ou alias numérico para o eixo Y", "explicacao": "1-2 frases em português explicando o resultado"}

Regras:
- Apenas consultas SELECT.
- Use aliases simples nas colunas agregadas (ex: SUM(margem) AS margem_total) e garanta que x_field/y_field usem esses aliases.
- Escolha "line" para evolução ao longo do tempo (mes), "pie" para proporção de poucas categorias, "bar" para comparação entre categorias no geral.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system,
        messages: [{ role: 'user', content: question }]
      })
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao consultar a API da Anthropic' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});