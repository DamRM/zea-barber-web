const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const jwt = require('jsonwebtoken');
const serviceAccount = require('./service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

const ISSUER_ID = '3388000000023219132';
const CLASS_ID = `${ISSUER_ID}.ZEA_BARBER_LOYALTY`;

async function generarTarjetaReal(numeroWhatsapp) {
  try {
    console.log(`\n🔍 Buscando al cliente con WhatsApp: ${numeroWhatsapp} en Firebase...`);

    const citasRef = db.collection('citas');
    const snapshot = await citasRef.where('whatsapp', '==', numeroWhatsapp).get();

    if (snapshot.empty) {
      console.log('❌ No se encontró ninguna cita para ese número.');
      return;
    }

    let clienteReal = { nombre: '', posicionCiclo: 0 };
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.posicionCiclo >= clienteReal.posicionCiclo) {
        clienteReal.nombre = data.cliente;
        clienteReal.posicionCiclo = data.posicionCiclo;
      }
    });

    console.log(`✅ ¡Cliente encontrado! Nombre: ${clienteReal.nombre} | Cortes actuales: ${clienteReal.posicionCiclo}`);

    // Lógica de tramos y premios
    const totalCortesOriginal = clienteReal.posicionCiclo;
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

    // Estructura del pase SIN código QR (más limpio para el cliente)
    const loyaltyObject = {
      id: `${ISSUER_ID}.${numeroWhatsapp}_${Date.now()}`,
      classId: CLASS_ID,
      state: 'ACTIVE',
      accountName: clienteReal.nombre,
      accountId: numeroWhatsapp,
      loyaltyPoints: {
        label: textoLabel,
        balance: {
          int: corteActualCiclo 
        }
      }
      // Se eliminó la sección de 'barcode' para quitar el QR visualmente
    };

    const claims = {
      iss: serviceAccount.client_email,
      aud: 'google',
      origins: ['http://localhost', 'https://zea-barber.web.app'],
      typ: 'savetowallet',
      payload: { loyaltyObjects: [loyaltyObject] }
    };

    const token = jwt.sign(claims, serviceAccount.private_key, { algorithm: 'RS256' });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    console.log('\n======================================================');
    console.log('💳 ENLACE DE GOOGLE WALLET (SIN QR):');
    console.log('======================================================\n');
    console.log(saveUrl);
    console.log('\n======================================================');

  } catch (error) {
    console.error('Error:', error);
  }
}

generarTarjetaReal('989763565');