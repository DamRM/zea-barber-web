// admin-logic.js - Mantiene todas tus funciones originales + el botón de aviso
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

// FUNCION ORIGINAL INTACTA
function validarAcceso() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "123") {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        const hoy = new Date().toLocaleDateString('en-CA', {timeZone: 'America/Lima'});
        document.getElementById('filtro-admin').value = hoy;
        verCitas();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

// FUNCION ORIGINAL INTACTA
function cambiarTab(modo) {
    vistaActual = modo;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${modo}`).classList.add('active');
    verCitas();
}

// FUNCION ACTUALIZADA (Solo añadí el botón de aviso, no borré nada)
async function verCitas() {
    const contenedor = document.getElementById('lista-citas');
    const fechaFiltro = document.getElementById('filtro-admin').value;
    if (!fechaFiltro) return;

    contenedor.innerHTML = "<p style='text-align:center;'>Cargando agenda...</p>";

    try {
        let ref = db.collection("citas");
        let inicio, fin;

        if (vistaActual === 'dia') {
            inicio = fechaFiltro;
            fin = fechaFiltro;
        } else if (vistaActual === 'semana') {
            let d = new Date(fechaFiltro + 'T00:00:00');
            let day = d.getDay();
            let diff = d.getDate() - day + (day === 0 ? -6 : 1);
            let lunes = new Date(d.setDate(diff));
            let domingo = new Date(d.setDate(diff + 6));
            inicio = lunes.toLocaleDateString('en-CA');
            fin = domingo.toLocaleDateString('en-CA');
        } else {
            let partes = fechaFiltro.split('-');
            inicio = `${partes[0]}-${partes[1]}-01`;
            fin = `${partes[0]}-${partes[1]}-31`;
        }

        const snapshot = await ref.where("fecha", ">=", inicio).where("fecha", "<=", fin).get();
        
        let citas = [];
        snapshot.forEach(doc => citas.push({ id: doc.id, ...doc.data() }));
        
        citas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

        let html = "";
        let tC = 0; 
        let tG = 0;

        if (citas.length === 0) {
            contenedor.innerHTML = "<p style='text-align:center; color:#888;'>No hay citas para este periodo.</p>";
            document.getElementById('total-cortes').innerText = "0";
            document.getElementById('total-ganancia').innerText = "S/ 0.00";
            return;
        }

        citas.forEach(c => {
            const esAtendido = c.estado === 'ATENDIDO';
            if (esAtendido) { tC++; tG += parseFloat(c.precio || 0); }

            const etiqueta = c.posicionCiclo % 5 === 0 ? "¡PREMIO!" : `Corte #${c.posicionCiclo}`;
            
            // --- NUEVO: Lógica del Aviso por WhatsApp ---
            const mensajeAviso = encodeURIComponent(`¡Hola ${c.cliente}! 💈 Te saludamos de Zea Barber. Te recordamos tu cita de hoy a las ${c.hora}. Por favor, trata de estar unos minutos antes. ¡Te esperamos!`);
            const urlWsp = `https://wa.me/51${c.whatsapp}?text=${mensajeAviso}`;
            // --------------------------------------------

            html += `
                <div class="appointment-card ${esAtendido ? 'atendido' : ''}">
                    <div class="appointment-info">
                        <div class="time-badge">
                            <div>
                                <span>${c.hora}</span>
                                <small>${c.fecha.split('-').reverse().join('/')}</small>
                            </div>
                            <a href="${urlWsp}" target="_blank" class="wsp-icon-admin" title="Avisar al cliente">
                                <i class="fab fa-whatsapp"></i>
                            </a>
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
                    <button onclick="marcarAtendido('${c.id}', '${c.estado}')" class="btn-status ${esAtendido ? 'btn-done' : 'btn-pending'}">
                        ${esAtendido ? 'ATENDIDO' : 'ATENDER'}
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

// FUNCION ORIGINAL INTACTA
async function marcarAtendido(id, est) {
    if (est === 'ATENDIDO') return;
    if (confirm("¿Marcar este servicio como completado?")) {
        try {
            await db.collection("citas").doc(id).update({ estado: 'ATENDIDO' });
            verCitas();
        } catch (e) { alert("Error al actualizar"); }
    }
}