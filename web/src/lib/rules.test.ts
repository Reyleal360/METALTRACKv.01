import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkDelivery,
  checkFinish,
  checkStart,
  isLate,
  lateDays,
  pieceState,
  progressPercent,
} from "./rules";

const s = (position: number, status: string) => ({ position, status });

test("avance: 4 de 5 procesos = 80 %", () => {
  const steps = [s(1, "DONE"), s(2, "DONE"), s(3, "DONE"), s(4, "DONE"), s(5, "IN_PROGRESS")];
  assert.equal(progressPercent(steps), 80);
  assert.equal(progressPercent([]), 0);
});

test("estado de la pieza", () => {
  assert.equal(pieceState([s(1, "PENDING")], false), "PENDING");
  assert.equal(pieceState([s(1, "DONE"), s(2, "PENDING")], false), "IN_PROGRESS");
  assert.equal(pieceState([s(1, "DONE"), s(2, "DONE")], false), "READY");
  assert.equal(pieceState([s(1, "DONE"), s(2, "DONE")], true), "DELIVERED");
  assert.equal(pieceState([], false), "PENDING");
});

test("atraso: solo si pasó la fecha y no está entregada", () => {
  const now = new Date(2026, 10, 20, 15, 0);
  assert.equal(isLate(new Date(2026, 10, 19), false, now), true);
  assert.equal(isLate(new Date(2026, 10, 20), false, now), false);
  assert.equal(isLate(new Date(2026, 10, 19), true, now), false);
  assert.equal(lateDays(new Date(2026, 10, 17), now), 3);
});

test("RN-06: no se inicia un proceso sin terminar el anterior", () => {
  const steps = [s(1, "DONE"), s(2, "PENDING"), s(3, "PENDING")];
  assert.equal(checkStart(steps, 2, false).ok, true);
  assert.equal(checkStart(steps, 3, false).ok, false);
});

test("RN-13: un proceso en curso bloquea el siguiente", () => {
  const steps = [s(1, "IN_PROGRESS"), s(2, "PENDING")];
  assert.equal(checkStart(steps, 2, false).ok, false);
});

test("RN-05: no se finaliza un proceso no iniciado", () => {
  const steps = [s(1, "PENDING"), s(2, "IN_PROGRESS"), s(3, "DONE")];
  assert.equal(checkFinish(steps, 1, false).ok, false);
  assert.equal(checkFinish(steps, 2, false).ok, true);
  assert.equal(checkFinish(steps, 3, false).ok, false);
});

test("RN-08 y RN-15: entrega solo con todo terminado y una sola vez", () => {
  assert.equal(checkDelivery([s(1, "DONE"), s(2, "IN_PROGRESS")], false).ok, false);
  assert.equal(checkDelivery([s(1, "DONE"), s(2, "DONE")], false).ok, true);
  assert.equal(checkDelivery([s(1, "DONE"), s(2, "DONE")], true).ok, false);
  assert.equal(checkDelivery([], false).ok, false);
});

test("una pieza entregada no admite cambios", () => {
  const steps = [s(1, "DONE"), s(2, "PENDING")];
  assert.equal(checkStart(steps, 2, true).ok, false);
  assert.equal(checkFinish([s(1, "IN_PROGRESS")], 1, true).ok, false);
});
