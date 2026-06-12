const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Alert = require('../models/Alert');

exports.index = async (req, res) => {
  try {
    const [products, recentTxns, activeAlerts] = await Promise.all([
      Product.getAllWithStock(),
      Transaction.getRecent(5),
      Alert.getActive()
    ]);
    const lowCount     = products.filter(p => p.stock_status === 'LOW').length;
    const warningCount = products.filter(p => p.stock_status === 'WARNING').length;
    res.render('dashboard/index', {
      title: 'Dashboard', products, recentTxns, activeAlerts,
      lowCount, warningCount,
      user: { name: req.session.name, role: req.session.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
