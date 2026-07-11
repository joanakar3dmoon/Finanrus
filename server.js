// FINANRUS Backend - Servidor para Retiros PayPal + OpenAI
// Desplegar en Railway.app o Render.com

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ 🔑 CONFIG — APIs GRATIS ============
const CONFIG = {
  OPENAI_KEY: process.env.OPENAI_KEY || "sk-or-v1-",          // OpenRouter gratis
  OPENAI_URL: "https://openrouter.ai/api/v1",
  MODELO: "nvidia/nemotron-3-ultra-550b-a55b:free",           // 🆓 1M ctx
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || "BAAMzxgBPbp7RG7SlZEOoz1-Wku9akVCrEH6kcwGLhKqpC-VHtcc_IRYBtJF4znmTg80iJIwWul7WDCp4o",
  PAYPAL_SECRET: process.env.PAYPAL_SECRET || "EMdvKg4PZMTtLS5oqCw2QUcyXDdaoZtOdaPnkW9alwfNMHF0bjzCcBBEL-ulv3bLMDmnPwgJxOu77dS5",
  PAYPAL_EMAIL: "joanlazaro83@gmail.com",
  MIN_RETIRO: 10,
};

app.use(cors());
app.use(express.json());

// ============ HEALTH CHECK ============
app.get('/', (req, res) => {
  res.json({ status: "FINANRUS Backend activo 🟢", version: "1.0.0" });
});

// ============ AGENTE IA ============
app.post('/api/agente', async (req, res) => {
  const { mensaje, usuario } = req.body;
  try {
    const response = await axios.post(
      `${CONFIG.OPENAI_URL}/chat/completions`,
      {
        model: CONFIG.MODELO,
        messages: [
          { role: "system", content: `Eres FINANRUS, asistente financiero. Usuario: ${usuario || "anónimo"}. Responde breve y útil.` },
          { role: "user", content: mensaje }
        ]
      },
      { headers: { Authorization: `Bearer ${CONFIG.OPENAI_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://finanrus-backend.up.railway.app', 'X-Title': 'FINANRUS Backend' } }
    );
    res.json({ respuesta: response.data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Error del agente IA" });
  }
});

// ============ SOLICITAR RETIRO ============
app.post('/api/retirar', async (req, res) => {
  const { email, monto } = req.body;

  // Validaciones
  if (!email || !monto) {
    return res.status(400).json({ error: "Email y monto requeridos" });
  }
  if (monto < CONFIG.MIN_RETIRO) {
    return res.status(400).json({ error: `Mínimo retiro: ${CONFIG.MIN_RETIRO}€` });
  }

  try {
    // 1️⃣ El agente IA revisa la solicitud (KYA - Know Your Agent)
    const revision = await axios.post('http://localhost:' + PORT + '/api/agente', {
      mensaje: `Revisa esta solicitud de retiro: ${monto}€ para ${email}. ¿Es válida? Responde solo SI o NO.`,
      usuario: "sistema"
    });

    if (revision.data.respuesta?.startsWith("NO")) {
      return res.status(403).json({ error: "El agente FINANRUS rechazó la solicitud" });
    }

    // 2️⃣ Aquí iría la llamada REAL a PayPal Payouts API
    // Por ahora simulamos:
    res.json({
      success: true,
      mensaje: `✅ Retiro de ${monto}€ procesado a ${email}`,
      referencia: "PAY-" + Date.now(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: "Error procesando retiro" });
  }
});

// ============ WEBHOOK PAYPAL ============
app.post('/api/webhook/paypal', (req, res) => {
  const evento = req.body;
  console.log("📩 Evento PayPal recibido:", evento.event_type);
  // Aquí procesas pagos, suscripciones, etc.
  res.sendStatus(200);
});

// ============ INICIAR ============
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════╗
║       FINANRUS BACKEND 🟢         ║
║   Puerto: ${PORT}                       ║
║   Estado: Activo                   ║
╚═══════════════════════════════════╝
  `);
});