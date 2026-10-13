const firebaseConfig = {
    apiKey: "AIzaSyDGJyvvFffon_e50oTPi1l2WII4YhBerR0",
    authDomain: "zea-barber.firebaseapp.com",
    projectId: "zea-barber",
    storageBucket: "zea-barber.firebasestorage.app",
    messagingSenderId: "401527849412",
    appId: "1:401527849412:web:602e3b9d80a33c11f2a491",
    measurementId: "G-BD4T4WY9X4"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

async function procesarTarjeta() {
    const nombre = document.getElementById('w-nombre').value.trim();
    const whatsapp = document.getElementById('w-whatsapp').value.trim();
    const cumple = document.getElementById('w-cumple').value;
    const btn = document.getElementById('btn-generar');
    const loading = document.getElementById('loading-msg');

    if (!nombre || !whatsapp || !cumple) {
        alert("Por favor, completa todos los campos (Nombre, WhatsApp y Cumpleaños).");
        return;
    }
    
    if (whatsapp.length !== 9 || isNaN(whatsapp)) {
        alert("Ingresa un número de WhatsApp válido de 9 dígitos.");
        return;
    }

    btn.disabled = true;
    btn.style.opacity = "0.5";
    loading.style.display = "block";

    try {
        // 1. Guardar o actualizar los datos del cliente (incluyendo cumpleaños) en la colección "clientes"
        await db.collection("clientes").doc(whatsapp).set({
            nombre: nombre,
            whatsapp: whatsapp,
            cumpleanos: cumple,
            ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 2. Buscar en el historial de citas sus cortes acumulados
        let maxPos = 0;
        const historial = await db.collection("citas").where("whatsapp", "==", whatsapp).get();
        
        if (!historial.empty) {
            historial.forEach(doc => {
                let p = doc.data().posicionCiclo || 0;
                if (p > maxPos) maxPos = p;
            });
        }
        
        let sellosActuales = maxPos;
        while (sellosActuales > 20) { 
            sellosActuales -= 20; 
        }

        console.log(`Cliente registrado/actualizado: ${nombre} | Cortes: ${sellosActuales} | Cumple: ${cumple}`);

        setTimeout(() => {
            alert(`¡Registro exitoso, ${nombre}!\n\nTus datos y tu fecha de cumpleaños han sido guardados.\nProgreso actual: ${sellosActuales} cortes.`);
            btn.disabled = false;
            btn.style.opacity = "1";
            loading.style.display = "none";
        }, 1200);

    } catch (error) {
        console.error("Error al procesar tarjeta:", error);
        alert("Hubo un error al conectar con la base de datos.");
        btn.disabled = false;
        btn.style.opacity = "1";
        loading.style.display = "none";
    }
}