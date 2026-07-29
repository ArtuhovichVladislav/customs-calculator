import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Age, PersonType, EngineType, calcUtil } from '../dist/index.mjs';

const HYBRIDS = [
  EngineType.HybridMhev,
  EngineType.HybridHev,
  EngineType.HybridPhev,
  EngineType.HybridErev,
];

test('физлицо: ставка не зависит от типа двигателя и объёма (п. 1.3)', () => {
  for (const type of [EngineType.Fuel, EngineType.Electric, ...HYBRIDS]) {
    for (const volume of [0, 900, 1500, 5000]) {
      assert.equal(calcUtil(PersonType.Individual, type, volume, Age.Under3), 624.92);
      assert.equal(calcUtil(PersonType.Individual, type, volume, Age.Over5), 1282.02);
    }
  }
});

test('юрлицо, электро: фиксированная ставка п. 1.1, объём не влияет', () => {
  for (const volume of [0, 1500, 5000]) {
    assert.equal(calcUtil(PersonType.Legal, EngineType.Electric, volume, Age.Under3), 1229.28);
    assert.equal(calcUtil(PersonType.Legal, EngineType.Electric, volume, Age.Over5), 2950.38);
  }
});

// Регресс: до исправления гибриды не совпадали ни с одной строкой таблицы юрлиц
// и функция возвращала 0. П. 1.1 исключает гибридные установки любого типа,
// поэтому все они идут по п. 1.2 — от объёма ДВС.
test('юрлицо, любой гибрид: ставка п. 1.2 по объёму, а не 0', () => {
  for (const type of HYBRIDS) {
    assert.equal(calcUtil(PersonType.Legal, type, 1500, Age.Under3), 25226.22);
    assert.equal(calcUtil(PersonType.Legal, type, 1500, Age.Over5), 44374.56);
    assert.notEqual(calcUtil(PersonType.Legal, type, 1500, Age.Under3), 0);
  }
});

test('юрлицо: границы диапазонов объёма включают верхнюю границу', () => {
  const at = (volume, age) => calcUtil(PersonType.Legal, EngineType.Fuel, volume, age);

  assert.equal(at(1000, Age.Under3), 6811.16);
  assert.equal(at(1001, Age.Under3), 25226.22);
  assert.equal(at(2000, Age.Under3), 25226.22);
  assert.equal(at(2001, Age.Under3), 70885.91);
  assert.equal(at(3000, Age.Under3), 70885.91);
  assert.equal(at(3001, Age.Under3), 81393.68);
  assert.equal(at(3500, Age.Under3), 81393.68);
  assert.equal(at(3501, Age.Under3), 103649.0);
  assert.equal(at(9999, Age.Under3), 103649.0);

  assert.equal(at(1000, Age.Over5), 17386.97);
  assert.equal(at(9999, Age.Over5), 136253.33);
});

test('возраст: 3to5 и over5 попадают в группу «от 3 лет»', () => {
  const over3 = calcUtil(PersonType.Legal, EngineType.Fuel, 1500, Age.Over5);
  assert.equal(calcUtil(PersonType.Legal, EngineType.Fuel, 1500, Age.From3To5), over3);
  assert.notEqual(calcUtil(PersonType.Legal, EngineType.Fuel, 1500, Age.Under3), over3);
});
