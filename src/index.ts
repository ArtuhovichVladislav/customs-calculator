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

export enum EngineType {
  Fuel = 'fuel',
  Electric = 'electric',
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
  discount?: boolean;
  fixedCosts?: FixedCost[];
  commission?: number;
}

export interface CalculateResult {
  priceEur: number;
  priceUsd: number;
  dutyEur: number;
  dutyNote: string;
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

interface UtilLegalRow {
  type: EngineType;
  maxCc: number;
  under3: number;
  over3: number;
}

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

const UTIL_INDIVIDUAL: Record<'under3' | 'over3', number> = {
  under3: 624.92,
  over3:  1282.02,
};

const UTIL_LEGAL: readonly UtilLegalRow[] = [
  { type: EngineType.Electric, maxCc: Infinity, under3: 1229.28,   over3: 2950.38   },
  { type: EngineType.Fuel,     maxCc: 1000,     under3: 6811.16,   over3: 17386.97  },
  { type: EngineType.Fuel,     maxCc: 2000,     under3: 25226.22,  over3: 44374.56  },
  { type: EngineType.Fuel,     maxCc: 3000,     under3: 70885.91,  over3: 107322.94 },
  { type: EngineType.Fuel,     maxCc: 3500,     under3: 81393.68,  over3: 124611.62 },
  { type: EngineType.Fuel,     maxCc: Infinity, under3: 103649.00, over3: 136253.33 },
] as const;

// ── Internal helpers ─────────────────────────────────────────────────────────

function toEur(amount: number, currency: Currency, rates: Rates): number {
  switch (currency.toUpperCase() as Currency) {
    case Currency.EUR: return amount;
    case Currency.USD: return amount * rates.usd / rates.eur;
    case Currency.BYN: return amount / rates.eur;
    default:           return amount;
  }
}

// ── Exported functions ───────────────────────────────────────────────────────

export function calcDutyEur(age: Age, priceEur: number, volumeCc: number): number {
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

export function calcUtil(
  face: PersonType,
  engineType: EngineType,
  volumeCc: number,
  age: Age,
): number {
  const ageKey: 'under3' | 'over3' = age === Age.Under3 ? 'under3' : 'over3';
  if (face === PersonType.Individual) return UTIL_INDIVIDUAL[ageKey];
  for (const row of UTIL_LEGAL) {
    if (row.type === engineType && volumeCc <= row.maxCc) return row[ageKey];
  }
  return 0;
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

  let dutyEur = engineType !== EngineType.Electric
    ? calcDutyEur(age, priceEur, volume)
    : 0;
  if (discount) dutyEur *= 0.5;

  const utilByn = calcUtil(face, engineType, volume, age);

  let fixedEur = 0;
  for (const cost of fixedCosts) {
    fixedEur += toEur(cost.amount, cost.currency, rates);
  }

  const commissionEur = priceEur * commission / 100;

  const totalEur = priceEur + commissionEur + dutyEur + fixedEur + utilByn / rates.eur;
  const totalUsd = totalEur * rates.eur / rates.usd;

  const dutyNote = engineType === EngineType.Electric
    ? '(электромобиль)'
    : (discount ? '(−50% Указ №140)' : '');

  return {
    priceEur,
    priceUsd,
    dutyEur,
    dutyNote,
    utilByn,
    commissionEur,
    totalEur,
    totalUsd,
  };
}
