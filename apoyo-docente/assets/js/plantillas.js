/* =========================================================
   Apoyo Docente — catálogo de materiales que se pueden pedir
   Define los tipos de material, los datos que conviene pedir para cada
   uno y arma el resumen del pedido que viaja por WhatsApp.
   NO genera documentos: el material lo elabora la profesional.
   Se usa en la página (window.Plantillas) y en las pruebas (Node).
   ========================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Plantillas = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const o = (v, alt) => (v && String(v).trim()) || alt;

  const CAMPOS_BASE = [
    { id: "area", etiqueta: "Asignatura o área", tipo: "text", placeholder: "Ej.: Matemáticas", requerido: true },
    { id: "grado", etiqueta: "Grado", tipo: "text", placeholder: "Ej.: 5°", requerido: true },
    { id: "tema", etiqueta: "Tema", tipo: "text", placeholder: "Ej.: Fracciones equivalentes", requerido: true },
    { id: "objetivo", etiqueta: "Objetivo de aprendizaje", tipo: "textarea", placeholder: "Lo que el estudiante debe lograr al final" },
    { id: "duracion", etiqueta: "Duración", tipo: "text", placeholder: "Ej.: 2 horas de clase" }
  ];

  const TIPOS = {
    plan: {
      nombre: "Plan de clase", descripcion: "Inicio, desarrollo y cierre por sesión, con recursos y evaluación.",
      campos: [...CAMPOS_BASE, { id: "sesiones", etiqueta: "Número de sesiones", tipo: "number", valor: 3, min: 1, max: 10 }]
    },
    guia: {
      nombre: "Guía de aprendizaje", descripcion: "Para trabajo autónomo o en casa, con explicación y actividades.",
      campos: CAMPOS_BASE
    },
    taller: {
      nombre: "Taller", descripcion: "Actividades graduadas para trabajar en clase, individual o en grupo.",
      campos: [...CAMPOS_BASE, { id: "actividades", etiqueta: "Número de actividades", tipo: "number", valor: 4, min: 1, max: 12 }, { id: "modalidad", etiqueta: "Modalidad", tipo: "select", opciones: ["Individual", "En parejas", "En grupos", "Mixta"] }]
    },
    evaluacion: {
      nombre: "Evaluación", descripcion: "Prueba con desempeños, ítems por partes y lista de cotejo.",
      campos: [...CAMPOS_BASE, { id: "preguntas", etiqueta: "Número de preguntas", tipo: "number", valor: 6, min: 1, max: 30 }, { id: "formato", etiqueta: "Tipo de preguntas", tipo: "select", opciones: ["Selección múltiple", "Abiertas", "Mixta"] }]
    },
    rubrica: {
      nombre: "Rúbrica", descripcion: "Criterios por niveles, ajustada a la escala de tu institución.",
      campos: [...CAMPOS_BASE.filter((c) => c.id !== "duracion"), { id: "criterios", etiqueta: "Criterios (uno por línea)", tipo: "textarea", placeholder: "Dominio del tema\nOrganización\nExpresión oral" }, { id: "escala", etiqueta: "Niveles", tipo: "select", opciones: ["Superior / Alto / Básico / Bajo", "Excelente / Bueno / Aceptable / Insuficiente", "4 / 3 / 2 / 1"] }]
    },
    actividad: {
      nombre: "Actividad diferenciada", descripcion: "La misma meta en tres niveles de apoyo o adaptada según PIAR.",
      campos: CAMPOS_BASE
    },
    refuerzo: {
      nombre: "Material de refuerzo", descripcion: "Repaso guiado para estudiantes que no alcanzaron el desempeño.",
      campos: [...CAMPOS_BASE, { id: "dificultad", etiqueta: "Dificultad observada", tipo: "textarea", placeholder: "Ej.: confunde numerador y denominador" }]
    }
  };

  function validar(tipo, datos) {
    const t = TIPOS[tipo]; if (!t) return ["Tipo de material desconocido."];
    return t.campos.filter((c) => c.requerido && !(datos[c.id] || "").toString().trim()).map((c) => `Falta: ${c.etiqueta}.`);
  }

  /** Arma el resumen del pedido (etiqueta → valor) con solo lo diligenciado. */
  function resumenPedido(tipo, datos = {}) {
    const t = TIPOS[tipo]; if (!t) throw new Error("Tipo de material desconocido: " + tipo);
    const r = { "Nombre / contacto": o(datos.nombre, ""), "Material que necesito": t.nombre };
    t.campos.forEach((c) => { const v = o(datos[c.id], ""); if (v) r[c.etiqueta] = v; });
    if (o(datos.fecha, "")) r["Fecha límite"] = datos.fecha;
    if (o(datos.detalles, "")) r["Detalles, en mis palabras"] = datos.detalles.trim();
    return Object.fromEntries(Object.entries(r).filter(([, v]) => v));
  }

  return { TIPOS, validar, resumenPedido };
});
