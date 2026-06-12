const Transaction = require('../models/Transaction');
const Product     = require('../models/Product');
const Alert       = require('../models/Alert');

exports.index = async (req, res) => {
  const { product_id, type, from, to } = req.query;
  const [transactions, products] = await Promise.all([
    Transaction.getAll({ product_id, type, from, to }),
    Product.getAllWithStock()
  ]);
  res.render('transactions/index', {
    title: 'Transactions', transactions, products,
    filters: { product_id, type, from, to },
    user: { name: req.session.name, role: req.session.role },
    success: req.flash('success'), error: req.flash('error')
  });
};

exports.newForm = async (req, res) => {
  const products = await Product.getAllWithStock();
  res.render('transactions/form', { title: 'Record Transaction', products, user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
};

exports.create = async (req, res) => {
  const { product_id, transaction_type, quantity, unit_cost, reference_number, notes } = req.body;
  const qty = parseInt(quantity, 10);

  if (!product_id || !transaction_type || isNaN(qty) || qty <= 0) {
    req.flash('error', 'Invalid input. Please check all fields.');
    return res.redirect('/transactions/new');
  }

  try {
    // Stock-out guard: check CurrentStock = Σ(Additions) − Σ(Sales)
    if (transaction_type === 'stock_out') {
      const currentStock = await Product.getCurrentStock(product_id);
      if (currentStock - qty < 0) {
        req.flash('error', `Insufficient stock. Available: ${currentStock} units.`);
        return res.redirect('/transactions/new');
      }
    }

    await Transaction.create({
      product_id, transaction_type, quantity: qty,
      unit_cost: unit_cost || 0, reference_number, notes,
      user_id: req.session.userId
    });

    // Threshold evaluation after every transaction
    await Alert.evaluate(product_id);

    req.flash('success', 'Transaction recorded successfully.');
    res.redirect('/transactions');
  } catch (err) {
    console.error(err);
    req.flash('error', err.message && err.message.startsWith('Insufficient stock') ? err.message : 'Could not record transaction. Please try again.');
    res.redirect('/transactions/new');
  }
};
