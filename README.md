# customs-calculator

**[Интерактивное демо](https://artuhovichvladislav.github.io/customs-calculator-docs/)**

Библиотека для расчёта стоимости растаможки автомобилей в Беларуси по ставкам ЕАЭС.

- Таможенная пошлина по трём возрастным группам (до 3, 3–5, старше 5 лет)
- Утилизационный сбор — физические и юридические лица (Постановление №195, апрель 2026)
- Льгота 50% по Указу №140 — для физических лиц
- Электромобили — без пошлины, отдельные ставки утильсбора
- Четыре вида гибридов: MHEV, HEV, PHEV, EREV
- Гибрид EREV — пошлина 15% + НДС 20% (на стоимость с учётом пошлины)
- НДС 20% для юридических лиц, кроме чистых электромобилей
- Динамические фиксированные расходы в EUR / USD / BYN
- Комиссия банковского перевода
- Итого в EUR и USD

## Установка

```bash
npm install customs-calculator

yarn add customs-calculator
```

## Использование

**TypeScript / ESM**

```ts
import { calculate, Age, PersonType, EngineType, Currency } from 'customs-calculator';

const result = calculate({
  age:        Age.Under3,
  price:      15000,
  currency:   Currency.EUR,
  engineType: EngineType.Fuel,
  volume:     2000,
  face:       PersonType.Individual,
  discount:   false,
  rates:      { usd: 2.82, eur: 3.30 },
  fixedCosts: [
    { id: 'delivery',  amount: 1400, currency: Currency.EUR },
    { id: 'warehouse', amount: 200,  currency: Currency.BYN },
  ],
  commission: 1.5, // +1.5% к цене в итоге
});

console.log(result.totalEur); // итого в EUR
console.log(result.dutyEur);  // пошлина в EUR
console.log(result.utilByn);  // утильсбор в BYN
```

**CommonJS**

```js
const { calculate, Age, EngineType, PersonType, Currency } = require('customs-calculator');
```

**Браузер без бандлера**

Подключите IIFE-сборку через CDN — она вешает все экспорты на глобальную переменную `CustomsCalc`:

```html
<!-- CDN (unpkg) -->
<script src="https://unpkg.com/customs-calculator/dist/index.global.js"></script>

<!-- или jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/customs-calculator/dist/index.global.js"></script>

<script>
  const result = CustomsCalc.calculate({
    age: 'under3', price: 15000, currency: 'EUR',
    engineType: 'fuel', volume: 2000, face: 'individual',
    discount: false, rates: { usd: 2.82, eur: 3.30 }, fixedCosts: [],
  });
  console.log(result.totalEur);
</script>
```

Если пакет уже установлен через npm, файл доступен по пути `node_modules/customs-calculator/dist/index.global.js`.

**Строки вместо enums (JS)**

Строковые значения enums совместимы напрямую:

```js
import { calculate } from 'customs-calculator';

const result = calculate({
  age: 'under3', currency: 'EUR', engineType: 'fuel', face: 'individual',
  price: 15000, volume: 2000, discount: false,
  rates: { usd: 2.82, eur: 3.30 }, fixedCosts: [],
});
```

## Enums

| Enum | Значения |
|------|---------|
| `Age` | `Under3 = 'under3'`, `From3To5 = '3to5'`, `Over5 = 'over5'` |
| `PersonType` | `Individual = 'individual'`, `Legal = 'legal'` |
| `EngineType` | `Fuel = 'fuel'`, `Electric = 'electric'`, `HybridMhev = 'hybrid_mhev'`, `HybridHev = 'hybrid_hev'`, `HybridPhev = 'hybrid_phev'`, `HybridErev = 'hybrid_erev'` |
| `Currency` | `EUR = 'EUR'`, `USD = 'USD'`, `BYN = 'BYN'` |

### Типы двигателя

| Значение | Что это | Пошлина | НДС физлицо | НДС юрлицо | Утильсбор (юрлицо) |
|----------|---------|---------|-------------|------------|-------------------|
| `Fuel` | ДВС без электрической установки | таблицы возраст/объём | — | 20% | по объёму ДВС |
| `HybridMhev` | мягкий гибрид 48 В, электромотор не ведёт ТС сам | таблицы возраст/объём | — | 20% | по объёму ДВС |
| `HybridHev` | полный гибрид без внешней зарядки | таблицы возраст/объём | — | 20% | по объёму ДВС |
| `HybridPhev` | подзаряжаемый гибрид | таблицы возраст/объём | — | 20% | по объёму ДВС |
| `HybridErev` | гибрид с генератором (range extender) | 15% от стоимости | 20% | 20% | по объёму ДВС |
| `Electric` | только электродвигатель, без ДВС | 0 | — | — | фиксированная |

Льгота 50% по Указу №140 — только для физлиц. При `face: Legal` параметр `discount`
игнорируется, а не уменьшает пошлину.

**Шесть типов, но на текущих ставках только три разных результата.** `Fuel`, `HybridMhev`,
`HybridHev` и `HybridPhev` считаются одинаково, поэтому в своём интерфейсе их можно свести
в одну категорию — так сделано в демо, где три кнопки вместо шести. Отдельно стоят только
`HybridErev` и `Electric`. В API типы всё равно различаются: если ставки для них разойдутся,
поменяется таблица, а не подпись функций.

### Строки перечня утилизационного сбора

Ставки утильсбора берутся из [перечня видов и категорий транспортных средств, являющихся объектами
обложения утилизационным сбором, а также ставок утилизационного сбора](https://www.tws.by/tws/util-fee).
Легковые автомобили — это **раздел 1** перечня: «транспортные средства категории M1, в том числе
повышенной проходимости категории M1G». Внутри раздела ровно три строки:

| Строка | Формулировка в перечне | Когда применяется |
|--------|------------------------|-------------------|
| **1.1** | «с электродвигателями, за исключением транспортных средств, оснащенных различными типами гибридных силовых установок» | Юрлицо, `Electric` |
| **1.2** | «с объемом двигателя: …» — пять диапазонов | Юрлицо, ДВС и все четыре вида гибридов |
| **1.3** | «ввозимые (ввезенные) физическими лицами для личного пользования» | Любое физлицо, независимо от типа двигателя |

Оговорка в строке 1.1 и есть причина, по которой гибриды считаются по объёму: она прямо исключает
ТС с гибридными силовыми установками любого типа, а строка 1.2 никаких оговорок о приводе
не содержит. Отдельных строк для гибридов в перечне нет, поэтому для них обязательно задавать
`volume`.

Ставки соответствуют категориям M1 и M1G и действуют с 29.04.2026 — дата доступна как
`UTIL_RATES_EFFECTIVE_FROM`, ссылка на источник как `UTIL_RATES_SOURCE`. Категории M2/M3
и N1—N3 не реализованы.

## API

### `calculate(params): CalculateResult`

Основная функция. Принимает все параметры сделки и возвращает полный расчёт.

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|---------|
| `age` | `Age` | Возраст авто. Определяет таблицу ставок пошлины. |
| `price` | `number` | Стоимость авто в валюте `currency`. |
| `currency` | `Currency` | Валюта параметра `price`. |
| `engineType` | `EngineType` | Тип двигателя. См. [таблицу выше](#типы-двигателя). |
| `volume` | `number` | Объём двигателя ДВС, см³. Игнорируется только для `Electric`. Для гибридов на пошлину `HybridErev` не влияет, но нужен для утильсбора. |
| `face` | `PersonType` | Физическое или юридическое лицо. Влияет на утильсбор, НДС и применимость льготы. |
| `rates` | `Rates` | Курсы BYN: `{ usd: number, eur: number }`. |
| `discount` | `boolean?` | Льгота 50% по Указу №140. К пошлине и НДС. **Игнорируется при `face: Legal`** — у юрлиц льготы нет. |
| `fixedCosts` | `FixedCost[]?` | Фиксированные расходы. Конвертируются в EUR для итога. |
| `commission` | `number?` | Комиссия банковского перевода, %. Добавляется к итогу. |

**Возвращает `CalculateResult`:**

| Поле | Тип | Описание |
|------|-----|---------|
| `priceEur` | `number` | Стоимость авто в EUR. |
| `priceUsd` | `number` | Стоимость авто в USD. |
| `dutyEur` | `number` | Таможенная пошлина, EUR. |
| `dutyNote` | `string` | Уточнение к пошлине **отдельным полем и без оформления** — скобки и прочую подачу добавляйте сами: `'электромобиль'`, `'гибрид PHEV'`, `'гибрид EREV, −50% Указ №140'`, `'−50% Указ №140'` или `''`. |
| `vatEur` | `number` | НДС, EUR — 20% от стоимости с учётом пошлины. Когда начисляется — см. [таблицу выше](#типы-двигателя). Утильсбор в базу НДС не входит. |
| `utilByn` | `number` | Утилизационный сбор, BYN. |
| `commissionEur` | `number` | Комиссия в EUR. `0` если не задана. |
| `totalEur` | `number` | Итого: цена + комиссия + пошлина + расходы + утильсбор. |
| `totalUsd` | `number` | Итого в USD. |

**Формула:**
```
totalEur = priceEur + commissionEur + dutyEur + vatEur + Σ(fixedCosts → EUR) + utilByn / rates.eur
```

---

### `calcDutyEur(age, priceEur, volumeCc, engineType?): number`

Вычисляет таможенную пошлину. `engineType` необязателен, по умолчанию `Fuel`.

```ts
import { calcDutyEur, Age, EngineType } from 'customs-calculator';

calcDutyEur(Age.Under3, 50000, 3000);
// → MAX(50000 × 0.48, 3000 × 5.5) = 24000

calcDutyEur(Age.From3To5, 12000, 1600);
// → 1600 × 2.5 = 4000

calcDutyEur(Age.Over5, 20000, 1500, EngineType.HybridPhev);
// → 1500 × 3.2 = 4800 — как обычный ДВС

calcDutyEur(Age.Over5, 20000, 1500, EngineType.HybridErev);
// → 20000 × 0.15 = 3000

calcDutyEur(Age.Over5, 20000, 1500, EngineType.Electric);
// → 0
```

### `calcUtil(face, engineType, volumeCc, age): number`

Возвращает утилизационный сбор в BYN для категорий M1 / M1G (Постановление №195, апрель 2026).

```ts
import { calcUtil, Age, PersonType, EngineType } from 'customs-calculator';

calcUtil(PersonType.Individual, EngineType.Fuel, 2000, Age.Under3); // → 624.92
calcUtil(PersonType.Legal,      EngineType.Fuel, 1600, Age.Over5);  // → 44374.56

// Электро — строка 1.1 перечня, объём не важен
calcUtil(PersonType.Legal, EngineType.Electric, 0, Age.Under3);     // → 1229.28

// Любой гибрид — строка 1.2 перечня, по объёму ДВС
calcUtil(PersonType.Legal, EngineType.HybridErev, 1500, Age.Under3); // → 25226.22
calcUtil(PersonType.Legal, EngineType.HybridPhev, 1500, Age.Under3); // → 25226.22
```

### Метаданные ставок

| Экспорт | Значение |
|---------|----------|
| `UTIL_RATES_EFFECTIVE_FROM` | Дата вступления ставок утильсбора: `'2026-04-29'` |
| `UTIL_RATES_SOURCE` | Источник ставок утильсбора |
| `DUTY_RATES_SOURCE` | Источник ставок пошлины — Приложение 2 к Решению Совета ЕЭК №107 |

---

## Тесты

```bash
npm test        # сборка + node --test (27 тестов, без зависимостей)
npm run typecheck
```

Покрыты: границы всех диапазонов объёма и стоимости, эквивалентность MHEV/HEV/PHEV обычному ДВС,
ставка EREV, утильсбор по всем типам и лицам, конвертация валют, формула итога и строки `dutyNote`.
