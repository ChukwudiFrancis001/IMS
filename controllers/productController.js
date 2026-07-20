const Product  = require('../models/Product');
const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');
const Transaction = require('../models/Transaction');

exports.index = async (req, res) => {
  try {
    const products = await Product.getAllWithStock();
    res.render('products/index', { title: 'Products', products, user: { name: req.session.name, role: req.session.role }, success: req.flash('success'), error: req.flash('error') });
  } catch (err) {
    console.error('Products index error:', err.message);
    res.render('products/index', { title: 'Products', products: [], user: { name: req.session.name, role: req.session.role }, success: req.flash('success'), error: 'Could not load products.' });
  }
};

exports.newForm = async (req, res) => {
  try {
    const categories = await Category.getAll();
    res.render('products/form', { title: 'Add Product', product: null, categories, user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
  } catch (err) {
    console.error('Product newForm error:', err.message);
    req.flash('error', 'Could not load form.');
    res.redirect('/products');
  }
};

exports.create = async (req, res) => {
  const { sku, product_name, category_id, unit_of_measure, minimum_threshold, unit_cost, description, current_stock } = req.body;
  try {
    const id = await Product.create({ sku, product_name, category_id, unit_of_measure, minimum_threshold: minimum_threshold || 0, unit_cost: unit_cost || 0, description });
    const initialStock = parseInt(current_stock) || 0;
    if (initialStock > 0) {
      await Transaction.create({
        product_id: id,
        transaction_type: 'stock_in',
        quantity: initialStock,
        unit_cost: unit_cost || 0,
        reference_number: 'INIT',
        notes: 'Initial stock on product creation',
        user_id: req.session.supabaseUserId
      });
    }
    await AuditLog.log({ user_id: req.session.supabaseUserId, action_type: 'INSERT', affected_table: 'products', affected_record_id: id, changed_values: req.body, ip_address: req.ip });
    req.flash('success', `Product "${product_name}" created successfully${initialStock > 0 ? ` with ${initialStock} units initial stock` : ''}.`);
    res.redirect('/products');
  } catch (err) {
    if (err.message && err.message.includes('unique')) req.flash('error', 'SKU already exists. Please use a unique SKU.');
    else req.flash('error', 'Could not create product. Please try again.');
    res.redirect('/products/new');
  }
};

exports.editForm = async (req, res) => {
  try {
    const product    = await Product.getById(req.params.id);
    const categories = await Category.getAll();
    if (!product) { req.flash('error', 'Product not found.'); return res.redirect('/products'); }
    res.render('products/form', { title: 'Edit Product', product, categories, user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
  } catch (err) {
    console.error('Product editForm error:', err.message);
    req.flash('error', 'Could not load product.');
    res.redirect('/products');
  }
};

exports.update = async (req, res) => {
  try {
    const { product_name, category_id, unit_of_measure, minimum_threshold, unit_cost, description } = req.body;
    const id = req.params.id;
    const before = await Product.getById(id);
    await Product.update(id, { product_name, category_id, unit_of_measure, minimum_threshold: minimum_threshold || 0, unit_cost: unit_cost || 0, description });
    await AuditLog.log({ user_id: req.session.supabaseUserId, action_type: 'UPDATE', affected_table: 'products', affected_record_id: id, changed_values: { before, after: req.body }, ip_address: req.ip });
    req.flash('success', 'Product updated successfully.');
    res.redirect('/products');
  } catch (err) {
    console.error('Product update error:', err.message);
    req.flash('error', 'Could not update product.');
    res.redirect('/products');
  }
};

exports.deactivate = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.getById(id);
    await Product.deactivate(id);
    await AuditLog.log({ user_id: req.session.supabaseUserId, action_type: 'DELETE', affected_table: 'products', affected_record_id: id, changed_values: { product_name: product.product_name }, ip_address: req.ip });
    req.flash('success', 'Product deactivated. Historical data retained.');
    res.redirect('/products');
  } catch (err) {
    console.error('Product deactivate error:', err.message);
    req.flash('error', 'Could not deactivate product.');
    res.redirect('/products');
  }
};
