import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';

const html = readFileSync(new URL('./prototipo.html', import.meta.url), 'utf8');
const start = html.indexOf('function dashboardData(){');
const end = html.indexOf('function dashboardPage(){', start);
assert.ok(start > 0 && end > start, 'Función de datos del dashboard presente');
const source = html.slice(start, end);
const cases = [
  { name: 'Pedro pendiente; Lucía sin registrar', registered: false, paid: false, expected: [500, 500, 0, 0, 1] },
  { name: 'Lucía registrada y Pedro pendiente', registered: true, paid: false, expected: [1700, 500, 1200, 0, 2] },
  { name: 'Lucía registrada y Pedro pagado', registered: true, paid: true, expected: [1200, 0, 1200, 510.08, 1] },
  { name: 'Pedro pagado; Lucía sin registrar', registered: false, paid: true, expected: [0, 0, 0, 510.08, 0] },
];
for (const c of cases) {
  const context = vm.createContext({
    registered: c.registered,
    paid: c.paid,
    clients: [
      { id: 'lucia', name: 'Lucía', limit: 2000 },
      { id: 'pedro', name: 'Pedro', limit: 2000 },
      { id: 'ana', name: 'Ana', limit: 3500 },
    ],
  });
  const result = vm.runInContext(source + '\ndashboardData()', context);
  assert.deepEqual([result.capital, result.vencido, result.vigente, result.cobros, result.conDeuda], c.expected);
  assert.equal(result.rows.find(x => x.id === 'ana').capital, 0);
  assert.equal(result.rows.find(x => x.id === 'ana').limit, 3500);
  assert.equal(result.vigente + result.vencido, result.capital);
  console.log(`OK: ${c.name}`);
}
console.log('4 estados coherentes; no se prueba el motor financiero de producción.');
