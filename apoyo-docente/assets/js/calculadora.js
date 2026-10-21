/* =========================================================
   Apoyo Docente — calculadora de precio estimado
   Toda la configuración de precios está en PRECIOS (abajo): cámbiala sin
   tocar la lógica. Los valores son en pesos colombianos (COP).
   Se usa en la página (window.Calculadora) y en las pruebas (Node).
   ========================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Calculadora = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const PRECIOS = {
    minimo: 30000,                 // pedido mínimo
    revisionExtra: 10000,          // cada revisión adicional (una va incluida)
    complejidad: 0.25,             // recargo por complejidad alta (sobre el subtotal)
    urgencia: 0.20,                // recargo por entrega en menos de 48 horas (sobre el subtotal)
    horasUrgencia: 48,
    redondeo: 1000,                // el total se redondea hacia arriba a este múltiplo
    hastaFactor: 1.3,              // "hasta" = total × factor
    hastaRedondeo: 5000,           // … redondeado hacia arriba a este múltiplo
    descuentoPlanPeriodo: [        // planeaciones de todo un periodo: descuento según grados
      { desdeGrados: 3, descuento: 0.15 },
      { desdeGrados: 2, descuento: 0.10 }
    ],
    trabajos: [
      { clave: "rubrica",   nombre: "Rúbrica",                               base: 30000,  unidad: "rúbrica",      plural: "rúbricas" },
      { clave: "plan_sem",  nombre: "Planeación semanal",                    base: 35000,  unidad: "semana",       plural: "semanas", porGrado: true },
      { clave: "plan_per",  nombre: "Planeaciones de todo un periodo",       base: 80000,  unidad: "grado",        plural: "grados" },
      { clave: "guia",      nombre: "Guía o taller (2–4 páginas)",           base: 50000,  unidad: "guía",         plural: "guías" },
      { clave: "eval",      nombre: "Evaluación con clave (15–20 preguntas)", base: 50000, unidad: "evaluación",   plural: "evaluaciones" },
      { clave: "refuerzo",  nombre: "Material de refuerzo",                  base: 35000,  unidad: "material",     plural: "materiales" },
      { clave: "present",   nombre: "Presentación",                          base: 40000,  unidad: "presentación", plural: "presentaciones" },
      { clave: "informe",   nombre: "Informe",                               base: 30000,  unidad: "informe",      plural: "informes" },
      { clave: "adaptar",   nombre: "Adaptar una actividad",                 base: 25000,  unidad: "actividad",    plural: "actividades" },
      { clave: "mejorar",   nombre: "Mejorar material que ya tienes",        base: 25000,  unidad: "documento",    plural: "documentos" },
      { clave: "piar",      nombre: "PIAR",                                  base: 70000,  unidad: "estudiante",   plural: "estudiantes", aviso: "No envíes nombres ni documentos de identidad del estudiante." },
      { clave: "plan_area", nombre: "Plan de área por periodo",              base: 170000, unidad: "plan",         plural: "planes" }
    ],
    equivalencias: [
      ["«Taller»", "Guía o taller"],
      ["«Examen», «quiz», «prueba»", "Evaluación con clave"],
      ["«Diapositivas»", "Presentación"],
      ["«Nivelación», «plan de mejoramiento»", "Material de refuerzo"],
      ["«Tengo una actividad y quiero ajustarla a mi grupo»", "Adaptar una actividad"],
      ["«Ya lo hice y quiero que quede mejor»", "Mejorar material que ya tienes"],
      ["Planeaciones de unas semanas sueltas", "Planeación semanal (semanas × grados)"],
      ["Planeaciones de todo el periodo", "Planeaciones de todo un periodo (por grado)"],
      ["«Ajustes razonables» o «inclusión» para un estudiante", "PIAR"]
    ]
  };

  const trabajo = (clave) => PRECIOS.trabajos.find((t) => t.clave === clave);
  const arriba = (n, m) => Math.ceil(n / m) * m;
  const entero = (v, min = 0) => { const x = parseInt(v, 10); return Number.isFinite(x) && x >= min ? x : min; };

  /** Formato colombiano: $50.000 */
  function cop(n) { return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  /** ¿La fecha de entrega está a menos de 48 horas? (fecha "AAAA-MM-DD"; se toma el final de ese día) */
  function esUrgente(fecha, ahora = new Date()) {
    if (!fecha) return false;
    const [a, m, d] = String(fecha).split("-").map(Number); if (!a || !m || !d) return false;
    const limite = new Date(a, m - 1, d, 23, 59, 59);
    return (limite - ahora) < PRECIOS.horasUrgencia * 3600 * 1000;
  }

  /**
   * pedido = { items: [{ clave, cantidad, grados? }], revisionesExtra, complejidad, fecha, urgente? }
   * Devuelve el desglose y el rango. No guarda nada.
   */
  function calcular(pedido = {}, ahora = new Date()) {
    const lineas = [];
    let subtotal = 0, descuentoPlan = 0;
    for (const it of pedido.items || []) {
      const t = trabajo(it.clave); if (!t) continue;
      const cantidad = entero(it.cantidad, 0); if (!cantidad) continue;
      const grados = t.porGrado ? Math.max(1, entero(it.grados, 1)) : 1;
      let valor = t.base * cantidad * grados, descuento = 0;
      if (t.clave === "plan_per") {
        const regla = PRECIOS.descuentoPlanPeriodo.find((r) => cantidad >= r.desdeGrados);
        if (regla) { descuento = valor * regla.descuento; valor -= descuento; descuentoPlan += descuento; }
      }
      lineas.push({ clave: t.clave, nombre: t.nombre, cantidad, grados, valor, descuento, unidad: cantidad === 1 ? t.unidad : t.plural });
      subtotal += valor;
    }
    const revisionesExtra = entero(pedido.revisionesExtra, 0);
    const revisiones = revisionesExtra * PRECIOS.revisionExtra;
    const complejidad = pedido.complejidad ? subtotal * PRECIOS.complejidad : 0;
    const urgente = pedido.urgente === true || esUrgente(pedido.fecha, ahora);
    const urgencia = urgente ? subtotal * PRECIOS.urgencia : 0;
    let total = subtotal + revisiones + complejidad + urgencia;
    total = arriba(total, PRECIOS.redondeo);
    const minimoAplicado = lineas.length > 0 && total < PRECIOS.minimo;
    if (minimoAplicado) total = PRECIOS.minimo;
    const hasta = lineas.length ? arriba(total * PRECIOS.hastaFactor, PRECIOS.hastaRedondeo) : 0;
    return { lineas, subtotal, descuentoPlan, revisionesExtra, revisiones, complejidad, urgente, urgencia, total: lineas.length ? total : 0, desde: lineas.length ? total : 0, hasta, minimoAplicado, vacio: !lineas.length };
  }

  /** Mensaje de WhatsApp con el pedido y el aproximado. */
  function mensaje(marca, pedido, r) {
    const items = r.lineas.map((l) => `• ${l.nombre} × ${l.cantidad}${l.grados > 1 ? ` (${l.grados} grados)` : ""}`).join("\n") || "• (sin trabajos seleccionados)";
    return `Hola, quiero una propuesta de ${marca}:\n\n${items}\n\nRevisiones extra: ${r.revisionesExtra}\nComplejidad alta: ${pedido.complejidad ? "sí" : "no"}\nFecha de entrega: ${pedido.fecha || "flexible"}\nAproximado de la calculadora: entre ${cop(r.desde)} y ${cop(r.hasta)}\n\nGrado y área: `;
  }

  return { PRECIOS, calcular, mensaje, cop, esUrgente, trabajo };
});
