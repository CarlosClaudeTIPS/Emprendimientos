import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const C = require("../assets/js/calculadora.js");

test("formato colombiano", () => {
  assert.equal(C.cop(50000), "$50.000"); assert.equal(C.cop(1250000), "$1.250.000"); assert.equal(C.cop(900), "$900");
});

test("caso 1: 1 guía sin extras → entre $50.000 y $65.000", () => {
  const r = C.calcular({ items: [{ clave: "guia", cantidad: 1 }] });
  assert.equal(r.desde, 50000); assert.equal(r.hasta, 65000); assert.equal(r.minimoAplicado, false);
});

test("caso 2: planeaciones de periodo para 2 grados + 1 evaluación → entre $194.000 y $255.000", () => {
  const r = C.calcular({ items: [{ clave: "plan_per", cantidad: 2 }, { clave: "eval", cantidad: 1 }] });
  assert.equal(r.descuentoPlan, 16000); assert.equal(r.subtotal, 194000); assert.equal(r.desde, 194000); assert.equal(r.hasta, 255000);
});

test("caso 3: 1 rúbrica con entrega mañana → entre $36.000 y $50.000", () => {
  const hoy = new Date(2026, 9, 21, 10, 0, 0);
  const r = C.calcular({ items: [{ clave: "rubrica", cantidad: 1 }], fecha: "2026-10-22" }, hoy);
  assert.equal(r.urgente, true); assert.equal(r.urgencia, 6000); assert.equal(r.desde, 36000); assert.equal(r.hasta, 50000);
});

test("descuento del 15 % con 3 grados o más", () => {
  const r = C.calcular({ items: [{ clave: "plan_per", cantidad: 3 }] });
  assert.equal(r.subtotal, 204000); assert.equal(r.descuentoPlan, 36000);
});

test("planeación semanal multiplica semanas por grados", () => {
  const r = C.calcular({ items: [{ clave: "plan_sem", cantidad: 2, grados: 3 }] });
  assert.equal(r.subtotal, 210000);
});

test("revisiones extra, complejidad y redondeo hacia arriba a 1.000", () => {
  const r = C.calcular({ items: [{ clave: "adaptar", cantidad: 1 }], revisionesExtra: 2, complejidad: true });
  // 25.000 + 20.000 + 6.250 = 51.250 → 52.000
  assert.equal(r.revisiones, 20000); assert.equal(r.complejidad, 6250); assert.equal(r.desde, 52000); assert.equal(r.hasta, 70000);
});

test("pedido mínimo de $30.000", () => {
  const r = C.calcular({ items: [{ clave: "adaptar", cantidad: 1 }] });
  assert.equal(r.desde, 30000); assert.equal(r.minimoAplicado, true);
});

test("sin trabajos no hay rango", () => {
  const r = C.calcular({ items: [] }); assert.equal(r.vacio, true); assert.equal(r.desde, 0); assert.equal(r.hasta, 0);
});

test("urgencia: menos de 48 horas, contando hasta el final del día", () => {
  const hoy = new Date(2026, 9, 21, 10, 0, 0);
  assert.equal(C.esUrgente("2026-10-22", hoy), true);
  assert.equal(C.esUrgente("2026-10-23", hoy), false);
  assert.equal(C.esUrgente("", hoy), false);
});

test("mensaje de WhatsApp con el formato acordado", () => {
  const pedido = { items: [{ clave: "guia", cantidad: 2 }], revisionesExtra: 1, complejidad: false, fecha: "" };
  const m = C.mensaje("Nivytek", pedido, C.calcular(pedido));
  assert.match(m, /^Hola, quiero una propuesta de Nivytek:\n\n• Guía o taller \(2–4 páginas\) × 2\n\nRevisiones extra: 1\nComplejidad alta: no\nFecha de entrega: flexible\nAproximado de la calculadora: entre \$110\.000 y \$145\.000\n\nGrado y área: $/);
});
