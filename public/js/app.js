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
    // Cambia 'selected' por 'active'
    document.querySelectorAll('.item-card').forEach(card => card.classList.remove('active'));
    el.classList.add('active');
    
    reserva.servicio = nombre;
    reserva.precio = precio;
    document.getElementById('step-2').classList.add('section-visible');
    irA('step-2');
}

async function cargarHorarios() {
    const fecha = document.getElementById('reserva-fecha').value;
    if (!fecha) return;
    reserva.fecha = fecha;
    
    const grid = document.getElementById('grid-horas');
    grid.innerHTML = "<p>Buscando turnos...</p>";

    const snap = await db.collection("citas").where("fecha", "==", fecha).get();
    const ocupadas = snap.docs.map(doc => doc.data().hora);

    // HORARIOS ORIGINALES (Duración aprox 1h por turno)
    const horas = [
        "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", 
        "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", 
        "07:00 PM", "08:00 PM", "09:00 PM"
    ];
    
    grid.innerHTML = "";
    horas.forEach(h => {
        const btn = document.createElement('div');
        btn.className = `hora-btn ${ocupadas.includes(h) ? 'busy' : ''}`;
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
}

async function guardarCita() {
    const nombre = document.getElementById('nombre-cliente').value.trim();
    const tel = document.getElementById('tel-cliente').value.trim();
    const phoneRegex = /^[0-9]{9}$/; 

    if (!nombre) return alert("⚠️ Ingresa tu nombre.");
    if (!phoneRegex.test(tel)) return alert("⚠️ El WhatsApp debe tener 9 números.");
    if (!reserva.hora) return alert("⚠️ Selecciona una hora.");

    try {
        const snapH = await db.collection("citas")
            .where("whatsapp", "==", tel)
            .where("estado", "==", "ATENDIDO")
            .get();
        
        const pos = (snapH.size % 20) + 1;
        const faltan = 5 - (pos % 5 === 0 ? 5 : pos % 5);
        
        // Lógica para el texto de la promoción
        let promoTexto = "";
        if (pos % 5 === 0) {
            promoTexto = "¡Nivel premio alcanzado! 🏆";
        } else {
            promoTexto = `Faltan ${faltan} para tu próximo premio`;
        }

        await db.collection("citas").add({
            ...reserva,
            cliente: nombre,
            whatsapp: tel,
            estado: "PENDIENTE",
            posicionCiclo: pos,
            fechaRegistro: new Date().toLocaleString("es-PE", {timeZone: "America/Lima"})
        });

        // Actualizar el Modal visual
        document.getElementById('modal-corte-count').innerText = `Corte #${pos}/20`;
        document.getElementById('modal-faltan-count').innerText = promoTexto;

        // MENSAJE DE WHATSAPP CORREGIDO (Incluye la línea de cortes faltantes)
        const textoWsp = `¡Hola Zea Barber! 💈\nAgendé mi cita:\n👤 Cliente: ${nombre}\n✨ Servicio: ${reserva.servicio}\n📅 Fecha: ${reserva.fecha}\n⏰ Hora: ${reserva.hora}\n\n🏆 Estado: Corte #${pos}/20\n🎁 ${promoTexto}`;
        
        urlWhatsAppFinal = `https://wa.me/51934538800?text=${encodeURIComponent(textoWsp)}`;

        document.getElementById('custom-modal').style.display = 'flex';
    } catch (e) {
        alert("Error al agendar.");
    }
}

function cerrarYRedirigir() {
    window.open(urlWhatsAppFinal, '_blank');
    location.reload(); 
}