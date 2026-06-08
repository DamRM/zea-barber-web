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

// HORARIOS DINÁMICOS AL CAMBIAR DE SERVICIO
function selectServicio(el, nombre, precio) {
    document.querySelectorAll('.item-card').forEach(card => card.classList.remove('active'));
    el.classList.add('active');
    
    reserva.servicio = nombre;
    reserva.precio = precio;
    
    const fechaSel = document.getElementById('reserva-fecha')?.value;
    if (fechaSel) {
        cargarHorarios();
    }

    document.getElementById('step-2').classList.add('section-visible');
    irA('step-2');
}

// FUNCIÓN AUXILIAR PARA FORMATEAR HORAS EN LOS BUCLES
function obtenerHoraFormateada(iterador) {
    let periodo = iterador >= 12 ? 'PM' : 'AM';
    let hora12 = iterador % 12;
    if (hora12 === 0) hora12 = 12;
    return `${hora12 < 10 ? '0' + hora12 : hora12}:00 ${periodo}`;
}

async function cargarHorarios() {
    const fechaSel = document.getElementById('reserva-fecha').value;
    const grid = document.getElementById('grid-horas');
    
    if (!fechaSel) return;

    // 🔒 CANDADO DE SEGURIDAD CRÍTICO: Evita cargar u otorgar horas de días pasados
    const hoyLima = new Date().toLocaleDateString('en-CA', {timeZone: 'America/Lima'});
    if (fechaSel < hoyLima) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:#ff4d4d; font-weight:600;'>No puedes seleccionar una fecha pasada.</p>";
        reserva.fecha = "";
        return;
    }

    reserva.fecha = fechaSel;
    grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Cargando horarios...</p>";

    try {
        const fechaObj = new Date(fechaSel + 'T00:00:00');
        const diaSemana = fechaObj.getDay(); 

        const snapshot = await db.collection("citas")
            .where("fecha", "==", fechaSel)
            .get();
        
        const horasOcupadas = snapshot.docs.map(doc => doc.data().hora);
        
        snapshot.docs.forEach(doc => {
            const datos = doc.data();
            let [hStr, pStr] = datos.hora.split(' ');
            let hNum = parseInt(hStr.split(':')[0]);
            if (pStr === 'PM' && hNum !== 12) hNum += 12;
            if (pStr === 'AM' && hNum === 12) hNum = 0;

            const servicioGuardado = datos.servicio ? datos.servicio.trim().toUpperCase() : "";

            if (servicioGuardado === "2 CORTES A DOMICILIO" || servicioGuardado === "PLATINADO") {
                const horaSig1 = obtenerHoraFormateada(hNum + 1);
                if (!horasOcupadas.includes(horaSig1)) horasOcupadas.push(horaSig1);
                
                const horaSig2 = obtenerHoraFormateada(hNum + 2);
                if (!horasOcupadas.includes(horaSig2)) horasOcupadas.push(horaSig2);
            }
            else if (servicioGuardado === "ZEA SELECT" || servicioGuardado === "PRESTIGE GROOMING" || 
                     servicioGuardado === "ESSENTIAL GROOMING" || servicioGuardado === "LUXURY GROOMING EXPERIENCE" ||
                     servicioGuardado === "ONDULACIONES") {
                const horaSig1 = obtenerHoraFormateada(hNum + 1);
                if (!horasOcupadas.includes(horaSig1)) horasOcupadas.push(horaSig1);
            }
        });

        let html = "";

        // Bucle corre estrictamente de 9 AM hasta las 9 PM (21:00)
        for (let i = 9; i <= 21; i++) {
            const horaFormateada = obtenerHoraFormateada(i);
            let visible = true;

            if (i === 14) { visible = false; } 
            else if (diaSemana === 6) { visible = true; } 
            else if (diaSemana === 3) { if (i < 10 || i > 13) visible = false; } 
            else if (diaSemana === 0) { if (i < 10 || i > 18) visible = false; } 
            else { if (i < 10 || i > 21) visible = false; } // Tope de días regulares a 21 (9 PM)

            if (visible) {
                let estaOcupada = horasOcupadas.includes(horaFormateada);
                
                if (!estaOcupada) {
                    const servicioActual = reserva.servicio ? reserva.servicio.trim().toUpperCase() : "";

                    if (servicioActual === "2 CORTES A DOMICILIO" || servicioActual === "PLATINADO") {
                        const horaSiguiente1 = obtenerHoraFormateada(i + 1);
                        const horaSiguiente2 = obtenerHoraFormateada(i + 2);
                        
                        // Si cierra a las 21:00, no se puede pedir este servicio a las 20:00 (i=20) ni 21:00 (i=21)
                        if (i === 12 || i === 13 || i === 20 || i === 21 || 
                            horasOcupadas.includes(horaSiguiente1) || 
                            horasOcupadas.includes(horaSiguiente2)) {
                            estaOcupada = true; 
                        }
                    }
                    else if (servicioActual === "ZEA SELECT" || servicioActual === "PRESTIGE GROOMING" || 
                             servicioActual === "ESSENTIAL GROOMING" || servicioActual === "LUXURY GROOMING EXPERIENCE" ||
                             servicioActual === "ONDULACIONES") {
                        const horaSiguiente1 = obtenerHoraFormateada(i + 1);
                        
                        // No se puede pedir un servicio de 2 horas en la última hora disponible (21:00)
                        if (i === 13 || i === 21 || horasOcupadas.includes(horaSiguiente1)) {
                            estaOcupada = true;
                        }
                    }
                }

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
    reserva.hora = hora; 
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

async function guardarCita() {
    const nombreInput = document.getElementById('nombre-cliente');
    const telInput = document.getElementById('tel-cliente');
    const botonAgendar = document.querySelector('.btn-main');

    if (!nombreInput || !telInput) return;

    const nombre = nombreInput.value.trim();
    const whatsapp = telInput.value.trim();

    if (!nombre) { alert("Por favor, ingresa tu nombre."); return; }
    if (whatsapp.length !== 9 || isNaN(whatsapp)) { alert("Ingresa un número de WhatsApp válido (9 dígitos)."); return; }

    if (!reserva.servicio || !reserva.fecha || !reserva.hora) {
        alert("Por favor, completa todos los pasos anteriores.");
        return;
    }

    if (botonAgendar) {
        botonAgendar.disabled = true;
        botonAgendar.innerText = "PROCESANDO...";
    }

    try {
        let posicionCiclo = 1;
        const qPos = await db.collection("citas").where("whatsapp", "==", whatsapp).get();
        if (!qPos.empty) {
            let maxPos = 0;
            qPos.forEach(doc => {
                let p = doc.data().posicionCiclo || 0;
                if (p > maxPos) maxPos = p;
            });
            posicionCiclo = maxPos + 1;
        }

        let mostrarPos = posicionCiclo;
        while (mostrarPos > 20) {
            mostrarPos -= 20;
        }

        let faltanParaPremio = 5 - (mostrarPos % 5);
        if (faltanParaPremio === 5) {
            faltanParaPremio = 0;
        }

        let promoTexto = `Faltan ${faltanParaPremio} para tu próximo premio (Promos válidas de Lunes a Jueves)`;
        if (mostrarPos % 5 === 0) {
            promoTexto = "¡Felicidades! Cumpliste un ciclo de 5 servicios. Reclama tu premio en la barbería de Lunes a Jueves.";
        }
        if (mostrarPos === 20) {
            promoTexto = "¡Felicidades! Llegaste al servicio #20. Tienes 50% dsc. en Luxury o Corte Regular Gratis (Lunes a Jueves).";
        }

        const nuevaCita = {
            barbero: reserva.barbero,
            servicio: reserva.servicio,
            precio: reserva.precio,
            fecha: reserva.fecha,
            hora: reserva.hora,
            cliente: nombre,
            whatsapp: whatsapp,
            posicionCiclo: posicionCiclo,
            estado: "PENDIENTE",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("citas").add(nuevaCita);

        let hFin = parseInt(reserva.hora.split(':')[0]);
        let pStr = reserva.hora.split(' ')[1];
        let horaFinTexto = `${reserva.hora}`;

        const textoWsp = `¡Hola Zea Barber! 💈\n` +
                         `Agendé mi cita:\n` +
                         `👤 Cliente: ${nombre}\n` +
                         `✨ Servicio: ${reserva.servicio}\n` +
                         `📅 Fecha: ${reserva.fecha}\n` +
                         `⏰ Hora: ${horaFinTexto}\n\n` +
                         `🏆 Estado: ${(reserva.precio >= 20) ? `Corte #${mostrarPos}/20` : 'Servicio Regular'}\n` +
                         `🎁 ${promoTexto}\n` +
                         `💰 Total a pagar: S/. ${reserva.precio}`;
        
        const urlWsp = `https://wa.me/51978513608?text=${encodeURIComponent(textoWsp)}`;
        window.location.href = urlWsp;

    } catch (error) {
        console.error("Error al guardar la cita:", error);
        alert("Hubo un problema al guardar tu cita. Inténtalo de nuevo.");
        
        if (botonAgendar) {
            botonAgendar.disabled = false;
            botonAgendar.innerText = "AGENDAR CITA";
        }
    }
}

function cerrarYRedirigir() {
    window.open(urlWhatsAppFinal, '_blank');
    location.reload(); 
}