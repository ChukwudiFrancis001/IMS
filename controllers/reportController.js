const Product     = require('../models/Product');
const Transaction = require('../models/Transaction');

exports.stock = async (req, res) => {
  const products = await Product.getAllWithStock();
  res.render('reports/stock', { title: 'Stock Report', products, user: { name: req.session.name, role: req.session.role } });
};

exports.analytics = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const [trendRaw, topProducts, stockLevels] = await Promise.all([
    Transaction.getTrendData(days),
    Transaction.getTopProducts(10),
    Product.getAllWithStock()
  ]);

  // Build trend chart data: dates × {stock_in, stock_out}
  const trendMap = {};
  trendRaw.forEach(r => {
    const d = r.date.toISOString().split('T')[0];
    if (!trendMap[d]) trendMap[d] = { stock_in: 0, stock_out: 0 };
    trendMap[d][r.transaction_type] = Number(r.total);
  });
  const trendData = {
    labels: Object.keys(trendMap),
    stock_in:  Object.values(trendMap).map(v => v.stock_in),
    stock_out: Object.values(trendMap).map(v => v.stock_out)
  };

  res.render('reports/analytics', {
    title: 'Analytics', days, trendData, topProducts, stockLevels,
    user: { name: req.session.name, role: req.session.role }
  });
};
