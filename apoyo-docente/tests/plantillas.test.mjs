import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const P = require("../assets/js/plantillas.js");

test("existen los 7 tipos de material y cada uno define sus campos", () => {
  assert.deepEqual(Object.keys(P.TIPOS), ["plan", "guia", "taller", "evaluacion", "rubrica", "actividad", "refuerzo"]);
  for (const t of Object.values(P.TIPOS)) { assert.ok(t.nombre && t.descripcion); assert.ok(t.campos.length >= 4); }
});

test("validar exige área, grado y tema", () => {
  assert.deepEqual(P.validar("plan", {}), ["Falta: Asignatura o área.", "Falta: Grado.", "Falta: Tema."]);
  assert.deepEqual(P.validar("plan", { area: "L", grado: "8°", tema: "Crónica" }), []);
  assert.deepEqual(P.validar("otro", {}), ["Tipo de material desconocido."]);
});

test("resumenPedido incluye solo lo diligenciado, con el tipo y los detalles", () => {
  const r = P.resumenPedido("rubrica", { nombre: "Profe Ana", area: "Lenguaje", grado: "8°", tema: "Exposición", criterios: "", escala: "4 / 3 / 2 / 1", detalles: "  Para 35 estudiantes, en el formato del colegio.  ", fecha: "2026-11-20" });
  assert.deepEqual(r, {
    "Nombre / contacto": "Profe Ana", "Material que necesito": "Rúbrica", "Asignatura o área": "Lenguaje", "Grado": "8°",
    "Tema": "Exposición", "Niveles": "4 / 3 / 2 / 1", "Fecha límite": "2026-11-20", "Detalles, en mis palabras": "Para 35 estudiantes, en el formato del colegio."
  });
});

test("el módulo no genera documentos", () => {
  assert.equal(typeof P.generar, "undefined");
  assert.equal(typeof P.documentoHtml, "undefined");
});
