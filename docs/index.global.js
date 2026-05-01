"use strict";
var CustomsCalc = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    Age: () => Age,
    Currency: () => Currency,
    EngineType: () => EngineType,
    PersonType: () => PersonType,
    calcDutyEur: () => calcDutyEur,
    calcUtil: () => calcUtil,
    calculate: () => calculate
  });
  var Age = /* @__PURE__ */ ((Age2) => {
    Age2["Under3"] = "under3";
    Age2["From3To5"] = "3to5";
    Age2["Over5"] = "over5";
    return Age2;
  })(Age || {});
  var PersonType = /* @__PURE__ */ ((PersonType2) => {
    PersonType2["Individual"] = "individual";
    PersonType2["Legal"] = "legal";
    return PersonType2;
  })(PersonType || {});
  var EngineType = /* @__PURE__ */ ((EngineType2) => {
    EngineType2["Fuel"] = "fuel";
    EngineType2["Electric"] = "electric";
    return EngineType2;
  })(EngineType || {});
  var Currency = /* @__PURE__ */ ((Currency2) => {
    Currency2["EUR"] = "EUR";
    Currency2["USD"] = "USD";
    Currency2["BYN"] = "BYN";
    return Currency2;
  })(Currency || {});
  var DUTY_UNDER3 = [
    { maxEur: 8500, pct: 0.54, eurPerCc: 2.5 },
    { maxEur: 16700, pct: 0.48, eurPerCc: 3.5 },
    { maxEur: 42300, pct: 0.48, eurPerCc: 5.5 },
    { maxEur: 84500, pct: 0.48, eurPerCc: 7.5 },
    { maxEur: 169e3, pct: 0.48, eurPerCc: 15 },
    { maxEur: Infinity, pct: 0.48, eurPerCc: 20 }
  ];
  var DUTY_3TO5 = [
    { maxCc: 1e3, eurPerCc: 1.5 },
    { maxCc: 1500, eurPerCc: 1.7 },
    { maxCc: 1800, eurPerCc: 2.5 },
    { maxCc: 2300, eurPerCc: 2.7 },
    { maxCc: 3e3, eurPerCc: 3 },
    { maxCc: Infinity, eurPerCc: 3.6 }
  ];
  var DUTY_OVER5 = [
    { maxCc: 1e3, eurPerCc: 3 },
    { maxCc: 1500, eurPerCc: 3.2 },
    { maxCc: 1800, eurPerCc: 3.5 },
    { maxCc: 2300, eurPerCc: 4.8 },
    { maxCc: 3e3, eurPerCc: 5 },
    { maxCc: Infinity, eurPerCc: 5.7 }
  ];
  var UTIL_INDIVIDUAL = {
    under3: 624.92,
    over3: 1282.02
  };
  var UTIL_LEGAL = [
    { type: "electric" /* Electric */, maxCc: Infinity, under3: 1229.28, over3: 2950.38 },
    { type: "fuel" /* Fuel */, maxCc: 1e3, under3: 6811.16, over3: 17386.97 },
    { type: "fuel" /* Fuel */, maxCc: 2e3, under3: 25226.22, over3: 44374.56 },
    { type: "fuel" /* Fuel */, maxCc: 3e3, under3: 70885.91, over3: 107322.94 },
    { type: "fuel" /* Fuel */, maxCc: 3500, under3: 81393.68, over3: 124611.62 },
    { type: "fuel" /* Fuel */, maxCc: Infinity, under3: 103649, over3: 136253.33 }
  ];
  function toEur(amount, currency, rates) {
    switch (currency.toUpperCase()) {
      case "EUR" /* EUR */:
        return amount;
      case "USD" /* USD */:
        return amount * rates.usd / rates.eur;
      case "BYN" /* BYN */:
        return amount / rates.eur;
      default:
        return amount;
    }
  }
  function calcDutyEur(age, priceEur, volumeCc) {
    if (age === "under3" /* Under3 */) {
      for (const row of DUTY_UNDER3) {
        if (priceEur <= row.maxEur) {
          return Math.max(priceEur * row.pct, volumeCc * row.eurPerCc);
        }
      }
    } else {
      const table = age === "3to5" /* From3To5 */ ? DUTY_3TO5 : DUTY_OVER5;
      for (const row of table) {
        if (volumeCc <= row.maxCc) return volumeCc * row.eurPerCc;
      }
    }
    return 0;
  }
  function calcUtil(face, engineType, volumeCc, age) {
    const ageKey = age === "under3" /* Under3 */ ? "under3" : "over3";
    if (face === "individual" /* Individual */) return UTIL_INDIVIDUAL[ageKey];
    for (const row of UTIL_LEGAL) {
      if (row.type === engineType && volumeCc <= row.maxCc) return row[ageKey];
    }
    return 0;
  }
  function calculate(params) {
    const {
      age,
      price,
      currency,
      engineType,
      volume,
      face,
      rates,
      discount = false,
      fixedCosts = [],
      commission = 0
    } = params;
    const priceEur = toEur(price, currency, rates);
    const priceUsd = priceEur * rates.eur / rates.usd;
    let dutyEur = engineType !== "electric" /* Electric */ ? calcDutyEur(age, priceEur, volume) : 0;
    if (discount) dutyEur *= 0.5;
    const utilByn = calcUtil(face, engineType, volume, age);
    let fixedEur = 0;
    for (const cost of fixedCosts) {
      fixedEur += toEur(cost.amount, cost.currency, rates);
    }
    const commissionEur = priceEur * commission / 100;
    const totalEur = priceEur + commissionEur + dutyEur + fixedEur + utilByn / rates.eur;
    const totalUsd = totalEur * rates.eur / rates.usd;
    const dutyNote = engineType === "electric" /* Electric */ ? "(\u044D\u043B\u0435\u043A\u0442\u0440\u043E\u043C\u043E\u0431\u0438\u043B\u044C)" : discount ? "(\u221250% \u0423\u043A\u0430\u0437 \u2116140)" : "";
    return {
      priceEur,
      priceUsd,
      dutyEur,
      dutyNote,
      utilByn,
      commissionEur,
      totalEur,
      totalUsd
    };
  }
  return __toCommonJS(index_exports);
})();
