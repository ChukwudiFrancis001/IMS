const Product  = require('../models/Product');
const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');

exports.index = async (req, res) => {
  const products = await Product.getAllWithStock();
  res.render('products/index', { title: 'Products', products, user: { name: req.session.name, role: req.session.role }, success: req.flash('success'), error: req.flash('error') });
};

exports.newForm = async (req, res) => {
  const categories = await Category.getAll();
  res.render('products/form', { title: 'Add Product', product: null, categories, user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
};

exports.create = async (req, res) => {
  const { sku, product_name, category_id, unit_of_measure, minimum_threshold, unit_cost, description } = req.body;
  try {
    const id = await Product.create({ sku, product_name, category_id, unit_of_measure, minimum_threshold: minimum_threshold || 0, unit_cost: unit_cost || 0, description });
    await AuditLog.log({ user_id: req.session.userId, action_type: 'INSERT', affected_table: 'products', affected_record_id: id, changed_values: req.body, ip_address: req.ip });
    req.flash('success', `Product "${product_name}" created successfully.`);
    res.redirect('/products');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') req.flash('error', 'SKU already exists. Please use a unique SKU.');
    else req.flash('error', 'Could not create product. Please try again.');
    res.redirect('/products/new');
  }
};

exports.editForm = async (req, res) => {
  const product    = await Product.getById(req.params.id);
  const categories = await Category.getAll();
  if (!product) { req.flash('error', 'Product not found.'); return res.redirect('/products'); }
  res.render('products/form', { title: 'Edit Product', product, categories, user: { name: req.session.name, role: req.session.role }, error: req.flash('error') });
};

exports.update = async (req, res) => {
  const { product_name, category_id, unit_of_measure, minimum_threshold, unit_cost, description } = req.body;
  const id = req.params.id;
  const before = await Product.getById(id);
  await Product.update(id, { product_name, category_id, unit_of_measure, minimum_threshold: minimum_threshold || 0, unit_cost: unit_cost || 0, description });
  await AuditLog.log({ user_id: req.session.userId, action_type: 'UPDATE', affected_table: 'products', affected_record_id: id, changed_values: { before, after: req.body }, ip_address: req.ip });
  req.flash('success', 'Product updated successfully.');
  res.redirect('/products');
};

exports.deactivate = async (req, res) => {
  const id = req.params.id;
  const product = await Product.getById(id);
  await Product.deactivate(id);
  await AuditLog.log({ user_id: req.session.userId, action_type: 'DELETE', affected_table: 'products', affected_record_id: id, changed_values: { product_name: product.product_name }, ip_address: req.ip });
  req.flash('success', 'Product deactivated. Historical data retained.');
  res.redirect('/products');
};
