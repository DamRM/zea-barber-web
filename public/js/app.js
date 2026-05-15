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

async function cargarHorarios() {
    const fechaInput = document.getElementById('reserva-fecha').value;
    if (!fechaInput) return;

    // 2. VALIDACIÓN DE SEGURIDAD (Por si burlan el calendario)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const partes = fechaInput.split('-');
    const fechaSeleccionada = new Date(partes[0], partes[1] - 1, partes[2]);

    if (fechaSeleccionada < hoy) {
        alert("⚠️ No puedes agendar en una fecha que ya pasó.");
        document.getElementById('reserva-fecha').value = "";
        return;
    }

    reserva.fecha = fechaInput;
    const grid = document.getElementById('grid-horas');
    grid.innerHTML = "<p>Buscando turnos...</p>";

    // Lista completa de todas las horas posibles
    const todasLasHoras = ["10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM"];
    
    // Definimos qué horas son válidas según el día
    const diaSemana = fechaSeleccionada.getDay(); // 0=Dom, 3=Mie
    let horasPermitidas = [];

    if (diaSemana === 3) { // MIÉRCOLES
        horasPermitidas = ["10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM"];
    } else if (diaSemana === 0) { // DOMINGO
        horasPermitidas = ["10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"];
    } else { // DÍAS NORMALES
        horasPermitidas = [...todasLasHoras];
    }

    try {
        const snap = await db.collection("citas").where("fecha", "==", fechaInput).get();
        const yaReservadas = snap.docs.map(doc => doc.data().hora);

        grid.innerHTML = "";
        todasLasHoras.forEach(h => {
            const btn = document.createElement('div');
            
            // LÓGICA DE NUBLADO:
            // Está ocupada si: ya la reservaron O si no está en las permitidas de ese día
            const estaFueraDeHorario = !horasPermitidas.includes(h);
            const estaReservada = yaReservadas.includes(h);
            
            btn.className = `hora-btn ${(estaFueraDeHorario || estaReservada) ? 'busy' : ''}`;
            btn.innerText = h;

            btn.onclick = () => {
                if (!btn.classList.contains('busy')) {
                    document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    reserva.hora = h;
                    document.getElementById('step-3').classList.add('section-visible');
                    irA('step-3');
                }
            };
            grid.appendChild(btn);
        });
    } catch (error) {
        console.error("Error:", error);
        grid.innerHTML = "<p>Error al cargar horarios.</p>";
    }
}

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