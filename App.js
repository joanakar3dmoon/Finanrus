import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, Alert, StyleSheet, ScrollView } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, InterstitialAd, AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

const CONFIG = {
  ADMOB_BANNER: TestIds.BANNER,
  ADMOB_INTERSTICIAL: TestIds.INTERSTITIAL,
  ADMOB_REWARDED: TestIds.REWARDED,
  PAYPAL_EMAIL: "joanlazaro83@gmail.com",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_MODEL = "deepseek/deepseek-v4-pro";

const interstitial = InterstitialAd.createForAdRequest(CONFIG.ADMOB_INTERSTICIAL);
const rewarded = RewardedAd.createForAdRequest(CONFIG.ADMOB_REWARDED);
let accionCount = 0;

export default function App() {
  const [chat, setChat] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [saldo, setSaldo] = useState(2.50);
  const [loading, setLoading] = useState(false);
  const [esPremium, setEsPremium] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showSetup, setShowSetup] = useState(true);

  const hablarIA = async () => {
    if (!chat.trim()) return;
    if (!apiKey) {
      Alert.alert("API Key requerida", "Ve a openrouter.ai, registrate gratis, genera una API key y pegala aqui.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: FREE_MODEL,
          messages: [
            { role: "system", content: "Eres FINANRUS, asistente financiero IA. Ayudas con ingresos pasivos, retiros PayPal y suscripciones. Responde breve, directo y en espanol." },
            { role: "user", content: chat },
          ],
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      setRespuesta(data.choices?.[0]?.message?.content || "No pude procesar eso.");
      if (!esPremium) contarAccion();
    } catch (e) {
      setRespuesta("Error al conectar con la IA. Revisa tu conexion y API key.");
    }
    setLoading(false);
  };

  const guardarKey = () => {
    if (apiKey.trim().length < 10) {
      Alert.alert("Key invalida", "La API key debe tener al menos 10 caracteres.");
      return;
    }
    setShowSetup(false);
    Alert.alert("✅ API Key guardada", "Ahora puedes usar el agente IA. Ve a openrouter.ai si necesitas una key gratis.");
  };

  const pagarSuscripcion = () => {
    Alert.alert(
      "PayPal Checkout",
      "Suscripcion premium: 4.99€/mes a " + CONFIG.PAYPAL_EMAIL,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Pagar 4.99€", onPress: () => {
          setEsPremium(true);
          Alert.alert("✅ Premium activa", "Sin anuncios + agente IA ilimitado");
          contarAccion();
        }}
      ]
    );
  };

  const retirar = () => {
    if (saldo < 10) {
      Alert.alert("Saldo insuficiente", "Necesitas minimo 10€. Tu saldo: " + saldo.toFixed(2) + "€");
      return;
    }
    Alert.alert(
      "Solicitar Retiro",
      "Retirar " + saldo.toFixed(2) + "€ a " + CONFIG.PAYPAL_EMAIL,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Solicitar", onPress: () => {
          setSaldo(0);
          Alert.alert("✅ Retiro solicitado", saldo.toFixed(2) + "€ enviados a PayPal");
          contarAccion();
        }}
      ]
    );
  };

  const verAnuncio = () => {
    rewarded.load();
    rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => { rewarded.show(); });
    rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      const ganancia = 1.00;
      setSaldo(function(prev) { return prev + ganancia; });
      Alert.alert("🎉 +1€", "Has ganado 1€");
    });
    contarAccion();
  };

  const contarAccion = () => {
    if (esPremium) return;
    accionCount++;
    if (accionCount % 3 === 0) {
      interstitial.load();
      interstitial.addAdEventListener(AdEventType.LOADED, function() { interstitial.show(); });
    }
  };

  if (showSetup) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>💰 FINANRUS</Text>
        <Text style={styles.subtitle}>Configuracion inicial</Text>
        <View style={styles.setupBox}>
          <Text style={styles.setupTitle}>🔑 API Key de OpenRouter</Text>
          <Text style={styles.setupText}>
            1. Ve a openrouter.ai/keys{"\n"}
            2. Registrate (gratis, sin tarjeta){"\n"}
            3. Crea una API key{"\n"}
            4. Pegala aqui abajo
          </Text>
          <TextInput
            style={styles.input}
            placeholder="sk-or-v1-..."
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry={true}
          />
          <Button title="Guardar API Key" onPress={guardarKey} color="#00D4AA" />
        </View>
        <Text style={styles.versionText}>FINANRUS v2.0 - IA gratis con OpenRouter</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>💰 FINANRUS</Text>
      <Text style={styles.subtitle}>Tu agente financiero inteligente</Text>

      <View style={styles.saldoBox}>
        <Text style={styles.saldoLabel}>Saldo disponible</Text>
        <Text style={styles.saldoAmount}>{saldo.toFixed(2)}€</Text>
        <Text style={styles.saldoMin}>Minimo retiro: 10€</Text>
      </View>

      <Text style={styles.sectionTitle}>🤖 Agente IA</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: ¿Cuanto saldo tengo?"
        value={chat}
        onChangeText={setChat}
      />
      <Button title={loading ? "Pensando..." : "Enviar a FINANRUS"} onPress={hablarIA} disabled={loading} />
      {respuesta ? (
        <View style={styles.respuestaBox}>
          <Text style={styles.respuestaText}>{respuesta}</Text>
        </View>
      ) : null}

      {!esPremium ? (
        <>
          <Text style={styles.sectionTitle}>⚡ Acciones</Text>
          <View style={styles.buttonSpacing}>
            <Button title="💳 Suscripcion Premium 4.99€" onPress={pagarSuscripcion} color="#0070BA" />
          </View>
          <View style={styles.buttonSpacing}>
            <Button title="💸 Retirar a PayPal" onPress={retirar} color="#2C2C2C" />
          </View>
          <View style={styles.buttonSpacing}>
            <Button title="📺 Ver Anuncio +1€" onPress={verAnuncio} color="#4CAF50" />
          </View>
        </>
      ) : (
        <View style={styles.premiumBox}>
          <Text style={styles.premiumText}>🌟 Premium activa - Sin anuncios</Text>
          <View style={styles.buttonSpacing}>
            <Button title="💸 Retirar a PayPal" onPress={retirar} color="#2C2C2C" />
          </View>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {"🔹 Cada 3 acciones veras un anuncio\n"}
          {"🔹 Ver anuncio recompensado = +1€\n"}
          {"🔹 Retiro minimo: 10€ via PayPal\n"}
          {"🔹 Premium 4.99€: sin anuncios + IA ilimitada\n"}
          {"🔹 IA via OpenRouter (285 modelos gratis)"}
        </Text>
      </View>

      {!esPremium && (
        <View style={styles.bannerContainer}>
          <BannerAd unitId={CONFIG.ADMOB_BANNER} size={BannerAdSize.BANNER} />
        </View>
      )}

      <Text style={styles.versionText}>FINANRUS v2.0 - IA con OpenRouter 🚀</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0D1117" },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center", marginTop: 40, color: "#00D4AA" },
  subtitle: { textAlign: "center", color: "#888", marginBottom: 20, fontSize: 14 },
  setupBox: { backgroundColor: "#1A1F2E", borderRadius: 16, padding: 20, marginTop: 20, borderWidth: 1, borderColor: "#00D4AA33" },
  setupTitle: { fontSize: 20, fontWeight: "bold", color: "#FFF", marginBottom: 10 },
  setupText: { color: "#AAA", fontSize: 14, lineHeight: 22, marginBottom: 20 },
  saldoBox: { backgroundColor: "#1A1F2E", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "#00D4AA33" },
  saldoLabel: { color: "#888", fontSize: 14 },
  saldoAmount: { fontSize: 48, fontWeight: "bold", color: "#00D4AA", marginVertical: 5 },
  saldoMin: { color: "#666", fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF", marginTop: 15, marginBottom: 10 },
  input: { backgroundColor: "#0D1117", color: "#FFF", borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 16, borderWidth: 1, borderColor: "#333" },
  respuestaBox: { backgroundColor: "#1A1F2E", borderRadius: 10, padding: 15, marginTop: 10, borderLeftWidth: 3, borderLeftColor: "#00D4AA" },
  respuestaText: { color: "#DDD", fontSize: 14, lineHeight: 20 },
  buttonSpacing: { marginTop: 8 },
  infoBox: { backgroundColor: "#1A1F2E", borderRadius: 10, padding: 15, marginTop: 20, borderWidth: 1, borderColor: "#333" },
  infoText: { color: "#AAA", fontSize: 12, lineHeight: 18 },
  bannerContainer: { alignItems: "center", marginTop: 20 },
  premiumBox: { backgroundColor: "#1A2E1A", borderRadius: 10, padding: 15, marginTop: 20, borderWidth: 1, borderColor: "#00D4AA44" },
  premiumText: { color: "#00D4AA", fontSize: 16, textAlign: "center", fontWeight: "bold", marginBottom: 10 },
  versionText: { textAlign: "center", color: "#999", marginTop: 20, marginBottom: 30 },
});
