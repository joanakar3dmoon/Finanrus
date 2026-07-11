const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============ 🔑 APIs — SOLO variables de entorno ============
// Configura estas vars en Railway/Render:
// GITHUB_TOKEN, OPENROUTER_KEY, GEMINI_KEY, PAYPAL_SECRET
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const OPENROUTER_KEY = process.env.OPENROUTER_KEY || '';
const GEMINI_KEY = process.env.GEMINI_KEY || '';

const GITHUB_MODELS_URL = 'https://models.github.ai/inference';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

// ============ PAYPAL (Producción) ============
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'BAAMzxgBPbp7RG7SlZEOoz1-Wku9akVCrEH6kcwGLhKqpC-VHtcc_IRYBtJF4znmTg80iJIwWul7WDCp4o';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || '';
const PAYPAL_PLAN_ID = process.env.PAYPAL_PLAN_ID || 'P-03S27782GG6134443NJJIKKA';
const PAYPAL_API = 'https://api-m.paypal.com';

// ============ AGRENTE IA con 3 fallbacks ============
async function llamarIA(message, res) {
  const systemPrompt = 'Eres FINANRUS, un asistente financiero. Respondes breve, directo y en español.';

  // INTENTO #1: GitHub Models (gratis, GPT-4.1)
  try {
    const r1 = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        max_tokens: 500,
      }),
    });
    if (r1.ok) {
      const d1 = await r1.json();
      return res.json({ reply: d1.choices?.[0]?.message?.content || 'OK', source: 'github' });
    }
    console.log('GitHub falló, probando OpenRouter...');
  } catch (e) { console.log('GitHub error:', e.message); }

  // INTENTO #2: OpenRouter (gratis, 200 req/día)
  try {
    const r2 = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://finanrus-backend.up.railway.app',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        max_tokens: 500,
      }),
    });
    if (r2.ok) {
      const d2 = await r2.json();
      return res.json({ reply: d2.choices?.[0]?.message?.content || 'OK', source: 'openrouter' });
    }
    console.log('OpenRouter falló, probando Gemini...');
  } catch (e) { console.log('OpenRouter error:', e.message); }

  // INTENTO #3: Gemini (gratis, 60 req/min)
  try {
    const r3 = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${message}` }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
    });
    if (r3.ok) {
      const d3 = await r3.json();
      const texto = d3?.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
      return res.json({ reply: texto, source: 'gemini' });
    }
  } catch (e) { console.log('Gemini error:', e.message); }

  // TODOS fallaron
  return res.status(503).json({ error: 'Todas las APIs agotadas. Vuelve mañana.' });
}

// ============ ENDPOINT CHAT IA ============
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });
    await llamarIA(message, res);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ENDPOINT RETIRO PAYPAL ============
app.post('/api/retirar', async (req, res) => {
  try {
    const { email, monto } = req.body;
    if (!email || !monto) return res.status(400).json({ error: 'Email y monto requeridos' });

    // Obtener token de acceso PayPal
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Enviar pago PayPal
    const payoutRes = await fetch(`${PAYPAL_API}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `batch_${Date.now()}`,
          email_subject: 'Retiro FINANRUS',
          email_message: 'Has recibido un pago de FINANRUS',
        },
        items: [{
          recipient_type: 'EMAIL',
          amount: { value: monto.toString(), currency: 'EUR' },
          receiver: email,
          note: 'Retiro FINANRUS - Ingresos pasivos',
        }],
      }),
    });

    const payoutResult = await payoutRes.json();
    res.json({ success: payoutRes.ok, data: payoutResult });
  } catch (error) {
    console.error('PayPal error:', error);
    res.status(500).json({ error: 'Error procesando retiro' });
  }
});

// ============ ENDPOINT SUSCRIPCIÓN ============
app.post('/api/suscribir', async (req, res) => {
  try {
    const { subscription_id } = req.body;
    if (!subscription_id) return res.status(400).json({ error: 'subscription_id requerido' });

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const subRes = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscription_id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    const subData = await subRes.json();
    res.json({ success: subRes.ok, data: subData });
  } catch (error) {
    console.error('Suscripción error:', error);
    res.status(500).json({ error: 'Error verificando suscripción' });
  }
});

// ============ ENDPOINT SALUD ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', apis: ['github', 'openrouter', 'gemini'], paypal: 'live' });
});

app.listen(PORT, () => {
  console.log(`FINANRUS Backend v2.0 corriendo en puerto ${PORT}`);
  console.log('3 APIs IA: GitHub Models → OpenRouter → Gemini (fallback automático)');
  console.log('PayPal: LIVE (producción)');
});