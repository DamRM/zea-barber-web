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

// Servicios individuales que permiten adicionales (ajusta los precios y tiempos aquí)
const SERVICIOS_CON_EXTRAS = ["CLASICO", "FADE", "CORTE A TIJERA Y NAVAJA"];
const EXTRAS = {
    ceja: { label: "Definición de ceja", precioNormal: 10, precio: 5, duracion: 5 },
    cabello: { label: "Diseño en el cabello", precioNormal: 10, precio: 5, duracion: 5 },
    gold: { label: "Gold Mask", precioNormal: 25, precio: 15, duracion: 15 },
    capilar: { label: "Exfoliación Capilar", precioNormal: 30, precio: 15, duracion: 15 },
    tratamiento: { label: "Hidratación y Tratamiento Capilar Express", precioNormal: 30, precio: 15, duracion: 15 }
};

let reserva = { barbero: "ZEA", servicio: "", precio: 0, fecha: "", hora: "" };
let urlWhatsAppFinal = ""; 

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
    
    const fechaSel = document.getElementById('reserva-fecha')?.value;
    if (fechaSel) {
        cargarHorarios();
    }

    // Si el servicio admite adicionales, se muestran justo debajo de la tarjeta
    const tieneExtras = mostrarExtras(el);
    document.getElementById('step-2').classList.add('section-visible');
    if (tieneExtras) {
        setTimeout(() => {
            const y = el.getBoundingClientRect().top + window.pageYOffset - 110;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }, 150);
    } else {
        irA('step-2');
    }
}

function mostrarExtras(el) {
    // Quita el bloque de una selección anterior
    const previo = document.getElementById('extras-box');
    if (previo) previo.remove();

    const aplica = SERVICIOS_CON_EXTRAS.includes((reserva.servicio || "").trim().toUpperCase());
    if (!aplica || !el) return false;

    const opciones = Object.keys(EXTRAS).map(k => {
        const extra = EXTRAS[k];
        const ahorro = extra.precioNormal - extra.precio;
        
        let textoSubPrecio = '';
        if (k === 'cabello') {
            textoSubPrecio = `<div style="font-size: 9.5px; color: #16a34a; font-weight: 600; margin-top: 2px;">Desde S/ ${extra.precio}</div>`;
        } else if (ahorro > 0) {
            textoSubPrecio = `<div style="font-size: 9.5px; color: #16a34a; font-weight: 600; margin-top: 2px;">Ahorras S/ ${ahorro}</div>`;
        }

        // Si es la ceja, mostramos solo el precio actual sin tachar; para los demás mantenemos el precio normal tachado y el descuento
        const renderPrecio = (k === 'cabello') 
            ? `S/ ${extra.precio}` 
            : `<s>S/ ${extra.precioNormal}</s> S/ ${extra.precio}`;

        return `
        <label class="extra-opcion">
            <span class="extra-nombre">
                <input type="checkbox" id="extra-${k}">
                <div>
                    <div style="font-size: 12.5px; font-weight: 600;">${extra.label}</div>
                    <span class="service-duration" style="font-size: 9.5px; gap: 3px; margin-top: 2px;"><i class="far fa-clock" style="font-size: 9.5px;"></i> ${extra.duracion} MIN</span>
                </div>
            </span>
            <div style="text-align: right;">
                <span class="extra-precio">${renderPrecio}</span>
                ${textoSubPrecio}
            </div>
        </label>`;
    }).join('');

    const box = document.createElement('div');
    box.id = 'extras-box';
    box.className = 'extras-box';
    box.innerHTML = `
        <h4>✨ ¿Deseas añadir un adicional?</h4>
        <p class="extras-sub">Opcional · precio especial por realizado el corte</p>
        ${opciones}
        <button type="button" class="extra-continuar" onclick="irA('step-2')">Continuar →</button>`;
    el.insertAdjacentElement('afterend', box);
    return true;
}
function obtenerExtrasSeleccionados() {
    const box = document.getElementById('extras-box');
    if (!box) return [];
    return Object.keys(EXTRAS).filter(k => {
        const chk = document.getElementById('extra-' + k);
        return chk && chk.checked;
    });
}

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

    const hoyLima = new Date().toLocaleDateString('en-CA', {timeZone: 'America/Lima'});
    if (fechaSel < hoyLima) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:#ff4d4d; font-weight:600;'>No puedes seleccionar una fecha pasada.</p>";
        reserva.fecha = "";
        return;
    }

    reserva.fecha = fechaSel;
    grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Cargando horarios...</p>";

    try {
        const docBloqueo = await db.collection("dias_bloqueados").doc(fechaSel).get();
        if (docBloqueo.exists) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; background: #fee2e2; border: 1px solid #f87171; border-radius: 12px; padding: 20px; text-align: center; color: #991b1b;">
                    <i class="fas fa-ban" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                    <strong>¡Lo sentimos! No estamos atendiendo este día.</strong>
                    <p style="font-size: 12px; margin: 5px 0 0 0;">La fecha seleccionada se encuentra bloqueada y las horas no están disponibles para reservas.</p>
                </div>
            `;
            return;
        }

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
                     servicioGuardado === "ONDULACIONES" || servicioGuardado === "CORTE & BARBA PREMIUM") {
                const horaSig1 = obtenerHoraFormateada(hNum + 1);
                if (!horasOcupadas.includes(horaSig1)) horasOcupadas.push(horaSig1);
            }
        });
        let html = "";

        for (let i = 9; i <= 21; i++) {
            const horaFormateada = obtenerHoraFormateada(i);
            let visible = true;

            if (i === 14) { visible = false; } 
            else if (diaSemana === 6) { visible = true; } 
            else if (diaSemana === 3) { if (i < 10 || i > 13) visible = false; } 
            else if (diaSemana === 0) { if (i < 10 || i > 18) visible = false; } 
            else { if (i < 10 || i > 21) visible = false; } 

            if (visible) {
                let estaOcupada = horasOcupadas.includes(horaFormateada);
                
                if (!estaOcupada) {
                    const servicioActual = reserva.servicio ? reserva.servicio.trim().toUpperCase() : "";

                    if (servicioActual === "2 CORTES A DOMICILIO" || servicioActual === "PLATINADO") {
                        const horaSiguiente1 = obtenerHoraFormateada(i + 1);
                        const horaSiguiente2 = obtenerHoraFormateada(i + 2);
                        
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

function seleccionarHora(hora, btn) {
    reserva.hora = hora; 
    document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const step3 = document.getElementById('step-3');
    if (step3) {
        step3.classList.remove('hidden');
        irA('step-3');
    }
}
// ==========================================
// 1. FUNCIÓN DE SEGURIDAD (CON LA LISTA NEGRA)
// Se coloca fuera de guardarCita(), para poder usarla cuando quieras.
// ==========================================
function validarNombreReal(nombre) {
    if (nombre.length < 3) {
        return { valido: false, mensaje: "Por favor, ingresa tu nombre real (mínimo 3 letras)." };
    }

    const regexSoloLetras = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (!regexSoloLetras.test(nombre)) {
        return { valido: false, mensaje: "El nombre solo debe contener letras y espacios (sin números ni símbolos)." };
    }

    const palabrasProhibidas = [
        "admin", "administrador", "prueba", "test", "root", "null", "undefined", "nadie", "ninguno", "anonimo", "zea", "barbero", "sistema", "xd", "lol",
        "caca", "mierda", "puto", "puta", "idiota", "estupido", "estupida", "imbecil", "basura", "perra", "zorra", "culo", "ano", "pendejo", "pendeja", "cabron", "asno",
        "kchero", "cachero", "kchera", "cachera", "ctm", "conchatumare", "conchetumare", "rctm", "huevon", "webon", "weon", "wb", "cabro", "kbro", "chucha", "pinga", "pichula", "verga", "poto", "pipi", "baboso", "mongol", "tarao", "tarado", "maricon", "rosca", "chupin", "ctmr"
    ];
    
    const palabrasEnNombre = nombre.toLowerCase().split(/\s+/);
    
    for (let palabra of palabrasEnNombre) {
        if (palabrasProhibidas.includes(palabra)) {
            return { valido: false, mensaje: "Por favor, utiliza un nombre real para identificarte en la barbería." };
        }
    }

    return { valido: true };
}


// ==========================================
// 2. TU FUNCIÓN guardarCita() (QUE LLAMA A LA VALIDACIÓN)
// ==========================================
async function guardarCita() {
    const nombreInput = document.getElementById('nombre-cliente');
    const telInput = document.getElementById('tel-cliente');
    const botonAgendar = document.querySelector('.btn-main');

    if (!nombreInput || !telInput) return;

    const nombre = nombreInput.value.trim();
    const whatsapp = telInput.value.trim();

    if (!nombre) { alert("Por favor, ingresa tu nombre."); return; }

    // 👇 AQUÍ LLAMAMOS A LA FUNCIÓN DE SEGURIDAD QUE DEFINIMOS ARRIBA 👇
    const validacionNombre = validarNombreReal(nombre);
    if (!validacionNombre.valido) {
        alert(validacionNombre.mensaje);
        return; // Frena la reserva si detecta una grosería
    }
    // 👆 ----------------------------------------------------------- 👆

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

        let precioOriginal = reserva.precio;
        let precioFinal = precioOriginal;
        let promoTexto = `Faltan ${faltanParaPremio} para tu próximo premio (Promos válidas de Lunes a Jueves)`;

        if (mostrarPos === 5) {
            precioFinal = precioOriginal * 0.75;
            promoTexto = "¡Felicidades! Llegaste al corte #5. Tienes un 25% de Descuento aplicado (Válido de Lunes a Jueves).";
        } 
        else if (mostrarPos === 10) {
            precioFinal = precioOriginal * 0.50;
            promoTexto = "¡Felicidades! Llegaste al corte #10. Tienes un 50% de Descuento aplicado (Válido de Lunes a Jueves).";
        } 
        else if (mostrarPos === 15) {
            precioFinal = precioOriginal * 0.50;
            promoTexto = "¡Felicidades! Llegaste al corte #15. Tienes un 50% de Descuento aplicado (Válido de Lunes a Jueves).";
        } 
        else if (mostrarPos === 20) {
            precioFinal = precioOriginal;
            promoTexto = "¡Felicidades! Llegaste al corte #20. ¡Ya estás participando en el sorteo exclusivo de Zea Barber! 🎉";
        }

        // Adicionales (precio especial fijo; el descuento del club aplica solo al servicio base)
        const extrasSel = obtenerExtrasSeleccionados();
        const precioExtras = extrasSel.reduce((acc, k) => acc + EXTRAS[k].precio, 0);
        const extrasLabels = extrasSel.map(k => EXTRAS[k].label);
        const totalFinal = precioFinal + precioExtras;

        const nuevaCita = {
            barbero: reserva.barbero,
            servicio: reserva.servicio,
            precioOriginal: precioOriginal,
            extras: extrasLabels,
            precioExtras: precioExtras,
            precio: totalFinal,
            fecha: reserva.fecha,
            hora: reserva.hora,
            cliente: nombre,
            whatsapp: whatsapp,
            posicionCiclo: posicionCiclo,
            estado: "PENDIENTE",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("citas").add(nuevaCita);

        let horaFinTexto = `${reserva.hora}`;

        let textoWsp = `¡Hola Zea Barber! 💈\n` +
                       `Agendé mi cita:\n` +
                       `👤 Cliente: ${nombre}\n` +
                       `✨ Servicio: ${reserva.servicio}\n` +
                       `📅 Fecha: ${reserva.fecha}\n` +
                       `⏰ Hora: ${horaFinTexto}\n\n` +
                       `🏆 Estado: ${(precioOriginal >= 20) ? `Corte #${mostrarPos}/20` : 'Servicio Regular'}\n` +
                       `🎁 ${promoTexto}\n`;

        if (extrasLabels.length > 0) {
            textoWsp += `➕ Adicionales: ${extrasLabels.join(' + ')} (+S/. ${precioExtras.toFixed(2)})\n`;
        }

        if (precioFinal !== precioOriginal) {
            textoWsp += `💰 Precio Regular: S/. ${(precioOriginal + precioExtras).toFixed(2)}\n` +
                        `🔥 Total a pagar (Con Desc.): S/. ${totalFinal.toFixed(2)}\n`;
        } else {
            textoWsp += `💰 Total a pagar: S/. ${totalFinal.toFixed(2)}\n`;
        }
        
        textoWsp += `⚠️ *Adjunto la captura de mi adelanto de S/ 5.00 para asegurar mi espacio.*`;

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

window.addEventListener('scroll', function () {
    const header = document.querySelector('.header');
    const logo = document.querySelector('.logo-text');

    if (header && logo) {
        if (window.scrollY > 0) {
            header.classList.add('scrolled');
            logo.src = 'img/logo3.png';
        } else {
            header.classList.remove('scrolled');
            logo.src = 'img/logo2.png';
        }
    }
});
document.addEventListener("DOMContentLoaded", () => {
    // 1. Copiar número al portapapeles
    const btnCopiar = document.getElementById("btn-copiar");
    if (btnCopiar) {
        btnCopiar.addEventListener("click", () => {
            const numeroTexto = document.getElementById("numero-barber").innerText;
            navigator.clipboard.writeText(numeroTexto).then(() => {
                alert("¡Número copiado al portapapeles!");
            }).catch(err => {
                console.error("Error al copiar: ", err);
            });
        });
    }

    // 2. Descargar la imagen del QR
    const btnDescargarQR = document.getElementById("btn-descargar-qr");
    if (btnDescargarQR) {
        btnDescargarQR.addEventListener("click", () => {
            const imagenSrc = document.getElementById("qr-imagen").src;
            const enlace = document.createElement("a");
            enlace.href = imagenSrc;
            enlace.download = "QR-ZeaBarber.png";
            document.body.appendChild(enlace);
            enlace.click();
            document.body.removeChild(enlace);
        });
    }
});