const Complaint = require('../models/Complaint');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

exports.index = async (req, res) => {
  const { status, priority, product_id } = req.query;
  const isAdmin = req.session.role === 'admin';

  const filters = { status, priority, product_id };
  if (!isAdmin) filters.user_id = req.session.supabaseUserId;

  const [complaints, products, stats] = await Promise.all([
    Complaint.getAll(filters),
    Product.getAllWithStock(),
    Complaint.getStats()
  ]);

  res.render('complaints/index', {
    title: 'Complaints',
    complaints,
    products,
    stats,
    filters: { status, priority, product_id },
    isAdmin,
    user: { name: req.session.name, role: req.session.role },
    success: req.flash('success'),
    error: req.flash('error')
  });
};

exports.newForm = async (req, res) => {
  const products = await Product.getAllWithStock();
  res.render('complaints/form', {
    title: 'Log Complaint',
    products,
    complaint: null,
    user: { name: req.session.name, role: req.session.role },
    error: req.flash('error')
  });
};

exports.create = async (req, res) => {
  const { product_id, complaint_type, description, priority } = req.body;

  if (!product_id || !complaint_type || !description) {
    req.flash('error', 'Please fill in all required fields.');
    return res.redirect('/complaints/new');
  }

  try {
    const complaint = await Complaint.create({
      product_id: parseInt(product_id, 10),
      user_id: req.session.supabaseUserId,
      complaint_type,
      description,
      priority: priority || 'medium'
    });

    await AuditLog.log({
      user_id: req.session.supabaseUserId,
      action_type: 'INSERT',
      affected_table: 'complaints',
      affected_record_id: complaint.complaint_id,
      changed_values: { product_id, complaint_type, priority: priority || 'medium' },
      ip_address: req.ip
    });

    req.flash('success', 'Complaint logged successfully.');
    res.redirect('/complaints');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not log complaint. Please try again.');
    res.redirect('/complaints/new');
  }
};

exports.detail = async (req, res) => {
  try {
    const complaint = await Complaint.getById(parseInt(req.params.id, 10));
    const products = await Product.getAllWithStock();
    const isAdmin = req.session.role === 'admin';

    res.render('complaints/detail', {
      title: `Complaint #${complaint.complaint_id}`,
      complaint,
      products,
      isAdmin,
      user: { name: req.session.name, role: req.session.role },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Complaint not found.');
    res.redirect('/complaints');
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.session.role === 'admin';

  try {
    const existing = await Complaint.getById(parseInt(id, 10));

    if (!isAdmin && existing.user_id !== req.session.supabaseUserId) {
      req.flash('error', 'You do not have permission to update this complaint.');
      return res.redirect('/complaints');
    }

    const updates = {};
    if (isAdmin) {
      if (req.body.priority) updates.priority = req.body.priority;
      if (req.body.status) updates.status = req.body.status;
      if (req.body.handling_remarks !== undefined) updates.handling_remarks = req.body.handling_remarks;
      if (req.body.created_at) updates.created_at = req.body.created_at;
    } else {
      if (req.body.status) updates.status = req.body.status;
      if (req.body.handling_remarks !== undefined) updates.handling_remarks = req.body.handling_remarks;
    }

    if (updates.status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const { data, changed } = await Complaint.update(parseInt(id, 10), updates);

    if (Object.keys(changed).length > 0) {
      await AuditLog.log({
        user_id: req.session.supabaseUserId,
        action_type: 'UPDATE',
        affected_table: 'complaints',
        affected_record_id: parseInt(id, 10),
        changed_values: changed,
        ip_address: req.ip
      });
    }

    req.flash('success', 'Complaint updated successfully.');
    res.redirect(`/complaints/${id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not update complaint. Please try again.');
    res.redirect(`/complaints/${id}`);
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await Complaint.delete(parseInt(id, 10));

    await AuditLog.log({
      user_id: req.session.supabaseUserId,
      action_type: 'DELETE',
      affected_table: 'complaints',
      affected_record_id: parseInt(id, 10),
      changed_values: { deleted_complaint: existing },
      ip_address: req.ip
    });

    req.flash('success', 'Complaint deleted successfully.');
    res.redirect('/complaints');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not delete complaint. Please try again.');
    res.redirect('/complaints');
  }
};

exports.close = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, changed } = await Complaint.update(parseInt(id, 10), {
      status: 'resolved',
      resolved_at: new Date().toISOString()
    });

    if (Object.keys(changed).length > 0) {
      await AuditLog.log({
        user_id: req.session.supabaseUserId,
        action_type: 'UPDATE',
        affected_table: 'complaints',
        affected_record_id: parseInt(id, 10),
        changed_values: { ...changed, action: 'closed_permanently' },
        ip_address: req.ip
      });
    }

    req.flash('success', 'Complaint closed permanently.');
    res.redirect(`/complaints/${id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not close complaint. Please try again.');
    res.redirect(`/complaints/${id}`);
  }
};
