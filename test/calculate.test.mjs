import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  Age, PersonType, EngineType, Currency,
  calculate, calcDutyEur, calcUtil,
  UTIL_RATES_EFFECTIVE_FROM, UTIL_RATES_SOURCE, DUTY_RATES_SOURCE,
} from '../dist/index.mjs';

const rates = { usd: 3.0, eur: 3.5 };

const base = {
  age: Age.Under3,
  price: 30000,
  currency: Currency.EUR,
  volume: 1500,
  face: PersonType.Legal,
  rates,
};

const close = (got, want, msg) => assert.ok(Math.abs(got - want) < 1e-6, `${msg}: ${got} ≠ ${want}`);

test('конвертация валют в EUR', () => {
  const eur = calculate({ ...base, engineType: EngineType.Fuel });
  close(eur.priceEur, 30000, 'EUR остаётся как есть');

  const usd = calculate({ ...base, engineType: EngineType.Fuel, currency: Currency.USD });
  close(usd.priceEur, 30000 * rates.usd / rates.eur, 'USD → EUR через курсы');

  const byn = calculate({ ...base, engineType: EngineType.Fuel, currency: Currency.BYN });
  close(byn.priceEur, 30000 / rates.eur, 'BYN → EUR по курсу евро');
});

test('priceUsd — обратный пересчёт из EUR', () => {
  const r = calculate({ ...base, engineType: EngineType.Fuel });
  close(r.priceUsd, r.priceEur * rates.eur / rates.usd, 'priceUsd');
});

test('EREV: пошлина 15%, НДС 20% от стоимости с учётом пошлины, утильсбор по объёму', () => {
  const r = calculate({ ...base, engineType: EngineType.HybridErev });
  close(r.dutyEur, 30000 * 0.15, 'пошлина');
  close(r.vatEur, (30000 + 4500) * 0.2, 'НДС');
  close(r.utilByn, 25226.22, 'утильсбор');
});

test('льгота −50% уменьшает вдвое и пошлину, и НДС (физлицо, EREV)', () => {
  const ind = { ...base, face: PersonType.Individual, engineType: EngineType.HybridErev };
  const full = calculate(ind);
  const half = calculate({ ...ind, discount: true });
  close(half.dutyEur, full.dutyEur / 2, 'пошлина');
  close(half.vatEur, full.vatEur / 2, 'НДС');
});

test('льгота не влияет на утильсбор', () => {
  const full = calculate({ ...base, engineType: EngineType.Fuel });
  const half = calculate({ ...base, engineType: EngineType.Fuel, discount: true });
  assert.equal(half.utilByn, full.utilByn);
});

// Матрица НДС: начисляется, если тип не электро И (лицо юридическое ИЛИ тип EREV).
test('НДС: физлицо платит только по EREV', () => {
  const vat = (type) => calculate({
    ...base, face: PersonType.Individual, engineType: type,
  }).vatEur;

  for (const type of [EngineType.Fuel, EngineType.HybridMhev,
                      EngineType.HybridHev, EngineType.HybridPhev]) {
    assert.equal(vat(type), 0, `физлицо + ${type}`);
  }
  assert.equal(vat(EngineType.Electric), 0, 'физлицо + электро — льгота Указа №428');
  assert.ok(vat(EngineType.HybridErev) > 0, 'физлицо + EREV — совокупный платёж');
});

test('НДС: юрлицо платит по всем типам, кроме электро', () => {
  const r = (type) => calculate({ ...base, face: PersonType.Legal, engineType: type });

  for (const type of [EngineType.Fuel, EngineType.HybridMhev, EngineType.HybridHev,
                      EngineType.HybridPhev, EngineType.HybridErev]) {
    const res = r(type);
    close(res.vatEur, (res.priceEur + res.dutyEur) * 0.2, `юрлицо + ${type}`);
    assert.ok(res.vatEur > 0, `юрлицо + ${type} — НДС ненулевой`);
  }
  assert.equal(r(EngineType.Electric).vatEur, 0, 'юрлицо + электро — освобождение от НДС');
});

test('НДС считается от стоимости с учётом пошлины, утильсбор в базу не входит', () => {
  const r = calculate({ ...base, face: PersonType.Legal, engineType: EngineType.Fuel });
  close(r.vatEur, (r.priceEur + r.dutyEur) * 0.2, 'база НДС');
  assert.ok(r.utilByn > 0, 'утильсбор при этом ненулевой');
  assert.notEqual(r.vatEur, (r.priceEur + r.dutyEur + r.utilByn / rates.eur) * 0.2);
});

test('льгота −50% не применяется к юрлицу', () => {
  for (const type of Object.values(EngineType)) {
    const plain = calculate({ ...base, face: PersonType.Legal, engineType: type });
    const asked = calculate({ ...base, face: PersonType.Legal, engineType: type, discount: true });
    assert.deepEqual(asked, plain, `юрлицо + ${type}: discount игнорируется`);
  }
});

test('льгота −50% применяется к физлицу', () => {
  const plain = calculate({ ...base, face: PersonType.Individual, engineType: EngineType.Fuel });
  const half = calculate({
    ...base, face: PersonType.Individual, engineType: EngineType.Fuel, discount: true,
  });
  close(half.dutyEur, plain.dutyEur / 2, 'пошлина физлица делится вдвое');
});

test('dutyNote не упоминает льготу для юрлица', () => {
  const note = calculate({
    ...base, face: PersonType.Legal, engineType: EngineType.HybridErev, discount: true,
  }).dutyNote;
  assert.equal(note, 'гибрид EREV');
});

// dutyNote — чистые данные без оформления: скобки добавляет вызывающий.
test('dutyNote', () => {
  // Льгота физлицовая, поэтому строки с ней проверяем на физлице.
  const note = (over) => calculate({ ...base, face: PersonType.Individual, ...over }).dutyNote;

  assert.equal(note({ engineType: EngineType.Fuel }), '');
  assert.equal(note({ engineType: EngineType.Fuel, discount: true }), '−50% Указ №140');
  assert.equal(note({ engineType: EngineType.Electric }), 'электромобиль');
  // Для электромобиля пошлины нет, поэтому льгота в пояснении не упоминается.
  assert.equal(note({ engineType: EngineType.Electric, discount: true }), 'электромобиль');
  assert.equal(note({ engineType: EngineType.HybridMhev }), 'гибрид MHEV');
  assert.equal(note({ engineType: EngineType.HybridHev }), 'гибрид HEV');
  assert.equal(note({ engineType: EngineType.HybridPhev }), 'гибрид PHEV');
  assert.equal(note({ engineType: EngineType.HybridErev }), 'гибрид EREV');
  assert.equal(
    note({ engineType: EngineType.HybridErev, discount: true }),
    'гибрид EREV, −50% Указ №140',
  );
});

test('dutyNote не содержит оформления', () => {
  for (const face of [PersonType.Individual, PersonType.Legal]) {
    for (const engineType of Object.values(EngineType)) {
      for (const discount of [false, true]) {
        const note = calculate({ ...base, face, engineType, discount }).dutyNote;
        assert.ok(!/[()]/.test(note), `${face}/${engineType}: без скобок, получено "${note}"`);
        assert.equal(note, note.trim(), `${face}/${engineType}: без крайних пробелов`);
      }
    }
  }
});

test('фиксированные расходы конвертируются в EUR и входят в итог', () => {
  const fixedCosts = [
    { id: 'delivery', amount: 1400, currency: Currency.EUR },
    { id: 'fee',      amount: 350,  currency: Currency.BYN },
  ];
  const without = calculate({ ...base, engineType: EngineType.Fuel });
  const with_ = calculate({ ...base, engineType: EngineType.Fuel, fixedCosts });
  close(with_.totalEur - without.totalEur, 1400 + 350 / rates.eur, 'вклад расходов');
});

test('комиссия — процент от стоимости, на пошлину не влияет', () => {
  const r = calculate({ ...base, engineType: EngineType.Fuel, commission: 2.5 });
  close(r.commissionEur, 30000 * 0.025, 'комиссия');
  assert.equal(r.dutyEur, calculate({ ...base, engineType: EngineType.Fuel }).dutyEur);
});

test('формула итога', () => {
  const fixedCosts = [{ id: 'x', amount: 200, currency: Currency.BYN }];
  const r = calculate({
    ...base, engineType: EngineType.HybridErev, commission: 1.5, fixedCosts, discount: true,
  });
  close(
    r.totalEur,
    r.priceEur + r.commissionEur + r.dutyEur + r.vatEur + 200 / rates.eur + r.utilByn / rates.eur,
    'totalEur',
  );
  close(r.totalUsd, r.totalEur * rates.eur / rates.usd, 'totalUsd');
});

test('calculate() согласован с calcDutyEur() и calcUtil()', () => {
  for (const type of Object.values(EngineType)) {
    for (const face of [PersonType.Individual, PersonType.Legal]) {
      const r = calculate({ ...base, engineType: type, face });
      close(r.dutyEur, calcDutyEur(base.age, 30000, base.volume, type), `пошлина ${type}`);
      assert.equal(r.utilByn, calcUtil(face, type, base.volume, base.age), `утильсбор ${type}/${face}`);
    }
  }
});

// Различных результатов на текущих ставках три, хотя значений в enum шесть.
test('классы поведения: ДВС-подобные / EREV / электро', () => {
  const grid = [];
  for (const age of [Age.Under3, Age.From3To5, Age.Over5])
    for (const face of [PersonType.Individual, PersonType.Legal])
      for (const price of [3000, 16700, 90000])
        for (const volume of [900, 1500, 3000, 5000])
          grid.push({ ...base, age, face, price, volume });

  const signature = (type) => grid
    .map((p) => {
      const r = calculate({ ...p, engineType: type });
      return [r.dutyEur, r.vatEur, r.utilByn, r.totalEur].map((n) => n.toFixed(6)).join('|');
    })
    .join(';');

  const classes = new Map();
  for (const type of Object.values(EngineType)) {
    const key = signature(type);
    if (!classes.has(key)) classes.set(key, []);
    classes.get(key).push(type);
  }

  assert.equal(classes.size, 3, 'ровно три класса поведения');
  const groups = [...classes.values()].map((g) => g.sort().join(','));
  assert.ok(
    groups.includes([
      EngineType.Fuel, EngineType.HybridHev, EngineType.HybridMhev, EngineType.HybridPhev,
    ].sort().join(',')),
    'ДВС, MHEV, HEV и PHEV в одном классе',
  );
  assert.ok(groups.includes(EngineType.HybridErev), 'EREV отдельно');
  assert.ok(groups.includes(EngineType.Electric), 'электро отдельно');
});

test('метаданные ставок экспортированы', () => {
  assert.match(UTIL_RATES_EFFECTIVE_FROM, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(UTIL_RATES_SOURCE, /^https:\/\//);
  assert.match(DUTY_RATES_SOURCE, /^https:\/\//);
});
