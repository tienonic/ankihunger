/**
 * Math problem generators.
 *
 * Each generator returns { q, a, u, ex, steps } where:
 *   q     = question string
 *   a     = numeric answer (rounded to 2 decimals)
 *   u     = unit label ('' if unitless)
 *   ex    = short explanation string
 *   steps = array of strings showing work step-by-step
 */

import { pick, round2 } from '../classes/Utils.js';

function genConversion() {
  const types = [
    () => {
      const oz = pick([8, 12, 16, 24, 32, 48, 64, 80, 96]);
      const ans = round2(oz / 16);
      return {
        q: `Convert $${oz}$ ounces to pounds.`, a: ans, u: 'lb',
        ex: `$16$ oz $= 1$ lb. $\\frac{${oz}}{16} = ${ans}$`,
        steps: [
          'We need to convert ounces to pounds',
          '$1$ pound $= 16$ ounces',
          `Divide ounces by $16$: $\\frac{${oz}}{16} = ${ans}$`,
          `Answer: $${ans}$ lb`,
        ],
      };
    },
    () => {
      const lb = pick([1.5, 2, 2.5, 3, 4, 5, 6.25, 7.5, 10]);
      const ans = round2(lb * 16);
      return {
        q: `Convert $${lb}$ pounds to ounces.`, a: ans, u: 'oz',
        ex: `$1$ lb $= 16$ oz. $${lb} \\times 16 = ${ans}$`,
        steps: [
          'We need to convert pounds to ounces',
          '$1$ pound $= 16$ ounces',
          `Multiply pounds by $16$: $${lb} \\times 16 = ${ans}$`,
          `Answer: $${ans}$ oz`,
        ],
      };
    },
    () => {
      const ft = pick([5280, 10560, 2640, 1320, 7920, 15840, 26400]);
      const ans = round2(ft / 5280);
      return {
        q: `Convert $${ft.toLocaleString()}$ feet to miles.`, a: ans, u: 'mi',
        ex: `$5{,}280$ ft $= 1$ mi. $\\frac{${ft.toLocaleString()}}{5{,}280} = ${ans}$`,
        steps: [
          'We need to convert feet to miles',
          '$1$ mile $= 5{,}280$ feet',
          `Divide feet by $5{,}280$: $\\frac{${ft.toLocaleString()}}{5{,}280} = ${ans}$`,
          `Answer: $${ans}$ mi`,
        ],
      };
    },
    () => {
      const mi = pick([0.25, 0.5, 1, 1.5, 2, 3, 5]);
      const ans = round2(mi * 5280);
      return {
        q: `Convert $${mi}$ miles to feet.`, a: ans, u: 'ft',
        ex: `$1$ mi $= 5{,}280$ ft. $${mi} \\times 5{,}280 = ${ans.toLocaleString()}$`,
        steps: [
          'We need to convert miles to feet',
          '$1$ mile $= 5{,}280$ feet',
          `Multiply miles by $5{,}280$: $${mi} \\times 5{,}280 = ${ans.toLocaleString()}$`,
          `Answer: $${ans.toLocaleString()}$ ft`,
        ],
      };
    },
    () => {
      const sqft = pick([43560, 87120, 21780, 10890, 130680, 217800, 65340]);
      const ans = round2(sqft / 43560);
      return {
        q: `Convert $${sqft.toLocaleString()}$ sq ft to acres. ($1$ acre $= 43{,}560$ sq ft)`, a: ans, u: 'acres',
        ex: `$\\frac{${sqft.toLocaleString()}}{43{,}560} = ${ans}$`,
        steps: [
          'We need to convert square feet to acres',
          '$1$ acre $= 43{,}560$ square feet',
          `Divide sq ft by $43{,}560$: $\\frac{${sqft.toLocaleString()}}{43{,}560} = ${ans}$`,
          `Answer: $${ans}$ acres`,
        ],
      };
    },
    () => {
      const ac = pick([0.25, 0.5, 1, 1.5, 2, 3, 5, 10]);
      const ans = round2(ac * 43560);
      return {
        q: `Convert $${ac}$ acres to sq ft. ($1$ acre $= 43{,}560$ sq ft)`, a: ans, u: 'sq ft',
        ex: `$${ac} \\times 43{,}560 = ${ans.toLocaleString()}$`,
        steps: [
          'We need to convert acres to square feet',
          '$1$ acre $= 43{,}560$ square feet',
          `Multiply acres by $43{,}560$: $${ac} \\times 43{,}560 = ${ans.toLocaleString()}$`,
          `Answer: $${ans.toLocaleString()}$ sq ft`,
        ],
      };
    },
  ];
  return pick(types)();
}

function genAverage() {
  const n = pick([3, 4, 5, 6]);
  const vals = Array.from({ length: n }, () => round2(Math.random() * 20 + 1));
  const sum = round2(vals.reduce((s, v) => s + v, 0));
  const avg = round2(sum / n);
  const q = pick([
    `You weigh $${n}$ samples. Weights (lbs): $${vals.join(', ')}$. Average weight?`,
    `You record $${n}$ temperature readings (\u00b0F): $${vals.join(', ')}$. Average?`,
    `Counts over $${n}$ days: $${vals.join(', ')}$. Average daily count?`,
  ]);
  return {
    q, a: avg, u: '',
    ex: `$\\frac{${sum}}{${n}} = ${avg}$`,
    steps: [
      `We have $${n}$ values: $${vals.join(', ')}$`,
      `Add them up: $${vals.join(' + ')} = ${sum}$`,
      `Divide by the count: $\\frac{${sum}}{${n}} = ${avg}$`,
      `Answer: $${avg}$`,
    ],
  };
}

function genPercent() {
  const total = pick([20, 25, 40, 50, 80, 100, 120, 150, 200]);
  const damaged = Math.floor(Math.random() * (total * 0.6)) + 1;
  const pct = round2((damaged / total) * 100);
  const q = pick([
    `Out of $${total}$ items, $${damaged}$ are defective. Percentage defective?`,
    `Sample of $${total}$ items, $${damaged}$ are affected. Percentage affected?`,
    `You examine $${total}$ batches. $${damaged}$ fail quality. Percent failed?`,
  ]);
  return {
    q, a: pct, u: '%',
    ex: `$\\frac{${damaged}}{${total}} \\times 100 = ${pct}\\%$`,
    steps: [
      `We need to find what percentage $${damaged}$ is of $${total}$`,
      `Set up the fraction: $\\frac{${damaged}}{${total}}$`,
      `Divide: $\\frac{${damaged}}{${total}} = ${round2(damaged / total)}$`,
      `Multiply by $100$: $${round2(damaged / total)} \\times 100 = ${pct}\\%$`,
      `Answer: $${pct}\\%$`,
    ],
  };
}

function genDecimal() {
  const ops = [
    () => {
      const a = round2(Math.random() * 10 + 1), b = round2(Math.random() * 10 + 1);
      const ans = round2(a + b);
      return {
        q: `$${a} + ${b} = \\;?$`, a: ans, u: '',
        ex: `$${a} + ${b} = ${ans}$`,
        steps: [
          `Add the two numbers: $${a} + ${b}$`,
          `Line up the decimal points and add`,
          `$${a} + ${b} = ${ans}$`,
          `Answer: $${ans}$`,
        ],
      };
    },
    () => {
      let a = round2(Math.random() * 15 + 5), b = round2(Math.random() * 5 + 0.5);
      if (b > a) [a, b] = [b, a];
      const ans = round2(a - b);
      return {
        q: `$${a} - ${b} = \\;?$`, a: ans, u: '',
        ex: `$${a} - ${b} = ${ans}$`,
        steps: [
          `Subtract: $${a} - ${b}$`,
          `Line up the decimal points and subtract`,
          `$${a} - ${b} = ${ans}$`,
          `Answer: $${ans}$`,
        ],
      };
    },
    () => {
      const a = round2(Math.random() * 8 + 1), b = round2(Math.random() * 8 + 1);
      const ans = round2(a + b);
      return {
        q: `Crates weigh $${a}$ lbs and $${b}$ lbs. Total?`, a: ans, u: 'lbs',
        ex: `$${a} + ${b} = ${ans}$`,
        steps: [
          `We need the total weight of two crates`,
          `Crate 1: $${a}$ lbs, Crate 2: $${b}$ lbs`,
          `Add: $${a} + ${b} = ${ans}$`,
          `Answer: $${ans}$ lbs`,
        ],
      };
    },
    () => {
      const w = [round2(Math.random() * 5 + 1), round2(Math.random() * 5 + 1), round2(Math.random() * 5 + 1)];
      const ans = round2(w.reduce((s, v) => s + v, 0));
      return {
        q: `Three samples: $${w.join(', ')}$ lbs. Total?`, a: ans, u: 'lbs',
        ex: `$${w.join(' + ')} = ${ans}$`,
        steps: [
          `We need the total of three samples`,
          `Samples: $${w.join(', ')}$ lbs`,
          `Add: $${w.join(' + ')} = ${ans}$`,
          `Answer: $${ans}$ lbs`,
        ],
      };
    },
  ];
  return pick(ops)();
}

/** Map of category name -> generator function */
export const mathGenerators = {
  conversion: genConversion,
  average: genAverage,
  percent: genPercent,
  decimal: genDecimal,
};
