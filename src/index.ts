// ── Enums ────────────────────────────────────────────────────────────────────

export enum Age {
  Under3 = 'under3',
  From3To5 = '3to5',
  Over5 = 'over5',
}

export enum PersonType {
  Individual = 'individual',
  Legal = 'legal',
}

/**
 * Тип силовой установки. Разделяющий признак для пошлины — механическая связь ДВС с колёсами
 * (разъяснение ГТК об уточнении кодов ТН ВЭД): связан → 8703 40/50/60/70, обычный легковой
 * автомобиль; только вращает генератор → 8703 80, как у электромобиля.
 */
export enum EngineType {
  /** ДВС без электрической установки (включая ТС с системой start-stop). */
  Fuel = 'fuel',
  /** Только электродвигатель, без ДВС. ТН ВЭД 8703 80, строка 1.1 перечня утильсбора. */
  Electric = 'electric',
  /** Мягкий гибрид 48 В: электромотор не может вести ТС самостоятельно. ТН ВЭД 8703 40/50. */
  HybridMhev = 'hybrid_mhev',
  /** Полный гибрид без внешней зарядки. ТН ВЭД 8703 40/50. */
  HybridHev = 'hybrid_hev',
  /** Подзаряжаемый гибрид, ДВС связан с колёсами. ТН ВЭД 8703 60/70. */
  HybridPhev = 'hybrid_phev',
  /**
   * Последовательный гибрид (range extender): ДВС механически не связан с колёсами,
   * служит приводом генератора. ТН ВЭД 8703 80 — как у электромобиля, отсюда пошлина 15%.
   */
  HybridErev = 'hybrid_erev',
}

export enum Currency {
  EUR = 'EUR',
  USD = 'USD',
  BYN = 'BYN',
}

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface Rates {
  usd: number;
  eur: number;
}

export interface FixedCost {
  id: string;
  amount: number;
  currency: Currency;
}

export interface CalculateParams {
  age: Age;
  price: number;
  currency: Currency;
  engineType: EngineType;
  volume: number;
  face: PersonType;
  rates: Rates;
  /** Льгота 50% по Указу №140. Для `PersonType.Legal` игнорируется — льготы у юрлиц нет. */
  discount?: boolean;
  fixedCosts?: FixedCost[];
  commission?: number;
}

export interface CalculateResult {
  priceEur: number;
  priceUsd: number;
  dutyEur: number;
  /**
   * Уточнение к пошлине без оформления — скобки добавляет вызывающий:
   * `'электромобиль'`, `'гибрид EREV, −50% Указ №140'`, `'−50% Указ №140'` или `''`.
   */
  dutyNote: string;
  /** НДС 20% от стоимости с учётом пошлины. Ноль там, где НДС не начисляется отдельно. */
  vatEur: number;
  utilByn: number;
  commissionEur: number;
  totalEur: number;
  totalUsd: number;
}

// ── Rate table types ─────────────────────────────────────────────────────────

interface DutyUnder3Row {
  maxEur: number;
  pct: number;
  eurPerCc: number;
}

interface DutyByVolumeRow {
  maxCc: number;
  eurPerCc: number;
}

interface UtilAgeRow {
  under3: number;
  over3: number;
}

interface UtilVolumeRow extends UtilAgeRow {
  maxCc: number;
}

type UtilAgeKey = keyof UtilAgeRow;

// ── Lookup tables ────────────────────────────────────────────────────────────

const DUTY_UNDER3: readonly DutyUnder3Row[] = [
  { maxEur: 8500,     pct: 0.54, eurPerCc: 2.5  },
  { maxEur: 16700,    pct: 0.48, eurPerCc: 3.5  },
  { maxEur: 42300,    pct: 0.48, eurPerCc: 5.5  },
  { maxEur: 84500,    pct: 0.48, eurPerCc: 7.5  },
  { maxEur: 169000,   pct: 0.48, eurPerCc: 15.0 },
  { maxEur: Infinity, pct: 0.48, eurPerCc: 20.0 },
] as const;

const DUTY_3TO5: readonly DutyByVolumeRow[] = [
  { maxCc: 1000,     eurPerCc: 1.5 },
  { maxCc: 1500,     eurPerCc: 1.7 },
  { maxCc: 1800,     eurPerCc: 2.5 },
  { maxCc: 2300,     eurPerCc: 2.7 },
  { maxCc: 3000,     eurPerCc: 3.0 },
  { maxCc: Infinity, eurPerCc: 3.6 },
] as const;

const DUTY_OVER5: readonly DutyByVolumeRow[] = [
  { maxCc: 1000,     eurPerCc: 3.0 },
  { maxCc: 1500,     eurPerCc: 3.2 },
  { maxCc: 1800,     eurPerCc: 3.5 },
  { maxCc: 2300,     eurPerCc: 4.8 },
  { maxCc: 3000,     eurPerCc: 5.0 },
  { maxCc: Infinity, eurPerCc: 5.7 },
] as const;

// Таблицы выше — Приложение 2 к Решению Совета ЕЭК от 20.12.2017 № 107, позиция 8703.
export const DUTY_RATES_SOURCE = 'https://www.alta.ru/tamdoc/17sr0107/';

// Ставки утильсбора — раздел 1 перечня (UTIL_RATES_SOURCE): категории M1 и M1G.
// M2/M3 и N1—N3 идут по другим таблицам и здесь не реализованы.
export const UTIL_RATES_EFFECTIVE_FROM = '2026-04-29';
export const UTIL_RATES_SOURCE = 'https://www.tws.by/tws/util-fee';

/** Строка 1.3 перечня: ввозимые физлицами для личного пользования. От типа двигателя не зависит. */
const UTIL_INDIVIDUAL: UtilAgeRow = {
  under3: 624.92,
  over3:  1282.02,
};

/** Строка 1.1 перечня: с электродвигателями, кроме ТС с гибридными установками любого типа. */
const UTIL_LEGAL_ELECTRIC: UtilAgeRow = {
  under3: 1229.28,
  over3:  2950.38,
};

/** Строка 1.2 перечня: по объёму двигателя. Сюда попадают ДВС и все виды гибридов. */
const UTIL_LEGAL_BY_VOLUME: readonly UtilVolumeRow[] = [
  { maxCc: 1000,     under3: 6811.16,   over3: 17386.97  },
  { maxCc: 2000,     under3: 25226.22,  over3: 44374.56  },
  { maxCc: 3000,     under3: 70885.91,  over3: 107322.94 },
  { maxCc: 3500,     under3: 81393.68,  over3: 124611.62 },
  { maxCc: Infinity, under3: 103649.00, over3: 136253.33 },
] as const;

/** Последовательный гибрид (ТН ВЭД 8703 80): пошлина 15% от таможенной стоимости. */
const HYBRID_EREV_DUTY_PCT = 0.15;

/** НДС начисляется на стоимость с учётом пошлины. Утильсбор в базу НДС не входит. */
const VAT_PCT = 0.20;

/** Уточнение к пошлине по типу двигателя; у обычного ДВС его нет. */
const ENGINE_LABELS: Record<EngineType, string> = {
  [EngineType.Fuel]:       '',
  [EngineType.Electric]:   'электромобиль',
  [EngineType.HybridMhev]: 'гибрид MHEV',
  [EngineType.HybridHev]:  'гибрид HEV',
  [EngineType.HybridPhev]: 'гибрид PHEV',
  [EngineType.HybridErev]: 'гибрид EREV',
};

// ── Internal helpers ─────────────────────────────────────────────────────────

function toEur(amount: number, currency: Currency, rates: Rates): number {
  switch (currency.toUpperCase() as Currency) {
    case Currency.EUR: return amount;
    case Currency.USD: return amount * rates.usd / rates.eur;
    case Currency.BYN: return amount / rates.eur;
    default:           return amount;
  }
}

/**
 * Начисляется ли НДС отдельной строкой.
 *
 * У физлица по обычному автомобилю — нет: единые ставки названы «ставки таможенных пошлин,
 * налогов», НДС уже внутри них. EREV — да: 8703 80 идёт по совокупному платежу, где пошлина
 * и НДС раздельно. У юрлица — да, ввоз как товара; кроме чистого электромобиля, он освобождён.
 */
function vatApplies(face: PersonType, engineType: EngineType): boolean {
  if (engineType === EngineType.Electric) return false;
  return face === PersonType.Legal || engineType === EngineType.HybridErev;
}

/**
 * Уточнение к пошлине без оформления: `'гибрид EREV, −50% Указ №140'`.
 * Скобки, тире и прочую подачу добавляет вызывающий — тут только данные.
 * Пустая строка, если уточнять нечего: обычный ДВС без льготы.
 */
function buildDutyNote(engineType: EngineType, discount: boolean): string {
  const parts: string[] = [];
  const label = ENGINE_LABELS[engineType];
  if (label) parts.push(label);
  // У электромобиля пошлины нет — льготу не упоминаем.
  if (discount && engineType !== EngineType.Electric) parts.push('−50% Указ №140');
  return parts.join(', ');
}

// ── Exported functions ───────────────────────────────────────────────────────

/**
 * Таможенная пошлина в EUR по единым ставкам для личного пользования (DUTY_RATES_SOURCE).
 *
 * ВНИМАНИЕ: результат не зависит от `PersonType`. У юрлица применяются ставки ЕТТ, а они
 * другие — новый автомобиль у физлица идёт по 48–54% от стоимости против ~15–17% в ЕТТ.
 * Таблица ЕТТ не реализована, для юрлица это осознанное упрощение.
 *
 * `Electric` → 0 — тарифная льгота Указа №428, а не ставка позиции: она ограничена годовой
 * квотой и только для ТС на одних электродвигателях. Вне квоты 8703 80 стоит те же 15%.
 */
export function calcDutyEur(
  age: Age,
  priceEur: number,
  volumeCc: number,
  engineType: EngineType = EngineType.Fuel,
): number {
  if (engineType === EngineType.Electric) return 0;
  if (engineType === EngineType.HybridErev) return priceEur * HYBRID_EREV_DUTY_PCT;

  if (age === Age.Under3) {
    for (const row of DUTY_UNDER3) {
      if (priceEur <= row.maxEur) {
        return Math.max(priceEur * row.pct, volumeCc * row.eurPerCc);
      }
    }
  } else {
    const table = age === Age.From3To5 ? DUTY_3TO5 : DUTY_OVER5;
    for (const row of table) {
      if (volumeCc <= row.maxCc) return volumeCc * row.eurPerCc;
    }
  }
  return 0;
}

/**
 * Утилизационный сбор в BYN для категорий M1 / M1G.
 *
 * Строка 1.1 прямо исключает «ТС, оснащённые различными типами гибридных силовых установок»,
 * поэтому любой гибрид, включая EREV, идёт по строке 1.2 — от объёма ДВС.
 */
export function calcUtil(
  face: PersonType,
  engineType: EngineType,
  volumeCc: number,
  age: Age,
): number {
  const ageKey: UtilAgeKey = age === Age.Under3 ? 'under3' : 'over3';

  if (face === PersonType.Individual) return UTIL_INDIVIDUAL[ageKey];
  if (engineType === EngineType.Electric) return UTIL_LEGAL_ELECTRIC[ageKey];

  const row =
    UTIL_LEGAL_BY_VOLUME.find(r => volumeCc <= r.maxCc) ??
    UTIL_LEGAL_BY_VOLUME[UTIL_LEGAL_BY_VOLUME.length - 1];
  return row[ageKey];
}

export function calculate(params: CalculateParams): CalculateResult {
  const {
    age,
    price,
    currency,
    engineType,
    volume,
    face,
    rates,
    discount   = false,
    fixedCosts = [],
    commission = 0,
  } = params;

  const priceEur = toEur(price, currency, rates);
  const priceUsd = priceEur * rates.eur / rates.usd;

  const discountApplied = discount && face === PersonType.Individual;

  let dutyEur = calcDutyEur(age, priceEur, volume, engineType);
  let vatEur = vatApplies(face, engineType) ? (priceEur + dutyEur) * VAT_PCT : 0;
  if (discountApplied) {
    dutyEur *= 0.5;
    vatEur *= 0.5;
  }

  const utilByn = calcUtil(face, engineType, volume, age);

  let fixedEur = 0;
  for (const cost of fixedCosts) {
    fixedEur += toEur(cost.amount, cost.currency, rates);
  }

  const commissionEur = priceEur * commission / 100;

  const totalEur = priceEur + commissionEur + dutyEur + vatEur + fixedEur + utilByn / rates.eur;
  const totalUsd = totalEur * rates.eur / rates.usd;

  const dutyNote = buildDutyNote(engineType, discountApplied);

  return {
    priceEur,
    priceUsd,
    dutyEur,
    dutyNote,
    vatEur,
    utilByn,
    commissionEur,
    totalEur,
    totalUsd,
  };
}
