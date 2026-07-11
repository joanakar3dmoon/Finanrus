const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// GitHub Models API (gratis con tu token de GitHub)
const GITHUB_MODELS_URL = 'https://models.github.ai/inference';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Modelo gratis potente: GPT-4.1 (o puedes usar gpt-5, o4-mini, deepseek-r1)
// Lista completa: https://models.github.ai/models
const MODEL = 'gpt-4.1';

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'Eres FINANRUS, un asistente financiero inteligente. Ayudas a gestionar ingresos pasivos (anuncios), retiros vía PayPal y suscripciones. Respondes breve, directo y en español.',
          },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('GitHub Models error:', response.status, errText);
      return res.status(500).json({ error: 'Error del modelo IA', detail: errText });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Lo siento, no pude procesar eso.';
    res.json({ reply });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: MODEL, version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`FINANRUS Backend corriendo en puerto ${PORT}`);
  console.log(`Usando modelo: ${MODEL} (GitHub Models - GRATIS)`);
});