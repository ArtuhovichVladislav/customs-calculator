# customs-calculator

**[Интерактивное демо](https://artuhovichvladislav.github.io/customs-calculator/)**

Библиотека для расчёта стоимости растаможки автомобилей в Беларуси по ставкам ЕАЭС.

- Таможенная пошлина по трём возрастным группам (до 3, 3–5, старше 5 лет)
- Утилизационный сбор — физические и юридические лица (Постановление №195, апрель 2026)
- Льгота 50% по Указу №140
- Электромобили — без пошлины, отдельные ставки утилсбора
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
    { id: 'delivery', amount: 1400, currency: Currency.EUR },
    { id: 'util',     amount: 200,  currency: Currency.BYN },
  ],
  commission: 1.5, // +1.5% к цене в итоге
});

console.log(result.totalEur); // итого в EUR
console.log(result.dutyEur);  // пошлина в EUR
console.log(result.utilByn);  // утилсбор в BYN
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
| `EngineType` | `Fuel = 'fuel'`, `Electric = 'electric'` |
| `Currency` | `EUR = 'EUR'`, `USD = 'USD'`, `BYN = 'BYN'` |

## API

### `calculate(params): CalculateResult`

Основная функция. Принимает все параметры сделки и возвращает полный расчёт.

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|---------|
| `age` | `Age` | Возраст авто. Определяет таблицу ставок пошлины. |
| `price` | `number` | Стоимость авто в валюте `currency`. |
| `currency` | `Currency` | Валюта параметра `price`. |
| `engineType` | `EngineType` | Тип двигателя. Для `Electric` пошлина = 0. |
| `volume` | `number` | Объём двигателя, см³. Игнорируется для электромобилей. |
| `face` | `PersonType` | Физическое или юридическое лицо. Влияет на утилсбор. |
| `rates` | `Rates` | Курсы BYN: `{ usd: number, eur: number }`. |
| `discount` | `boolean?` | Льгота 50% по Указу №140. Только к пошлине. |
| `fixedCosts` | `FixedCost[]?` | Фиксированные расходы. Конвертируются в EUR для итога. |
| `commission` | `number?` | Комиссия банковского перевода, %. Добавляется к итогу. |

**Возвращает `CalculateResult`:**

| Поле | Тип | Описание |
|------|-----|---------|
| `priceEur` | `number` | Стоимость авто в EUR. |
| `priceUsd` | `number` | Стоимость авто в USD. |
| `dutyEur` | `number` | Таможенная пошлина, EUR. |
| `dutyNote` | `string` | Пояснение: `'(электромобиль)'`, `'(−50% Указ №140)'` или `''`. |
| `utilByn` | `number` | Утилизационный сбор, BYN. |
| `commissionEur` | `number` | Комиссия в EUR. `0` если не задана. |
| `totalEur` | `number` | Итого: цена + комиссия + пошлина + расходы + утилсбор. |
| `totalUsd` | `number` | Итого в USD. |

**Формула:**
```
totalEur = priceEur + commissionEur + dutyEur + Σ(fixedCosts → EUR) + utilByn / rates.eur
```

---

### `calcDutyEur(age, priceEur, volumeCc): number`

Вычисляет таможенную пошлину для топливного автомобиля. Для электромобилей пошлина всегда `0` — эту функцию вызывать не нужно.

```ts
import { calcDutyEur, Age } from 'customs-calculator';

calcDutyEur(Age.Under3, 50000, 3000);
// → MAX(50000 × 0.48, 3000 × 5.5) = 24000

calcDutyEur(Age.From3To5, 12000, 1600);
// → 1600 × 2.5 = 4000
```

### `calcUtil(face, engineType, volumeCc, age): number`

Возвращает утилизационный сбор в BYN (Постановление №195, апрель 2026).

```ts
import { calcUtil, Age, PersonType, EngineType } from 'customs-calculator';

calcUtil(PersonType.Individual, EngineType.Fuel, 2000, Age.Under3); // → 624.92
calcUtil(PersonType.Legal,      EngineType.Fuel, 1600, Age.Over5);  // → 44374.56
```
