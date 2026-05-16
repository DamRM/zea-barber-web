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

let reserva = { barbero: "ZEA", servicio: "", precio: 0, fecha: "", hora: "" };
let urlWhatsAppFinal = ""; 

// 1. BLOQUEO DE FECHAS PASADAS (Visualmente en el calendario)
window.onload = function() {
    const hoy = new Date().toLocaleDateString('en-CA', {timeZone: 'America/Lima'});
    const inputFecha = document.getElementById('reserva-fecha');
    if(inputFecha) {
        inputFecha.setAttribute('min', hoy);
    }
};

function irA(id) {
    const el = document.getElementById(id);
    if (el) {
        setTimeout(() => {
            const yOffset = -110; 
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
        }, 150);
    }
}

function toggleCategory(id) {
    const content = document.getElementById(id);
    const estaAbierto = content.classList.contains('show');
    document.querySelectorAll('.category-content').forEach(c => c.classList.remove('show'));
    if (!estaAbierto) content.classList.add('show');
}

function selectServicio(el, nombre, precio) {
    document.querySelectorAll('.item-card').forEach(card => card.classList.remove('active'));
    el.classList.add('active');
    
    reserva.servicio = nombre;
    reserva.precio = precio;
    document.getElementById('step-2').classList.add('section-visible');
    irA('step-2');
}

// ... (Tus config de Firebase y variables iniciales se mantienen igual)

async function cargarHorarios() {
    const fechaSel = document.getElementById('reserva-fecha').value;
    const grid = document.getElementById('grid-horas');
    
    if (!fechaSel) return;
    reserva.fecha = fechaSel;

    grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Cargando horarios...</p>";

    try {
        const fechaObj = new Date(fechaSel + 'T00:00:00');
        const diaSemana = fechaObj.getDay(); 

        const snapshot = await db.collection("citas")
            .where("fecha", "==", fechaSel)
            .get();

        // IMPORTANTE: Asegúrate que en Firebase las horas guardadas también tengan el formato "HH:MM AM/PM"
        const horasOcupadas = snapshot.docs.map(doc => doc.data().hora);
        let html = "";

        // Bucle de 9 AM a 10 PM (22:00)
        for (let i = 9; i <= 22; i++) {
            
            // Lógica AM/PM
            let periodo = i >= 12 ? 'PM' : 'AM';
            let hora12 = i % 12;
            if (hora12 === 0) hora12 = 12;
            const horaFormateada = `${hora12 < 10 ? '0' + hora12 : hora12}:00 ${periodo}`;
            
            let visible = true;

            // --- REGLAS DE HORARIO ---
            if (i === 14) { visible = false; } // Almuerzo
            else if (diaSemana === 6) { visible = true; } // Sábado todo el día
            else if (diaSemana === 3) { if (i < 10 || i > 13) visible = false; } // Miércoles
            else if (diaSemana === 0) { if (i < 10 || i > 18) visible = false; } // Domingo
            else { if (i < 10 || i > 22) visible = false; } // L-V

            if (visible) {
                const estaOcupada = horasOcupadas.includes(horaFormateada);
                // AQUÍ ESTABA EL ERROR: Aseguramos que pase 'horaFormateada' con comillas
                html += `
                    <button 
                        class="hora-btn ${estaOcupada ? 'ocupado' : ''}" 
                        onclick="${estaOcupada ? '' : `seleccionarHora('${horaFormateada}', this)`}"
                        ${estaOcupada ? 'disabled' : ''}>
                        ${horaFormateada}
                    </button>
                `;
            }
        }

        grid.innerHTML = html;
    } catch (e) {
        console.error("Error en Firebase:", e);
        grid.innerHTML = "Error al cargar horarios.";
    }
}

// ESTA FUNCIÓN ES LA QUE ACTIVA EL PASO 3
function seleccionarHora(hora, btn) {
    reserva.hora = hora; // Guarda "09:00 AM" por ejemplo
    
    // Quitar selección previa
    document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('selected'));
    
    // Marcar el actual
    btn.classList.add('selected');

    // MOSTRAR PASO 3 (Tus datos)
    const step3 = document.getElementById('step-3');
    if (step3) {
        step3.classList.remove('hidden');
        irA('step-3');
    }
}

// ... (El resto de tus funciones guardarCita e irA se mantienen igual)

async function guardarCita() {
    const nombre = document.getElementById('nombre-cliente').value.trim();
    const tel = document.getElementById('tel-cliente').value.trim();
    const phoneRegex = /^[0-9]{9}$/; 

    if (!nombre) return alert("⚠️ Ingresa tu nombre.");
    if (!phoneRegex.test(tel)) return alert("⚠️ El WhatsApp debe tener 9 números.");
    if (!reserva.hora) return alert("⚠️ Selecciona una hora.");

    try {
        const snapHistorial = await db.collection("citas")
            .where("whatsapp", "==", tel)
            .where("estado", "==", "ATENDIDO")
            .get();
        
        const pos = (snapHistorial.size % 20) + 1;
        const faltan = 5 - (pos % 5 === 0 ? 5 : pos % 5);
        let promoTexto = (pos % 5 === 0) ? "¡Nivel premio alcanzado! 🏆" : `Faltan ${faltan} para tu próximo premio`;

        await db.collection("citas").add({
            ...reserva,
            cliente: nombre,
            whatsapp: tel,
            estado: "PENDIENTE",
            posicionCiclo: pos,
            fechaRegistro: new Date().toLocaleString("es-PE", {timeZone: "America/Lima"})
        });

        document.getElementById('modal-corte-count').innerText = `Corte #${pos}/20`;
        document.getElementById('modal-faltan-count').innerText = promoTexto;

        const textoWsp = `¡Hola Zea Barber! 💈\\nAgendé mi cita:\\n👤 Cliente: ${nombre}\\n✨ Servicio: ${reserva.servicio}\\n📅 Fecha: ${reserva.fecha}\\n⏰ Hora: ${reserva.hora}\\n\\n🏆 Estado: Corte #${pos}/20\\n🎁 ${promoTexto}`;
        urlWhatsAppFinal = `https://wa.me/51934538800?text=${encodeURIComponent(textoWsp)}`;

        document.getElementById('custom-modal').style.display = 'flex';

    } catch (e) {
        console.error(e);
        alert("Error al agendar.");
    }
}

function cerrarYRedirigir() {
    window.open(urlWhatsAppFinal, '_blank');
    location.reload(); 
}
