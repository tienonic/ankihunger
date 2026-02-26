/**
 * Math problem generators.
 *
 * Each generator returns { q, a, u, ex } where:
 *   q  = question string
 *   a  = numeric answer (rounded to 2 decimals)
 *   u  = unit label ('' if unitless)
 *   ex = short explanation string
 *
 * To add a category: create a new generator function and register it in `mathGenerators`.
 */

import { pick, round2 } from '../classes/Utils.js';

function genConversion() {
  const types = [
    () => { const oz = pick([8,12,16,24,32,48,64,80,96]); return { q: `Convert ${oz} ounces to pounds.`, a: round2(oz/16), u: 'lb', ex: `16 oz = 1 lb. ${oz}/16 = ${round2(oz/16)}` }; },
    () => { const lb = pick([1.5,2,2.5,3,4,5,6.25,7.5,10]); return { q: `Convert ${lb} pounds to ounces.`, a: round2(lb*16), u: 'oz', ex: `1 lb = 16 oz. ${lb} \u00d7 16 = ${round2(lb*16)}` }; },
    () => { const ft = pick([5280,10560,2640,1320,7920,15840,26400]); return { q: `Convert ${ft.toLocaleString()} feet to miles.`, a: round2(ft/5280), u: 'mi', ex: `5,280 ft = 1 mi. ${ft.toLocaleString()}/5280 = ${round2(ft/5280)}` }; },
    () => { const mi = pick([0.25,0.5,1,1.5,2,3,5]); return { q: `Convert ${mi} miles to feet.`, a: round2(mi*5280), u: 'ft', ex: `1 mi = 5,280 ft. ${mi} \u00d7 5280 = ${round2(mi*5280)}` }; },
    () => { const sqft = pick([43560,87120,21780,10890,130680,217800,65340]); return { q: `Convert ${sqft.toLocaleString()} sq ft to acres. (1 acre = 43,560 sq ft)`, a: round2(sqft/43560), u: 'acres', ex: `${sqft.toLocaleString()} / 43,560 = ${round2(sqft/43560)}` }; },
    () => { const ac = pick([0.25,0.5,1,1.5,2,3,5,10]); return { q: `Convert ${ac} acres to sq ft. (1 acre = 43,560 sq ft)`, a: round2(ac*43560), u: 'sq ft', ex: `${ac} \u00d7 43,560 = ${round2(ac*43560)}` }; },
  ];
  return pick(types)();
}

function genAverage() {
  const n = pick([3, 4, 5, 6]);
  const vals = Array.from({ length: n }, () => round2(Math.random() * 20 + 1));
  const sum = round2(vals.reduce((s, v) => s + v, 0));
  const avg = round2(sum / n);
  const q = pick([
    `You weigh ${n} samples. Weights (lbs): ${vals.join(', ')}. Average weight?`,
    `Inspector takes ${n} temp readings (\u00b0F): ${vals.join(', ')}. Average?`,
    `Trap counts over ${n} days: ${vals.join(', ')} insects. Average daily count?`,
  ]);
  return { q, a: avg, u: '', ex: `Sum / count = ${sum} / ${n} = ${avg}` };
}

function genPercent() {
  const total = pick([20, 25, 40, 50, 80, 100, 120, 150, 200]);
  const damaged = Math.floor(Math.random() * (total * 0.6)) + 1;
  const pct = round2((damaged / total) * 100);
  const q = pick([
    `Out of ${total} apples, ${damaged} show pest damage. Percentage damaged?`,
    `Sample of ${total} plants, ${damaged} diseased. Percentage affected?`,
    `Inspector examines ${total} boxes. ${damaged} fail quality. Percent failed?`,
  ]);
  return { q, a: pct, u: '%', ex: `(${damaged}/${total}) \u00d7 100 = ${pct}%` };
}

function genDecimal() {
  const ops = [
    () => { const a = round2(Math.random()*10+1), b = round2(Math.random()*10+1); return { q: `${a} + ${b} = ?`, a: round2(a+b), u: '', ex: `${a} + ${b} = ${round2(a+b)}` }; },
    () => { let a = round2(Math.random()*15+5), b = round2(Math.random()*5+0.5); if (b>a)[a,b]=[b,a]; return { q: `${a} \u2212 ${b} = ?`, a: round2(a-b), u: '', ex: `${a} \u2212 ${b} = ${round2(a-b)}` }; },
    () => { const a = round2(Math.random()*8+1), b = round2(Math.random()*8+1); return { q: `Crates weigh ${a} lbs and ${b} lbs. Total?`, a: round2(a+b), u: 'lbs', ex: `${a} + ${b} = ${round2(a+b)}` }; },
    () => { const w = [round2(Math.random()*5+1),round2(Math.random()*5+1),round2(Math.random()*5+1)]; return { q: `Three samples: ${w.join(', ')} lbs. Total?`, a: round2(w.reduce((s,v)=>s+v,0)), u: 'lbs', ex: `${w.join(' + ')} = ${round2(w.reduce((s,v)=>s+v,0))}` }; },
  ];
  return pick(ops)();
}

/** Map of category name -> generator function */
export const mathGenerators = {
  conversion: genConversion,
  average:    genAverage,
  percent:    genPercent,
  decimal:    genDecimal,
};
