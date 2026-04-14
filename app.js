// ESTADO GLOBAL
// ===============================
let loteActualId = null;
let eventoActualId = null;
let accionSeleccionadaLote = null;
let accionSeleccionadaEvento = null;
let usuarios = [];

const API_URL = "https://backend-marmotech-production.up.railway.app";

// ===============================
// ACCIONES DEL LOTE (CENTRALIZADAS)
// ===============================
const accionesLote = {
    async retirar() {
        if (!loteActualId) return;

        const confirmar = confirm("¿Retirar lote?");
        if (!confirmar) return;

        const res = await fetch(`${API_URL}/lotes/retirar/${loteActualId}`, {
            method: "PUT"
        });

        if (!res.ok) throw new Error("Error retirando lote");

        alert("Lote retirado ✅");
        await loadRecentLotes();
        await verDetalleLote(loteActualId);
    },

    async eliminar() {
        if (!loteActualId) return;

        const confirmar = confirm("¿Eliminar lote?");
        if (!confirmar) return;

        const res = await fetch(`${API_URL}/lotes/${loteActualId}`, {
            method: "DELETE",
            headers: {
                "rol": sessionStorage.getItem("rol")
            }
        });

        if (!res.ok) throw new Error("Error eliminando lote");

        alert("Lote eliminado ✅");
        await loadRecentLotes();
        showTab("resumen");
    },

    evento() {
        if (!loteActualId) return;

        document.getElementById("lote-evento").value = loteActualId;
        showTab("registrar-evento");
    }
};


//Acciones Eventos
// ===============================
const accionesEvento = {
    async investigar() {
        if (!eventoActualId) return;

        const res = await fetch(`${API_URL}/eventos/investigar/${eventoActualId}`, {
            method: "PUT"
        });

        if (!res.ok) throw new Error("Error cambiando estado");

        alert("Evento en investigación 🔍");
        await loadRecentEventos();
        await verDetalleEvento(eventoActualId);
    },

    async resolver() {
        if (!eventoActualId) return;

        const res = await fetch(`${API_URL}/eventos/resolver/${eventoActualId}`, {
            method: "PUT"
        });

        if (!res.ok) throw new Error("Error resolviendo evento");

        alert("Evento resuelto ✅");
        await loadRecentEventos();
        await verDetalleEvento(eventoActualId);
    },

    async eliminar() {
        if (!eventoActualId) return;

        const confirmar = confirm("¿Eliminar evento?");
        if (!confirmar) return;

        try {
            const res = await fetch(`${API_URL}/eventos/${eventoActualId}`, {
                method: "DELETE",
                headers: {
                    "rol": sessionStorage.getItem("rol")
                }
            });

            if (!res.ok) {
                const error = await res.json();
                alert(error.error || "No autorizado ❌");
                return;
            }

            alert("Evento eliminado correctamente ✅");
            await loadRecentEventos();
            showTab("resumen");

        } catch (error) {
            console.error(error);
            alert("Error eliminando evento ❌");
        }
    }
};
// ===============================
// VALIDAR SESIÓN AL CARGAR
// ===============================
document.addEventListener("DOMContentLoaded", async () => {

    const usuario = sessionStorage.getItem("usuario");
    const rol = sessionStorage.getItem("rol");

    const toggleBtn = document.getElementById("toggle-menu");
    const sidebar = document.querySelector(".sidebar");

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
        });
    }

    // SI NO HAY SESIÓN
    if (!usuario || !rol) {
        document.getElementById("login-page").classList.remove("hidden");
        document.getElementById("dashboard").classList.add("hidden");
        return;
    }

    try {
        //  VALIDAR CON EL BACKEND
        const res = await fetch(`${API_URL}/validar-sesion`, {
            headers: {
                "usuario": usuario
            }
        });

        const data = await res.json();

        // SI ESTÁ DESACTIVADO
        if (!data.activo) {
            sessionStorage.clear();
            alert("Tu usuario ha sido desactivado");
            document.getElementById("login-page").classList.remove("hidden");
            document.getElementById("dashboard").classList.add("hidden");
            return;
        }

        // SI TODO ESTÁ BIEN → ENTRA
        document.getElementById("login-page").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");

        //  BIENVENIDA (NO LA PIERDES)
        document.getElementById("bienvenida").innerHTML = `
            Bienvenido, ${usuario}
            <span style="
                background:#e74c3c;
                color:white;
                padding:4px 8px;
                border-radius:5px;
                margin-left:8px;
                font-size:12px;
            ">
                ${rol.toUpperCase()}
            </span>
        `;

        //  PERMISOS
        aplicarPermisos();

        //  CARGA DE DATOS
        loadRecentLotes();
        loadRecentEventos();
        cargarAlertas();
        showTab("resumen");

    } catch (error) {
        console.error(error);

        // fallback
        sessionStorage.clear();
        document.getElementById("login-page").classList.remove("hidden");
        document.getElementById("dashboard").classList.add("hidden");
    }
});

// ===============================
// LOGIN
// ===============================
document.getElementById("login-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success) {

            // GUARDAR USUARIO Y ROL
            sessionStorage.setItem("usuario", data.usuario);
            sessionStorage.setItem("rol", data.rol);

            //  MOSTRAR MENSAJE BIENVENIDA
            const usuario = data.usuario;
            const rol = data.rol;


            document.getElementById("bienvenida").innerHTML = `
                Bienvenido, ${usuario}
                <span style="
                background:#e74c3c;
                color:white;
                padding:4px 8px;
                border-radius:5px;
                margin-left:8px;
                font-size:12px;
                 ">
                  ${rol.toUpperCase()}
               </span>
           `;


            document.getElementById("login-page").classList.add("hidden");
            document.getElementById("dashboard").classList.remove("hidden");

            //  APLICAR PERMISOS SEGÚN ROL 
            aplicarPermisos();


            loadRecentLotes();
            loadRecentEventos();
            cargarAlertas();
            showTab("resumen");

        } else {
            alert(data.mensaje || "Error al iniciar sesión");
        }

    } catch (error) {
        console.error(error);
        alert("Error conectando con el servidor");
    }
});

// ===============================
// LOGOUT
// ===============================
document.getElementById("logout").addEventListener("click", function (e) {
    e.preventDefault();

    //  BORRAR SESIÓN
    sessionStorage.clear();

    document.getElementById("login-page").classList.remove("hidden");
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("login-form").reset();
});

// ===============================
// CARGAR LOTES
// ===============================
async function loadRecentLotes() {
    try {
        const res = await fetch(`${API_URL}/lotes`);
        const lotes = await res.json();

        const tbody = document.querySelector("#lotes-recientes-table tbody");
        tbody.innerHTML = "";

        lotes.forEach(lote => {
            const row = document.createElement("tr");

            row.innerHTML = `
                      <td>${lote.numero}</td>
                      <td>${lote.producto}</td>
                      <td>${new Date(lote.fecha_fabricacion).toLocaleDateString()}</td>
                     <td>${lote.estado || "Activo"}</td>

            <!-- BOTÓN VER -->
              <td style="text-align:center; vertical-align: middle;">
                   <button class="btn" onclick="verDetalleLote(${lote.id})">
                        Ver
                    </button>
              </td>

           <!-- BOTÓN EDITAR -->
              <td style="text-align:center; vertical-align: middle;">
                 <button class="btn btn-warning" onclick="editarLote(${lote.id})">
                      Editar
                  </button>
               </td>
        `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Error cargando lotes:", error);
    }
}

// ===============================
// CARGAR EVENTOS
// ===============================
async function loadRecentEventos() {
    try {
        const res = await fetch(`${API_URL}/eventos`);
        const eventos = await res.json();

        const tbody = document.querySelector("#eventos-recientes-table tbody");
        tbody.innerHTML = "";

        eventos.forEach(evento => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${evento.codigo}</td>
                <td>${evento.numero}</td>
                <td>${evento.tipo}</td>
                <td>${new Date(evento.fecha).toLocaleDateString('es-DO')}</td>
                <td>${evento.estado || "Pendiente"}</td>
                <td>
                   <button class="btn" onclick="verDetalleEvento(${evento.id})">
                   Ver
                </button>
                </td>

                    <td style="text-align:center;">
                        <button class="btn btn-warning" onclick="editarEvento(${evento.id})">
                        Editar
                      </button>
                  </td>
            `;

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Error cargando eventos:", error);
    }
}

// ===============================
// REGISTRAR LOTE (MYSQL)
// ===============================
document.getElementById("form-registrar-lote").addEventListener("submit", async function (e) {
    e.preventDefault();

    const data = {
        numero: document.getElementById("numero-lote").value,
        producto: document.getElementById("producto").value,
        fecha_fabricacion: document.getElementById("fecha-fabricacion").value,
        fecha_vencimiento: document.getElementById("fecha-vencimiento").value,
        cantidad: document.getElementById("cantidad").value,
        proveedor: document.getElementById("proveedor").value,
        observaciones: document.getElementById("observaciones").value
    };

    try {
        await fetch(`${API_URL}/lotes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        alert("Lote registrado correctamente ✅");
        this.reset();
        loadRecentLotes();

    } catch (error) {
        console.error(error);
        alert("Error guardando lote");
    }
});

// ===============================
// REGISTRAR EVENTO (MYSQL)
// ===============================
document.getElementById("form-registrar-evento").addEventListener("submit", async function (e) {
    e.preventDefault();

    const fechaEvento = document.getElementById("fecha-evento").value;
    const hoy = new Date().toISOString().split("T")[0];


    //  Obtener fecha del lote seleccionado
    const selectLote = document.getElementById("lote-evento");
    const fechaLote = selectLote.options[selectLote.selectedIndex].getAttribute("data-fecha");


    //  VALIDACIÓN: evento no puede ser antes del lote
    const fechaEventoDate = new Date(fechaEvento);
    const fechaLoteDate = new Date(fechaLote);

    if (fechaEventoDate < fechaLoteDate) {
        alert("❌ La fecha del evento no puede ser anterior a la fabricación del lote");
        return;
    }


    //  VALIDACIÓN: no permitir fechas futuras
    if (fechaEvento > hoy) {
        alert("❌ No puedes registrar una fecha futura");
        return;
    }

    const data = {
        codigo: "EV-" + Date.now(),
        lote_id: document.getElementById("lote-evento").value,
        tipo: document.getElementById("tipo-evento").value,
        descripcion: document.getElementById("descripcion-evento").value,
        fecha: document.getElementById("fecha-evento").value,
        gravedad: document.getElementById("gravedad").value
    };

    try {
        await fetch(`${API_URL}/eventos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        alert("Evento registrado correctamente ✅");
        this.reset();
        loadRecentEventos();
        showTab("resumen");

    } catch (error) {
        console.error(error);
        alert("Error guardando evento");
    }
});



// NO permitir fechas futuras(registrar eventos)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const inputFecha = document.getElementById("fecha-evento");
    const hoy = new Date().toISOString().split("T")[0];
    inputFecha.setAttribute("max", hoy);
});



// ===============================
// NAVEGACIÓN DE TABS
// ===============================
function showTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.remove("active");
    });

    document.getElementById(tabId).classList.add("active");

    document.querySelectorAll(".menu-link").forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("data-tab") === tabId) {
            link.classList.add("active");
        }
    });
}

document.querySelectorAll(".menu-link").forEach(link => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        const tab = this.getAttribute("data-tab");
        showTab(tab);

        if (tab === "registrar-evento") {
            cargarLotesEnSelect();
        }

        if (tab === "historial") {
            cargarHistorialGlobal();
        }

        if (tab === "agregar") {
            cargarUsuarios();
        }

        if (tab === "configuracion") {
            cargarConfiguracion();
        }


    });
});

// ===============================
// BUSQUEDA RAPIDA
// ===============================
document.getElementById("quick-search-btn").addEventListener("click", async function () {
    const query = document.getElementById("quick-search").value;

    if (!query) {
        alert("Ingrese un número de lote");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/lotes`);
        const lotes = await res.json();

        const lote = lotes.find(l => l.numero === query);

        if (lote) {
            // ABRIR DETALLE DEL LOTE
            verDetalleLote(lote.id);
        } else {
            alert("Lote no encontrado ❌");
        }

    } catch (error) {
        console.error(error);
    }
});

// ===============================
// ========PDF=============
async function generarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();



    const tipo = document.getElementById("tipo-reporte").value;
    const usuario = sessionStorage.getItem("usuario") || "Sistema";

    let columnas = [];
    let filas = [];
    let titulo = "";
    let total = 0;

    try {

        // ==============================
        // LOTES ACTIVOS
        // ==============================
        if (tipo === "lotes-activos") {

            const res = await fetch(`${API_URL}/reporte/lotes-activos`);
            const data = await res.json();

            columnas = ["N° Lote", "Producto", "Fecha Fabricación", "Fecha Vencimiento", "Cantidad"];

            filas = data.map(l => [
                l.numero,
                l.producto,
                new Date(l.fecha_fabricacion).toLocaleDateString('es-DO'),
                new Date(l.fecha_vencimiento).toLocaleDateString('es-DO'),
                l.cantidad
            ]);

            total = data.length;
            titulo = "Reporte: Lotes Activos";
        }

        // ==============================
        // LOTES RETIRADOS
        // ==============================
        else if (tipo === "lotes-retirados") {

            const res = await fetch(`${API_URL}/reporte/lotes-retirados`);
            const data = await res.json();

            columnas = ["N° Lote", "Producto", "Fecha", "Motivo de retiro"];

            filas = data.map(l => [
                l.numero,
                l.producto,
                new Date(l.fecha_fabricacion).toLocaleDateString('es-DO'),
                l.motivo_retiro || "Sin descripción"
            ]);

            total = data.length;
            titulo = "Reporte: Lotes Retirados";
        }

        // ==============================
        // EVENTOS POR PERIODO
        // ==============================
        else if (tipo === "eventos-periodo") {

            const inicio = document.getElementById("fecha-inicio").value;
            const fin = document.getElementById("fecha-fin").value;

            const res = await fetch(`${API_URL}/reporte/eventos-periodo?inicio=${inicio}&fin=${fin}`);
            const data = await res.json();

            columnas = ["Código", "Lote", "Producto", "Tipo", "Fecha", "Gravedad", "Estado"];

            filas = data.map(e => [
                e.codigo,
                e.numero,
                e.producto,
                e.tipo,
                new Date(e.fecha).toLocaleDateString('es-DO'),
                e.gravedad,
                e.eliminado == 1 ? "Inactivo" : (e.lote_estado === "Retirado" ? "Retirado" : "Activo")
            ]);

            total = data.length;
            titulo = "Reporte: Eventos por Período";
        }

        // ==============================
        // EVENTOS INVESTIGACIÓN
        // ==============================
        else if (tipo === "eventos-investigacion") {

            const res = await fetch(`${API_URL}/reporte/eventos-investigacion`);
            const data = await res.json();

            columnas = ["Código", "Tipo", "Fecha", "Gravedad", "Estado"];

            filas = data.map(e => [
                e.codigo,
                e.tipo,
                new Date(e.fecha).toLocaleDateString('es-DO'),
                e.gravedad,
                e.estado
            ]);

            total = data.length;
            titulo = "Reporte: Eventos en Investigación";

        }

        // ==============================
        // EVENTOS Pendientes
        // ==============================
        else if (tipo === "eventos-pendientes") {

            const res = await fetch(`${API_URL}/reporte/eventos-pendientes`);
            const data = await res.json();

            columnas = ["Código", "Tipo", "Fecha", "Gravedad", "Estado"];

            filas = data.map(e => [
                e.codigo,
                e.tipo,
                new Date(e.fecha).toLocaleDateString('es-DO'),
                e.gravedad,
                e.estado || "Pendiente"
            ]);

            total = data.length;
            titulo = "Reporte: Eventos Pendientes";
        }
        // ==============================
        // EVENTOS resueltos
        // ==============================
        else if (tipo === "eventos-resueltos") {

            const res = await fetch(`${API_URL}/reporte/eventos-resueltos`);
            const data = await res.json();

            columnas = ["Código", "Tipo", "Fecha", "Gravedad", "Estado"];

            filas = data.map(e => [
                e.codigo,
                e.tipo,
                new Date(e.fecha).toLocaleDateString('es-DO'),
                e.gravedad,
                e.estado
            ]);

            total = data.length;
            titulo = "Reporte: Eventos Resueltos";
        }
        // ==============================
        // PRODUCTOS
        // ==============================
        else if (tipo === "productos") {

            const res = await fetch(`${API_URL}/reporte/productos`);
            const data = await res.json();

            columnas = ["Proveedor", "Producto", "Total"];

            filas = data.map(p => [
                p.proveedor,
                p.producto,
                p.total
            ]);

            total = data.length;
            titulo = "Reporte: Productos por Proveedor";
        }

        // ==============================
        // ENCABEZADO PRINCIPAL
        // ==============================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("SISTEMA GSR", 105, 15, null, null, "center");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("Sistema de Registro y Control de Eventualidades Marmotech", 105, 22, null, null, "center");

        // Línea azul
        doc.setDrawColor(0, 102, 204);
        doc.setLineWidth(0.7);
        doc.line(14, 26, 196, 26);

        // ==============================
        // TITULO REPORTE
        // ==============================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Resultado del Reporte", 14, 35);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(titulo, 14, 45);
        doc.text("Fecha de generación: " + new Date().toLocaleString('es-DO'), 14, 52);
        doc.text("Total: " + total, 14, 59);

        // ==============================
        // TABLA
        // ==============================
        doc.autoTable({
            startY: 65,
            head: [columnas],
            body: filas,

            styles: {
                fontSize: 9
            },

            headStyles: {
                fillColor: [230, 230, 230],
                textColor: 0,
                fontStyle: "bold"
            },

            alternateRowStyles: {
                fillColor: [245, 245, 245]
            }
        });



        // INFO DE GENERACIÓN 
        // ==============================
        let finalY = doc.lastAutoTable.finalY + 10;

        // Evitar que se salga de la hoja
        if (finalY > 280) {
            doc.addPage();
            finalY = 20;
        }

        // Línea separadora elegante
        doc.setDrawColor(200);
        doc.line(14, finalY - 5, 196, finalY - 5);

        // Estilo de texto
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");

        // Texto izquierda
        doc.text(
            `Generado por: ${usuario}`,
            14,
            finalY
        );

        // Texto derecha
        doc.text(
            `Fecha: ${new Date().toLocaleString('es-DO')}`,
            140,
            finalY
        );

        doc.save("reporte_gsr.pdf");

    } catch (error) {
        console.error(error);
        alert("Error generando PDF");
    }
}

// =====Lotes Seleccion===
async function cargarLotesEnSelect() {
    try {
        const res = await fetch(`${API_URL}/lotes`);
        const lotes = await res.json();

        const select = document.getElementById("lote-evento");
        select.innerHTML = '<option value="">Seleccione lote...</option>';

        lotes.forEach(l => {
            select.innerHTML += `
                      <option value="${l.id}" data-fecha="${l.fecha_fabricacion}">
                        ${l.numero} - ${l.producto}
                      </option>
                      `;
        });

    } catch (error) {
        console.error("Error cargando lotes:", error);
    }
}

// =====Funcion de ver detalles===
async function verDetalleLote(id) {
    try {
        // ✅ GUARDAR ESTADO GLOBAL
        loteActualId = id;

        const res = await fetch(`${API_URL}/lotes/${id}`);
        console.log("STATUS:", res.status);

        if (!res.ok) {
            alert("Error obteniendo el lote");
            return;
        }

        const lote = await res.json();
        console.log("LOTE:", lote);

        // MOSTRAR ACCIONES
        document.getElementById("acciones-lote").style.display = "block";

        // Título
        document.getElementById("lote-numero").innerText = lote.numero;

        // Contenido
        document.getElementById("lote-info-container").innerHTML = `
            <div class="grid-lote">
                <div class="card-box">
                    <strong>Producto</strong>
                    <span>${lote.producto}</span>
                </div>

                <div class="card-box">
                    <strong>Fecha Fabricación</strong>
                    <span>${new Date(lote.fecha_fabricacion).toLocaleDateString()}</span>
                </div>

                <div class="card-box">
                    <strong>Fecha Vencimiento</strong>
                    <span>${new Date(lote.fecha_vencimiento).toLocaleDateString()}</span>
                </div>

                <div class="card-box">
                    <strong>Cantidad</strong>
                    <span>${lote.cantidad}</span>
                </div>

                <div class="card-box">
                    <strong>Proveedor</strong>
                    <span>${lote.proveedor}</span>
                </div>

                <div class="card-box">
                    <strong>Estado</strong>
                    <span>${lote.estado || "Activo"}</span>
                </div>

                <div class="card-box full">
                    <strong>Observaciones</strong>
                    <span>${lote.observaciones || "Sin observaciones"}</span>
                </div>
            </div>
        `;

        // BLOQUEAR SEGÚN ROL (solo UI)
        const rol = sessionStorage.getItem("rol");

        if (rol === "asistente") {
            document.getElementById("eliminar-lote-btn").style.display = "none";
        } else {
            document.getElementById("eliminar-lote-btn").style.display = "inline-block";
        }


        // ===============================
        // PROTEGER FUNCIÓN QUE ROMPÍA TODO
        // ===============================
        try {
            await cargarEventosLote(id);
        } catch (error) {
            console.error("Error cargando eventos:", error);
        }

        // Cambiar a pestaña detalle
        showTab("detalle-lote");

    } catch (error) {
        console.error(error);
        alert("Error cargando detalle");
    }
}
// Funcion editar lote
async function editarLote(id) {
    try {
        const res = await fetch(`${API_URL}/lotes/${id}`);
        const lote = await res.json();

        // OCULTAR BLOQUE DE ACCIONES
        document.getElementById("acciones-lote").style.display = "none";

        // Título
        document.getElementById("lote-numero").innerText = lote.numero;

        // FORM EDITABLE (SIN HISTORIAL)
        document.getElementById("lote-info-container").innerHTML = `
            <div class="grid-lote">

                <div class="card-box">
                    <strong>Producto</strong>
                    <input type="text" id="edit-producto" value="${lote.producto}">
                </div>

                <div class="card-box">
                    <strong>Fecha Fabricación</strong>
                    <input type="date" id="edit-fabricacion" value="${lote.fecha_fabricacion.split("T")[0]}">
                </div>

                <div class="card-box">
                    <strong>Fecha Vencimiento</strong>
                    <input type="date" id="edit-vencimiento" value="${lote.fecha_vencimiento.split("T")[0]}">
                </div>

                <div class="card-box">
                    <strong>Cantidad</strong>
                    <input type="number" id="edit-cantidad" value="${lote.cantidad}">
                </div>

                <div class="card-box">
                    <strong>Proveedor</strong>
                    <input type="text" id="edit-proveedor" value="${lote.proveedor}">
                </div>

                <div class="card-box full">
                    <strong>Observaciones</strong>
                    <textarea id="edit-observaciones">${lote.observaciones || ""}</textarea>
                </div>

            </div>

            <div style="margin-top:20px; display:flex; gap:10px;">
                <button class="btn btn-success" onclick="guardarEdicionLote(${id})">
                    Guardar
                </button>

                <button class="btn btn-danger" onclick="showTab('resumen')">
                    Cancelar
                </button>
            </div>
        `;

        // CAMBIAR A TAB DETALLE
        showTab("detalle-lote");

    } catch (error) {
        console.error(error);
        alert("Error cargando lote para edición");
    }
}



// ===============================
// Guardar edicion de lote
// ===============================
async function guardarEdicionLote(id) {
    const data = {
        producto: document.getElementById("edit-producto").value,
        fecha_fabricacion: document.getElementById("edit-fabricacion").value,
        fecha_vencimiento: document.getElementById("edit-vencimiento").value,
        cantidad: document.getElementById("edit-cantidad").value,
        proveedor: document.getElementById("edit-proveedor").value,
        observaciones: document.getElementById("edit-observaciones").value,
        usuario: sessionStorage.getItem("usuario")
    };

    try {
        const res = await fetch(`${API_URL}/lotes/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            alert("Error actualizando lote ❌");
            return;
        }

        alert("Lote actualizado correctamente ✅");

        loadRecentLotes();
        verDetalleLote(id);

    } catch (error) {
        console.error(error);
        alert("Error guardando cambios");
    }
}



// ===============================
// GENERAR REPORTES 
// ===============================
document.getElementById("form-generar-reporte").addEventListener("submit", async function (e) {
    e.preventDefault();

    const tipo = document.getElementById("tipo-reporte").value;
    const contenedor = document.getElementById("contenido-reporte");
    const box = document.getElementById("resultado-reporte");


    try {
        // ==========================
        //  LÓGICA DE FETCH
        // ==========================
        let url = `${API_URL}/reporte/${tipo}`;

        if (tipo === "eventos-periodo") {
            const inicio = document.getElementById("fecha-inicio").value;
            const fin = document.getElementById("fecha-fin").value;

            if (!inicio || !fin) {
                alert("Selecciona ambas fechas");
                return;
            }

            url += `?inicio=${inicio}&fin=${fin}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        // ==========================
        // HTML DEL REPORTE
        // ==========================
        let html = `
            <h4>Reporte: ${tipo.replace("-", " ")}</h4>
            <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-DO')}</p>
        `;


        if (tipo === "lotes-activos") {

            if (data.length === 0) {
                html += `
            <p style="color: #999; text-align:center; padding:20px;">
                ⚠️ No hay lotes activos
            </p>
        `;
            }
            html += `
                <p>Total de lotes activos: ${data.length}</p>
                <table class="report-table">
                    <tr>
                        <th>N° Lote</th>
                        <th>Producto</th>
                        <th>Fecha Fabricación</th>
                        <th>Fecha Vencimiento</th>
                        <th>Cantidad</th>
                    </tr>
                    ${data.map(l => `
                        <tr>
                            <td>${l.numero}</td>
                            <td>${l.producto}</td>
                            <td>${new Date(l.fecha_fabricacion).toLocaleDateString('es-DO')}</td>
                            <td>${new Date(l.fecha_vencimiento).toLocaleDateString('es-DO')}</td>
                            <td>${l.cantidad}</td>
                        </tr>
                    `).join("")}
                </table>
            `;
        }

        // LOTES RETIRADOS
        // ==========================
        else if (tipo === "lotes-retirados") {

            if (data.length === 0) {
                html += `
            <p style="color: #999; text-align:center; padding:20px;">
                ➡️ No hay lotes retirados
            </p>
        `;
            }

            html += `
        <p>Total de lotes retirados: ${data.length}</p>
        <table class="report-table">
            <tr>
                <th>N° Lote</th>
                <th>Producto</th>
                <th>Fecha</th>
                <th>Motivo de retiro</th>
            </tr>
            ${data.map(l => `
                <tr>
                    <td>${l.numero}</td>
                    <td>${l.producto}</td>
                    <td>${new Date(l.fecha_fabricacion).toLocaleDateString('es-DO')}</td>
                    <td>${l.motivo_retiro || "Sin descripción"}</td>
                </tr>
            `).join("")}
        </table>
    `;
        }

        // EVENTOS POR PERÍODO
        // ==========================
        else if (tipo === "eventos-periodo") {

            if (data.length === 0) {
                html += `
            <p style="color: #999; text-align:center; padding:20px;">
                📆 No hay eventos por períodos 
            </p>
        `;
            }

            html += `
        <p>Total de eventos: ${data.length}</p>
        <table class="report-table">
            <tr>
                <th>Código</th>
                <th>Lote</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Gravedad</th>
                <th>Estado</th> 
            </tr>
            ${data.map(e => `
                <tr style="${e.eliminado == 1 ? 'background-color:#ffe5e5; color:#b30000;' : ''}">
                    <td>${e.codigo}</td>
                    <td>${e.numero}</td>
                    <td>${e.producto}</td>
                    <td>${e.tipo}</td>
                    <td>${new Date(e.fecha).toLocaleDateString('es-DO')}</td>
                    <td>${e.gravedad}</td>
                    <td>
                        ${e.eliminado == 1
                    ? "Inactivo"
                    : (e.lote_estado === "Retirado" ? "Retirado" : "Activo")
                }
                      </td>
                </tr>
            `).join("")}
        </table>
    `;
        }
        // PRODUCTOS POR PROVEEDOR
        // ==========================
        else if (tipo === "productos") {

            if (data.length === 0) {
                html += `
            <p style="color: #999; text-align:center; padding:20px;">
                📦🏭 No hay productos por proveedor
            </p>
        `;
            }
            html += `
        <p>Relación de productos por proveedor</p>
        <table class="report-table">
            <tr>
                <th>Proveedor</th>
                <th>Producto</th>
                <th>Total</th>
            </tr>
            ${data.map(p => `
                <tr>
                    <td>${p.proveedor}</td>
                    <td>${p.producto}</td>
                    <td>${p.total}</td>
                </tr>
            `).join("")}
        </table>
    `;
        }

        // PRODUCTOS EN INVESTIGACION

        else if (tipo === "eventos-investigacion") {

            if (data.length === 0) {
                html += `
            <p style="color: #999; text-align:center; padding:20px;">
                🔍 No hay eventos en investigación
            </p>
        `;
            }
            html += `
        <p>Total de eventos en investigación: ${data.length}</p>
        <table class="report-table">
            <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Gravedad</th>
                <th>Estado</th>
            </tr>
            ${data.map(e => `
                <tr>
                    <td>${e.codigo}</td>
                    <td>${e.tipo}</td>
                    <td>${new Date(e.fecha).toLocaleDateString('es-DO')}</td>
                    <td>${e.gravedad}</td>
                    <td>${e.estado}</td>
                </tr>
            `).join("")}
        </table>
    `;
        }
        // Eventos pendientes

        else if (tipo === "eventos-pendientes") {

            if (data.length === 0) {
                html += `
        <p style="color: #999; text-align:center; padding:20px;">
            📌 No hay eventos pendientes
        </p>`;
            }

            html += `
        <p>Total de eventos pendientes: ${data.length}</p>
        <table class="report-table">
            <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Gravedad</th>
                <th>Estado</th>
            </tr>
            ${data.map(e => `
                <tr>
                    <td>${e.codigo}</td>
                    <td>${e.tipo}</td>
                    <td>${new Date(e.fecha).toLocaleDateString('es-DO')}</td>
                    <td>${e.gravedad}</td>
                    <td>${e.estado || "Pendiente"}</td>
                </tr>
            `).join("")}
        </table>
    `;
        }


        // Eventos presueltos
        else if (tipo === "eventos-resueltos") {

            if (data.length === 0) {
                html += `
        <p style="color: #999; text-align:center; padding:20px;">
            ✅ No hay eventos resueltos
        </p>`;
            }

            html += `
        <p>Total de eventos resueltos: ${data.length}</p>
        <table class="report-table">
            <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Gravedad</th>
                <th>Estado</th>
            </tr>
            ${data.map(e => `
                <tr>
                    <td>${e.codigo}</td>
                    <td>${e.tipo}</td>
                    <td>${new Date(e.fecha).toLocaleDateString('es-DO')}</td>
                    <td>${e.gravedad}</td>
                    <td>${e.estado}</td>
                </tr>
            `).join("")}
        </table>
    `;
        }



        contenedor.innerHTML = html;
        box.style.display = "block";

    } catch (error) {
        console.error(error);
        alert("Error generando reporte");
    }
});

//======Funcion Cargar evento lote============
async function cargarEventosLote(id) {
    try {
        const res = await fetch(`${API_URL}/eventos`);
        const eventos = await res.json();

        const tbody = document.querySelector("#eventos-lote-table tbody");
        tbody.innerHTML = "";

        const filtrados = eventos.filter(e => e.lote_id == id);

        if (filtrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">
                        No hay eventos para este lote
                    </td>
                </tr>
            `;
            return;
        }

        filtrados.forEach(e => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${e.codigo}</td>
                <td>${e.tipo}</td>
                <td>${new Date(e.fecha).toLocaleDateString('es-ES')}</td>
                <td>${e.gravedad}</td>
                <td>${e.estado || "Pendiente"}</td>
                 <td>
                   <button class="btn" onclick="verDetalleEvento(${e.id})">
                   Ver
                 </button>
                 </td>
            `;

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Error cargando eventos del lote:", error);
    }
}


//======Funcion ver detalles evento============
async function verDetalleEvento(id) {
    try {
        // ✅ GUARDAR ESTADO GLOBAL
        eventoActualId = id;

        const res = await fetch(`${API_URL}/eventos`);
        const eventos = await res.json();

        const evento = eventos.find(e => e.id == id);

        if (!evento) {
            alert("Evento no encontrado");
            return;
        }

        // MOSTRAR ACCIONES
        document.getElementById("acciones-evento").style.display = "block";

        // Título
        document.getElementById("evento-id").innerText = evento.codigo;

        // INFO
        document.getElementById("evento-info-container").innerHTML = `
            <div class="grid-lote">
                <div class="card-box">
                    <strong>Lote</strong>
                    <span>${evento.numero}</span>
                </div>

                <div class="card-box">
                    <strong>Tipo</strong>
                    <span>${evento.tipo}</span>
                </div>

                <div class="card-box">
                    <strong>Fecha</strong>
                    <span>${new Date(evento.fecha).toLocaleDateString()}</span>
                </div>

                <div class="card-box">
                    <strong>Gravedad</strong>
                    <span>${evento.gravedad}</span>
                </div>

                <div class="card-box full">
                    <strong>Estado</strong>
                    <span>${evento.estado || "Pendiente"}</span>
                </div>
            </div>
        `;

        // ROL
        const rol = sessionStorage.getItem("rol");

        if (rol === "asistente") {
            document.getElementById("eliminar-evento-btn").style.display = "none";
        } else {
            document.getElementById("eliminar-evento-btn").style.display = "inline-block";
        }

        // DESCRIPCIÓN
        document.getElementById("evento-descripcion").innerText =
            evento.descripcion || "Sin descripción";


        // historial protegido 
        try {
            if (typeof cargarHistorialEvento === "function") {
                await cargarHistorialEvento(id);
            }
        } catch (error) {
            console.error("Error cargando historial:", error);
        }

        showTab("detalle-evento");

    } catch (error) {
        console.error(error);
        alert("Error cargando evento");
    }
}


// MOSTRAR RANGO DE FECHAS (REPORTES)
// ===============================
document.getElementById("tipo-reporte").addEventListener("change", function () {
    const rango = document.getElementById("rango-fechas");

    if (this.value === "eventos-periodo") {
        rango.style.display = "flex";
    } else {
        rango.style.display = "none";
    }
});


// ===============================
// EDITAR EVENTO
// ===============================
async function editarEvento(id) {
    try {
        const res = await fetch(`${API_URL}/eventos`);
        const eventos = await res.json();

        const evento = eventos.find(e => e.id == id);

        if (!evento) {
            alert("Evento no encontrado");
            return;
        }
        //  OCULTAR BOTONES DE ACCIONES
        document.getElementById("acciones-evento").style.display = "none";

        document.getElementById("evento-id").innerText = evento.codigo;

        document.getElementById("evento-info-container").innerHTML = `
            <div class="grid-lote">

                <div class="card-box">
                    <strong>Tipo</strong>
                    <select id="edit-tipo">
                        <option value="retiro" ${evento.tipo === "retiro" ? "selected" : ""}>Retiro</option>
                        <option value="reclamo" ${evento.tipo === "reclamo" ? "selected" : ""}>Reclamo</option>
                        <option value="defecto" ${evento.tipo === "defecto" ? "selected" : ""}>Defecto</option>
                        <option value="otros" ${evento.tipo === "otros" ? "selected" : ""}>Otros</option>
                    </select>
                </div>

                <div class="card-box">
                    <strong>Gravedad</strong>
                    <select id="edit-gravedad">
                        <option value="baja" ${evento.gravedad === "baja" ? "selected" : ""}>Baja</option>
                        <option value="media" ${evento.gravedad === "media" ? "selected" : ""}>Media</option>
                        <option value="alta" ${evento.gravedad === "alta" ? "selected" : ""}>Alta</option>
                        <option value="critica" ${evento.gravedad === "critica" ? "selected" : ""}>Crítica</option>
                    </select>
                </div>

                <div class="card-box full">
                    <strong>Descripción</strong>
                    <textarea id="edit-descripcion">${evento.descripcion || ""}</textarea>
                </div>

            </div>

            <div style="margin-top:20px; display:flex; gap:10px;">
                <button class="btn btn-success" onclick="guardarEdicionEvento(${id})">
                    Guardar
                </button>

                <button class="btn btn-danger" onclick="showTab('resumen')">
                   Cancelar
                </button>
            </div>
        `;

        showTab("detalle-evento");

    } catch (error) {
        console.error(error);
        alert("Error cargando evento");
    }
}

// ===============================
// GUARDAR EDICIÓN EVENTO
// ===============================
async function guardarEdicionEvento(id) {
    const data = {
        tipo: document.getElementById("edit-tipo").value,
        descripcion: document.getElementById("edit-descripcion").value,
        gravedad: document.getElementById("edit-gravedad").value,
        usuario: sessionStorage.getItem("usuario")
    };

    try {
        const res = await fetch(`${API_URL}/eventos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.text();
            console.error("ERROR BACKEND:", error);
            alert("Error actualizando evento ❌" + error);
            return;
        }

        alert("Evento actualizado correctamente ✅");

        loadRecentEventos();
        showTab("resumen");

    } catch (error) {
        console.error(error);
        alert("Error guardando cambios");
    }
}


//funcion formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return "";

    const f = new Date(fecha);

    // Si no es fecha válida, devuelve el valor original
    if (isNaN(f)) return fecha;

    return f.toLocaleDateString("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatearFechaHora(fecha) {
    if (!fecha) return "";

    const f = new Date(fecha);

    if (isNaN(f)) return fecha;

    return f.toLocaleString("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}



// ===============================
// VER HISTORIAL EVENTO
// ===============================
async function cargarHistorialEvento(id) {
    try {
        const res = await fetch(`${API_URL}/eventos/historial/${id}`);
        const historial = await res.json();

        const contenedor = document.getElementById("historial-evento");

        if (historial.length === 0) {
            contenedor.innerHTML = "<p>Sin cambios registrados</p>";
            return;
        }

        contenedor.innerHTML = `
             <table class="report-table">
        <tr>
            <th>Campo</th>
            <th>Antes</th>
            <th>Después</th>
            <th>Usuario</th>
            <th>Fecha</th>
        </tr>
        ${historial.map(h => `
            <tr>
                <td>${h.campo}</td>
                <td>${h.valor_anterior}</td>
                <td>${h.valor_nuevo}</td>
                <td>${h.usuario || "Sistema"}</td>
                <td>${new Date(h.fecha).toLocaleString()}</td>
            </tr>
        `).join("")}
    </table>
        `;

    } catch (error) {
        console.error(error);
    }
}

// ===============================
// Cargar Historial lote
// ===============================
async function cargarHistorialLote(id) {
    try {
        const res = await fetch(`${API_URL}/lotes/historial/${id}`);
        const historial = await res.json();

        const contenedor = document.getElementById("historial-lote");

        if (historial.length === 0) {
            contenedor.innerHTML = "<p>Sin cambios registrados</p>";
            return;
        }

        contenedor.innerHTML = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Campo</th>
                        <th>Antes</th>
                        <th>Después</th>
                        <th>Usuario</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${historial.map(h => {

            //  FORMATEAR FECHAS (CLAVE)
            let antes = h.valor_anterior;
            let despues = h.valor_nuevo;

            if (h.campo.includes("fecha")) {
                antes = new Date(antes).toLocaleDateString('es-DO');
                despues = new Date(despues).toLocaleDateString('es-DO');
            }

            return `
                        <tr>
                            <td>${h.campo}</td>
                            <td>${antes}</td>
                            <td>${despues}</td>
                            <td>${h.usuario || "Sistema"}</td>
                            <td>${new Date(h.fecha).toLocaleString('es-DO')}</td>
                        </tr>
                        `;
        }).join("")}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error(error);
    }
}

// HISTORIAL LOTES
async function cargarHistorialGlobal() {

    const resLotes = await fetch(`${API_URL}/historial/lotes`);
    const lotes = await resLotes.json();

    const tbodyLotes = document.querySelector("#tabla-historial-lotes tbody");
    tbodyLotes.innerHTML = "";

    lotes.forEach(h => {
        tbodyLotes.innerHTML += `
        <tr>
            <td>${h.numero}</td>
            <td>${h.producto}</td>
            <td>${h.campo}</td>
            <td>
    ${h.campo.includes("fecha")
                ? new Date(h.valor_anterior).toLocaleDateString('es-DO')
                : h.valor_anterior}
</td>

<td>
    ${h.campo.includes("fecha")
                ? new Date(h.valor_nuevo).toLocaleDateString('es-DO')
                : h.valor_nuevo}
</td>
            <td>${h.usuario}</td>
            <td>${formatearFechaHora(h.fecha)}</td>
        </tr>
    `;
    });

    //HISTORIAL EVENTOS
    const resEventos = await fetch(`${API_URL}/historial/eventos`);
    const eventos = await resEventos.json();

    const tbodyEventos = document.querySelector("#tabla-historial-eventos tbody");
    tbodyEventos.innerHTML = "";

    eventos.forEach(h => {
        tbodyEventos.innerHTML += `
            <tr>
                <td>${h.codigo}</td>
                <td>${h.numero}</td>
                <td>${h.producto}</td>
                <td>${h.campo}</td>
                <td>${h.valor_anterior}</td>
                <td>${h.valor_nuevo}</td>
                <td>${h.usuario}</td>
                <td>${new Date(h.fecha).toLocaleString()}</td>
            </tr>
        `;
    });
}

//PERSISTENCIA EN EL Login
document.addEventListener("DOMContentLoaded", () => {
    const usuario = sessionStorage.getItem("usuario")
    const rol = sessionStorage.getItem("rol")

    if (usuario && rol) {
        document.getElementById("bienvenida").innerHTML = `
            Bienvenido, ${usuario}
            <span style="
                background:#e74c3c;
                color:white;
                padding:4px 8px;
                border-radius:5px;
                margin-left:8px;
                font-size:12px;
            ">
                ${rol.toUpperCase()}
            </span>
        `;

        // mantener sesión activa visualmente
        document.getElementById("login-page").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");

        loadRecentLotes();
        loadRecentEventos();
    }
});

// Permisos roles

function aplicarPermisos() {
    const rol = sessionStorage.getItem("rol")

    const menu = document.querySelectorAll(".menu-link");

    menu.forEach(link => {
        const tab = link.getAttribute("data-tab");

        // RESET
        link.style.display = "block";

        // ASISTENTE
        if (rol === "asistente") {
            if (!["resumen", "registrar-lote", "registrar-evento"].includes(tab)) {
                link.style.display = "none";
            }
        }

        // SUPERVISOR
        if (rol === "supervisor") {
            if (tab === "configuracion") {
                link.style.display = "none";
            }
        }

        // OCULTAR SEGÚN ROL
        if (rol !== "admin" && tab === "agregar") {
            link.style.display = "none";
        }
    });

    // ===============================
    //  BLOQUEAR ELIMINAR (LOTE)
    // ===============================
    const comboLote = document.getElementById("acciones-combo");

    if (comboLote && rol === "asistente") {
        [...comboLote.options].forEach(op => {
            if (op.value === "eliminar") {
                op.remove();
            }
        });
    }

    // ===============================
    // o BLOQUEAR ELIMINAR (EVENTO)
    // ===============================
    const comboEvento = document.getElementById("acciones-evento-combo");

    if (comboEvento && rol === "asistente") {
        [...comboEvento.options].forEach(op => {
            if (op.value === "eliminar") {
                op.remove();
            }
        });
    }
}
// ===============================
// CREAR USUARIO
// ===============================
document.getElementById("form-crear-usuario").addEventListener("submit", async function (e) {
    e.preventDefault();

    const password = document.getElementById("new-password").value;
    const confirm = document.getElementById("confirm-password").value;

    if (password !== confirm) {
        alert("❌ Las contraseñas no coinciden");
        return;
    }

    const data = {
        username: document.getElementById("new-username").value,
        email: document.getElementById("new-email").value,
        nombre: document.getElementById("new-nombre").value,
        rol: document.getElementById("new-rol").value,
        password: password,
        activo: document.getElementById("new-activo").checked
    };

    try {
        const res = await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (!res.ok) {
            alert(result.error || "Error creando usuario");
            return;
        }

        alert("✅ Usuario creado correctamente");
        this.reset();

    } catch (error) {
        console.error(error);
        alert("Error conectando con el servidor");
    }
});

// ===============================
// toggleUsuario
// ===============================

async function toggleUsuario(id, estadoActual) {
    const nuevoEstado = Number(estadoActual) === 1 ? 0 : 1;

    try {
        const res = await fetch(`${API_URL}/usuarios/estado/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "rol": sessionStorage.getItem("rol") //  seguridad
            },
            body: JSON.stringify({ activo: nuevoEstado })
        });

        const data = await res.json();

        alert(data.mensaje);

        cargarUsuarios(); //  refresca tabla

    } catch (error) {
        console.error(error);
        alert("Error cambiando estado");
    }
}




// ===============================
// CARGAR USUARIOS
// ===============================
async function cargarUsuarios() {
    try {
        const res = await fetch(`${API_URL}/usuarios`);
        usuarios = await res.json();

        const tbody = document.querySelector("#usuarios-table tbody");
        tbody.innerHTML = "";

        usuarios.forEach(u => {
            const activo = Number(u.activo);

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${u.username}</td>
                <td>${u.rol}</td>

                <td>
                    <span style="
                        padding:5px 10px;
                        border-radius:5px;
                        color:white;
                        background:${activo ? '#27ae60' : '#e73c3c'};
                    ">
                        ${activo ? "Activo" : "Inactivo"}
                    </span>
                </td>

                <td class="acciones">

                    <!-- Editar (PROTEGIDO ADMIN) -->
                          ${u.rol !== "admin" ? `
                            <button class="btn btn-primary" onclick="editarUsuario(${u.id})">
                              Editar
                           </button>
                        ` : `
                      <span style="
                        color:gray;
                        font-size:12px;
                        display:flex;
                        align-items:center;
                         ">
                     🔒 Protegido
                           </span>
                      `}

                   ${u.rol !== "admin" ? `
                      <button class="btn ${activo ? 'btn-warning' : 'btn-success'}"
                      onclick="toggleUsuario(${u.id}, ${activo})">
                     ${activo ? "Desactivar" : "Activar"}
                    </button>
                    ` : `
                    <span style="color:gray;">🔒 Protegido</span>
                     `}

                    <!-- ELIMINAR (PROTEGIDO ADMIN) -->
                    ${u.rol !== "admin" ? `
                        <button class="btn btn-danger"
                            onclick="eliminarUsuario(${u.id})">
                            Eliminar
                        </button>
                    ` : `
                        <span style="
                            color:gray;
                            font-size:12px;
                            display:flex;
                            align-items:center;
                        ">
                            🔒 Protegido
                        </span>
                    `}


                </td>
            `;

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}
// ===============================
// CAMBIAR ESTADO USUARIO
// ===============================
async function cambiarEstadoUsuario(id, estadoActual) {
    const nuevoEstado = estadoActual === 1 ? 0 : 1;

    try {
        const res = await fetch(`${API_URL}/usuarios/estado/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ activo: nuevoEstado })
        });

        const data = await res.json();

        alert(data.mensaje);

        cargarUsuarios(); // refresca la tabla

    } catch (error) {
        console.error(error);
        alert("Error cambiando estado");
    }
}

// ===============================
// ELIMINAR  USUARIO
// ===============================
async function eliminarUsuario(id) {
    const confirmar = confirm("¿Seguro que deseas eliminar este usuario?");
    if (!confirmar) return;

    try {
        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            method: "DELETE",
            headers: {
                "rol": sessionStorage.getItem("rol")
            }
        });

        if (!res.ok) {
            alert("No tienes permisos ❌");
            return;
        }

        alert("Usuario eliminado correctamente ✅");

        cargarUsuarios();

    } catch (error) {
        console.error(error);
        alert("Error eliminando usuario ❌");
    }
}

// ===============================
// Recuperacion contraseña
// ===============================
function mostrarRecuperacion() {
    const username = prompt("Ingresa tu usuario:");
    const email = prompt("Ingresa tu correo:");

    if (!username || !email) return;

    fetch(`${API_URL}/recuperar-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, email })
    })
        .then(res => res.json())
        .then(data => {
            alert(data.mensaje);
        })
        .catch(err => {
            console.error(err);
            alert("Error conectando con el servidor");
        });
}

// ===============================
// Cargar configuracion
// ===============================
async function cargarConfiguracion() {
    try {
        const res = await fetch(`${API_URL}/configuracion`);
        const config = await res.json();

        document.getElementById("notificaciones").checked = config.notificaciones;
        document.getElementById("dias-alerta").value = config.dias_alerta;

    } catch (error) {
        console.error("Error cargando configuración:", error);
    }
}

// ===============================
// Guardar  configuracion
// ===============================

document.getElementById("form-configuracion").addEventListener("submit", async function (e) {
    e.preventDefault();

    const data = {
        notificaciones: document.getElementById("notificaciones").checked,
        dias_alerta: document.getElementById("dias-alerta").value
    };

    try {
        await fetch(`${API_URL}/configuracion`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        alert("Configuración guardada ✅");

    } catch (error) {
        console.error(error);
        alert("Error guardando configuración");
    }
});



//Alertas
async function cargarAlertas() {
    try {
        const res = await fetch(`${API_URL}/lotes`);
        const lotes = await res.json();

        const hoy = new Date();
        let alertas = [];

        lotes.forEach(l => {
            const vencimiento = new Date(l.fecha_vencimiento);
            const diff = (vencimiento - hoy) / (1000 * 60 * 60 * 24);

            if (diff <= 30) {
                alertas.push({
                    mensaje: `Lote ${l.numero} vence en ${Math.ceil(diff)} días`,
                    critica: diff <= 7
                });
            }
        });

        // CONTADOR
        const contador = document.getElementById("contador-alertas");

        if (alertas.length > 0) {
            contador.style.display = "inline-block";
            contador.innerText = alertas.length;
        } else {
            contador.style.display = "none";
        }

        // GUARDAR GLOBAL
        window.alertasGlobal = alertas;

    } catch (error) {
        console.error("Error cargando alertas:", error);
    }
}

//Click campana
document.getElementById("campana").addEventListener("click", function () {
    const panel = document.getElementById("panel-alertas");

    if (panel.style.display === "none") {
        mostrarAlertas();
        panel.style.display = "block";
    } else {
        panel.style.display = "none";
    }
});


//Mostrar alertas
function mostrarAlertas() {
    const panel = document.getElementById("panel-alertas");

    if (!window.alertasGlobal || window.alertasGlobal.length === 0) {
        panel.innerHTML = "<p style='padding:10px; color:black;'>No hay alertas</p>";
        return;
    }

    panel.innerHTML = "";

    window.alertasGlobal.forEach(a => {
        panel.innerHTML += `
            <div style="
                padding:10px;
                border-bottom:1px solid #eee;
                color:${a.critica ? 'red' : 'black'};
                font-weight:${a.critica ? 'bold' : 'normal'};
            ">
                ${a.mensaje}
            </div>
        `;
    });
}

// ===============================
// EVENTO COMBO ACCIONES LOTE
// ===============================
document.addEventListener("change", (e) => {
    if (e.target.id === "acciones-combo") {

        const accion = e.target.value;

        if (!accion) return;


        accionSeleccionadaLote = accion;
    }
});



// FUNCIÓN BOTÓN GUARDAR

async function ejecutarAccionLote() {

    if (!accionSeleccionadaLote) {
        alert("Seleccione una acción primero");
        return;
    }

    try {
        if (accionesLote[accionSeleccionadaLote]) {
            await accionesLote[accionSeleccionadaLote]();
        }

        // limpiar combo
        document.getElementById("acciones-combo").value = "";
        accionSeleccionadaLote = null;

    } catch (error) {
        console.error(error);
        alert("Error ejecutando acción");
    }
}
// FUNCIÓN BOTÓN CANCELAR
function cancelarAccionLote() {
    document.getElementById("acciones-combo").value = "";
    accionSeleccionadaLote = null;
}




// ===============================
// EVENTO COMBO ACCIONES EVENTO
// ===============================
document.addEventListener("change", (e) => {
    if (e.target.id === "acciones-evento-combo") {

        const accion = e.target.value;
        if (!accion) return;

        accionSeleccionadaEvento = accion;
    }
});

// ===============================
// BOTÓN GUARDAR EVENTO
// ===============================
async function ejecutarAccionEvento() {

    if (!accionSeleccionadaEvento) {
        alert("Seleccione una acción primero");
        return;
    }

    try {
        if (accionesEvento[accionSeleccionadaEvento]) {
            await accionesEvento[accionSeleccionadaEvento]();
        }

        // limpiar
        document.getElementById("acciones-evento-combo").value = "";
        accionSeleccionadaEvento = null;

    } catch (error) {
        console.error(error);
        alert("Error ejecutando acción");
    }
}


// ===============================
// BOTÓN CANCELAR EVENTO
// ===============================
function cancelarAccionEvento() {
    document.getElementById("acciones-evento-combo").value = "";
    accionSeleccionadaEvento = null;
}



// ===============================
// Funcion editar usuario
// ===============================
function editarUsuario(id) {
    const usuario = usuarios.find(u => u.id === id);

    document.getElementById("edit-id").value = usuario.id;
    document.getElementById("edit-username").value = usuario.username;
    document.getElementById("edit-email").value = usuario.email;
    document.getElementById("edit-nombre").value = usuario.nombre;
    document.getElementById("edit-rol").value = usuario.rol;
    document.getElementById("edit-activo").checked = Number(usuario.activo) === 1;

    document.getElementById("modal-editar").classList.remove("hidden");
}

function cerrarModal() {
    document.getElementById("modal-editar").classList.add("hidden");
}

// Funcion
// ===============================
async function guardarEdicion() {
    try {
        const id = document.getElementById("edit-id").value;

        const data = {
            username: document.getElementById("edit-username").value,
            email: document.getElementById("edit-email").value,
            nombre: document.getElementById("edit-nombre").value,
            rol: document.getElementById("edit-rol").value,
            activo: document.getElementById("edit-activo").checked
        };

        console.log("Enviando datos:", data);

        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "rol": sessionStorage.getItem("rol")
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        console.log("Respuesta servidor:", result);

        if (!res.ok) {
            alert(result.error || "Error actualizando ❌");
            return;
        }

        alert("Usuario actualizado correctamente ✅");

        cerrarModal();
        cargarUsuarios();

    } catch (error) {
        console.error("ERROR:", error);
        alert("Error conectando con el servidor ❌");
    }
}