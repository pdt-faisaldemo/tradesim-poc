// Regression test for the risk check. Run: npm test
const assert = require('assert');
const { passesRiskCheck } = require('./server');
assert.strictEqual(passesRiskCheck(9211, 41870), true, 'affordable order must pass');
assert.strictEqual(passesRiskCheck(50000, 41870), false, 'unaffordable order must fail');
console.log('risk check tests passed');
