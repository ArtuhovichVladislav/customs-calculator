import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Age, EngineType, calcDutyEur } from '../dist/index.mjs';

// Типы, у которых ДВС механически связан с колёсами (ТН ВЭД 8703 40/50/60/70) —
// обычный легковой автомобиль позиции 8703, единые ставки по возрасту и объёму.
const ICE_LIKE = [
  EngineType.Fuel,
  EngineType.HybridMhev,
  EngineType.HybridHev,
  EngineType.HybridPhev,
];

test('до 3 лет: MAX(процент от стоимости, евро за см³)', () => {
  // Стоимость определяет строку, внутри строки берётся максимум из двух баз.
  assert.equal(calcDutyEur(Age.Under3, 50000, 3000), Math.max(50000 * 0.48, 3000 * 5.5));
  assert.equal(calcDutyEur(Age.Under3, 50000, 3000), 24000);

  // Малый объём при высокой цене — работает процент.
  assert.equal(calcDutyEur(Age.Under3, 8000, 1000), 8000 * 0.54);
  // Большой объём при низкой цене — работает минимум за см³.
  assert.equal(calcDutyEur(Age.Under3, 8000, 4000), 4000 * 2.5);
});

test('до 3 лет: границы стоимостных диапазонов', () => {
  assert.equal(calcDutyEur(Age.Under3, 8500, 100), 8500 * 0.54);
  assert.equal(calcDutyEur(Age.Under3, 8501, 100), 8501 * 0.48);
  assert.equal(calcDutyEur(Age.Under3, 200000, 100), 200000 * 0.48);
});

test('от 3 до 5 лет и старше 5 лет: только евро за см³', () => {
  assert.equal(calcDutyEur(Age.From3To5, 12000, 1600), 1600 * 2.5);
  assert.equal(calcDutyEur(Age.Over5, 12000, 1600), 1600 * 3.5);

  // Стоимость на результат не влияет.
  assert.equal(calcDutyEur(Age.Over5, 999999, 1600), 1600 * 3.5);
});

test('от 3 до 5 лет: границы диапазонов объёма', () => {
  assert.equal(calcDutyEur(Age.From3To5, 0, 1000), 1000 * 1.5);
  assert.equal(calcDutyEur(Age.From3To5, 0, 1001), 1001 * 1.7);
  assert.equal(calcDutyEur(Age.From3To5, 0, 3000), 3000 * 3.0);
  assert.equal(calcDutyEur(Age.From3To5, 0, 3001), 3001 * 3.6);
});

test('engineType необязателен и по умолчанию равен Fuel', () => {
  assert.equal(
    calcDutyEur(Age.Over5, 20000, 1500),
    calcDutyEur(Age.Over5, 20000, 1500, EngineType.Fuel),
  );
});

test('электромобиль: пошлина 0 при любых параметрах', () => {
  for (const age of [Age.Under3, Age.From3To5, Age.Over5]) {
    assert.equal(calcDutyEur(age, 100000, 3000, EngineType.Electric), 0);
  }
});

// Последовательный гибрид классифицируется в ТН ВЭД 8703 80, как электромобиль,
// но тарифная льгота на гибриды не распространяется — отсюда 15% ad valorem.
test('EREV: 15% от стоимости, объём и возраст не влияют', () => {
  for (const age of [Age.Under3, Age.From3To5, Age.Over5]) {
    for (const volume of [900, 1500, 5000]) {
      assert.equal(calcDutyEur(age, 20000, volume, EngineType.HybridErev), 3000);
    }
  }
});

test('MHEV / HEV / PHEV считаются как ДВС', () => {
  for (const age of [Age.Under3, Age.From3To5, Age.Over5]) {
    for (const volume of [900, 1500, 3000, 5000]) {
      for (const price of [5000, 20000, 90000]) {
        const expected = calcDutyEur(age, price, volume, EngineType.Fuel);
        for (const type of ICE_LIKE) {
          assert.equal(calcDutyEur(age, price, volume, type), expected);
        }
      }
    }
  }
});

