const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./service-account.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

const ISSUER_ID = "3388000000023219132";
const CLASS_ID = `${ISSUER_ID}.ZEA_BARBER_LOYALTY`;

app.post("/api/generar-pase", async (req, res) => {
  try {
    const { nombre, whatsapp, cumpleanos } = req.body;
    if (!nombre || !whatsapp || !cumpleanos) {
      return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    await db.collection("clientes").doc(whatsapp).set({
      nombre, whatsapp, cumpleanos,
      ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    let maxPos = 0;
    const historial = await db.collection("citas").where("whatsapp", "==", whatsapp).get();
    if (!historial.empty) {
      historial.forEach((doc) => {
        let p = doc.data().posicionCiclo || 0;
        if (p > maxPos) maxPos = p;
      });
    }

    const totalCortesOriginal = maxPos === 0 ? 1 : maxPos;
    const corteActualCiclo = totalCortesOriginal % 20 === 0 ? 20 : totalCortesOriginal % 20;

    let siguienteMeta = 5;
    let nombrePremio = "25% Desc. (Corte 5)";
    if (corteActualCiclo <= 5) {
      siguienteMeta = 5;
      nombrePremio = "25% Desc. (Corte 5)";
    } else if (corteActualCiclo <= 10) {
      siguienteMeta = 10;
      nombrePremio = "50% Desc. (Corte 10)";
    } else if (corteActualCiclo <= 15) {
      siguienteMeta = 15;
      nombrePremio = "50% Desc. (Corte 15)";
    } else {
      siguienteMeta = 20;
      nombrePremio = "Sorteo Exclusivo (Corte 20)";
    }

    const cortesFaltantes = siguienteMeta - corteActualCiclo;
    const textoLabel = cortesFaltantes > 0
      ? `Faltan ${cortesFaltantes} cortes para ${nombrePremio}`
      : `¡Premio desbloqueado! Reclámalo en local 🎉`;

    const loyaltyObject = {
      id: `${ISSUER_ID}.${whatsapp}_${Date.now()}`,
      classId: CLASS_ID,
      state: "ACTIVE",
      accountName: nombre,
      accountId: whatsapp,
      loyaltyPoints: {
        label: textoLabel,
        balance: { int: corteActualCiclo },
      },
    };

    const claims = {
      iss: serviceAccount.client_email,
      aud: "google",
      origins: ["https://zea-barber.web.app", "http://localhost"],
      typ: "savetowallet",
      payload: { loyaltyObjects: [loyaltyObject] },
    };

    const token = jwt.sign(claims, serviceAccount.private_key, { algorithm: "RS256" });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    return res.status(200).json({ success: true, urlWallet: saveUrl });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error interno al generar el pase." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));