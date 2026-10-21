// TradeSim PoC: one page, one service.
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const account = { owner: 'Jordan Lee', cash: 41870.0 };
const prices = { NVDA: 184.22, AAPL: 231.05, MSFT: 418.9, AMZN: 197.36 };
const orders = [];

// Pre-trade risk check: reject orders that cost more than available cash.
// DEMO BUG: the "bad deploy" flips this comparison (see README).
function passesRiskCheck(cost, buyingPower) {
  return cost <= buyingPower;
}

app.get('/api/quotes', (req, res) => res.json({ asOf: new Date().toISOString(), prices }));
app.get('/api/account', (req, res) => res.json(account));
app.get('/api/orders', (req, res) => res.json(orders.slice(-10).reverse()));

app.post('/api/orders', (req, res) => {
  const { symbol, qty } = req.body || {};
  const price = prices[symbol];
  const quantity = Number(qty);
  if (!price || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid symbol or quantity' });
  }
  const cost = +(price * quantity).toFixed(2);
  const order = { id: `ord-${Date.now()}`, time: new Date().toISOString(), symbol, qty: quantity, cost };
  if (!passesRiskCheck(cost, account.cash)) {
    order.status = 'Rejected';
    orders.push(order);
    console.error(JSON.stringify({ level: 'error', msg: 'order rejected by risk check', ...order, buyingPower: account.cash }));
    return res.status(422).json({ error: 'Insufficient buying power', traceId: order.id });
  }
  account.cash = +(account.cash - cost).toFixed(2);
  order.status = 'Filled';
  orders.push(order);
  res.json(order);
});

app.get('/healthz', (req, res) => res.send('ok'));

module.exports = { passesRiskCheck };
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`TradeSim PoC on :${port}`));
}
