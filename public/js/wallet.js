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
        // Llamada a tu backend en Render para guardar en Firestore y generar el enlace de Google Wallet
        const response = await fetch("https://zea-barber-web.onrender.com/api/generar-pase", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre: nombre,
                whatsapp: whatsapp,
                cumpleanos: cumple
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "No se pudo generar el pase.");
        }

        console.log("Pase generado con éxito:", data.urlWallet);

        setTimeout(() => {
            alert(`¡Registro exitoso, ${nombre}!\n\nTu tarjeta VIP está lista para agregar a Google Wallet.`);
            
            // Redirigir automáticamente al enlace oficial de Google Wallet
            window.location.href = data.urlWallet;

            btn.disabled = false;
            btn.style.opacity = "1";
            loading.style.display = "none";
        }, 1200);

    } catch (error) {
        console.error("Error al procesar tarjeta:", error);
        alert("Hubo un error al generar tu pase digital. Inténtalo de nuevo.");
        btn.disabled = false;
        btn.style.opacity = "1";
        loading.style.display = "none";
    }
}