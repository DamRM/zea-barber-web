// admin-logic.js - Lógica Corregida para Zea Barber
const firebaseConfig = {
  apiKey: "AIzaSyDGJyvvFffon_e50oTPi1l2WII4YhBerR0",
  authDomain: "zea-barber.firebaseapp.com",
  projectId: "zea-barber",
  storageBucket: "zea-barber.firebasestorage.app",
  messagingSenderId: "401527849412",
  appId: "1:401527849412:web:602e3b9d80a33c11f2a491",
  measurementId: "G-BD4T4WY9X4"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let vistaActual = 'dia';

function validarAcceso() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "123") {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        // Fecha actual en formato local Perú
        const hoy = new Date().toLocaleDateString('en-CA', {timeZone: 'America/Lima'});
        document.getElementById('filtro-admin').value = hoy;
        verCitas();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function cambiarTab(tipo) {
    vistaActual = tipo;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tipo}`).classList.add('active');
    verCitas();
}

async function verCitas() {
    const filtro = document.getElementById('filtro-admin').value;
    const contenedor = document.getElementById('lista-citas');
    if (!filtro) return;

    contenedor.innerHTML = "<p style='text-align:center; color: var(--primary);'>Cargando...</p>";

    try {
        let ref = db.collection("citas");
        
        if (vistaActual === 'dia') {
            ref = ref.where("fecha", "==", filtro);
        } else if (vistaActual === 'semana') {
            const f = new Date(filtro + "T00:00:00");
            const primero = f.getDate() - f.getDay() + 1; 
            const inicio = new Date(f.setDate(primero)).toISOString().split('T')[0];
            const fin = new Date(f.setDate(f.getDate() + 6)).toISOString().split('T')[0];
            ref = ref.where("fecha", ">=", inicio).where("fecha", "<=", fin);
        } else if (vistaActual === 'mes') {
            const inicio = filtro.substring(0, 7) + "-01";
            const fin = filtro.substring(0, 7) + "-31";
            ref = ref.where("fecha", ">=", inicio).where("fecha", "<=", fin);
        }

        const snap = await ref.orderBy("fecha", "asc").orderBy("hora", "asc").get();
        
        let html = "";
        let tC = 0; // Solo cortes LISTOS
        let tG = 0; // Solo soles de LISTOS

        if (snap.empty) {
            contenedor.innerHTML = "<p style='text-align:center; color:#888;'>Sin citas programadas.</p>";
            document.getElementById('total-cortes').innerText = "0";
            document.getElementById('total-ganancia').innerText = "S/ 0.00";
            return;
        }

        snap.forEach(doc => {
            const c = doc.data();
            const esAtendido = c.estado === 'ATENDIDO';

            // LÓGICA DE CONTEO: Solo si ya fue atendido
            if (esAtendido) {
                tC++;
                tG += parseFloat(c.precio || 0);
            }

            const etiqueta = (c.posicionCiclo % 5 === 0) ? "¡PREMIO!" : `Corte #${c.posicionCiclo}`;
            const infoFecha = vistaActual !== 'dia' ? `<span style="font-size:12px; color:#c5a059; display:block;">${c.fecha}</span>` : '';

            // Aplicamos la clase "atendido" si el estado es ATENDIDO
            html += `
                <div class="appointment-card ${esAtendido ? 'atendido' : ''}">
                    <div class="info">
                        <div class="time-badge">
                            <i class="far fa-clock"></i> 
                            <div>${c.hora}${infoFecha}</div>
                        </div>
                        <div class="client-name">${c.cliente}</div>
                        <div class="service-details">
                            <strong style="color: var(--primary);">BARBERO: ${c.barbero || 'ZEA'}</strong><br>
                            ${c.servicio} • S/ ${c.precio}
                        </div>
                        <div class="promo-tag ${c.posicionCiclo % 5 === 0 ? 'tag-promo' : 'tag-normal'}">
                            ${etiqueta}
                        </div>
                    </div>
                    <button onclick="marcarAtendido('${doc.id}', '${c.estado}')" class="btn-status ${esAtendido ? 'btn-done' : 'btn-pending'}">
                        ${esAtendido ? 'LISTO' : 'ATENDER'}
                    </button>
                </div>
            `;
        });

        contenedor.innerHTML = html;
        document.getElementById('total-cortes').innerText = tC;
        document.getElementById('total-ganancia').innerText = `S/ ${tG.toFixed(2)}`;

    } catch (e) { 
        console.error(e); 
        contenedor.innerHTML = "<p style='color:red; text-align:center;'>Error de conexión.</p>";
    }
}

async function marcarAtendido(id, est) {
    if (est === 'ATENDIDO') return;
    if (confirm("¿Marcar este servicio como completado?")) {
        try {
            await db.collection("citas").doc(id).update({ estado: 'ATENDIDO' });
            verCitas();
        } catch (e) { 
            alert("Error al actualizar");
        }
    }
}