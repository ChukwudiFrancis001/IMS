-- IMS Database Schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(150) NOT NULL,
  category_id INT NOT NULL REFERENCES categories(category_id) ON UPDATE CASCADE,
  unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'unit',
  minimum_threshold INT NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  transaction_id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(product_id) ON UPDATE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('stock_in', 'stock_out')),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  reference_number VARCHAR(100),
  notes TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE,
  transaction_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  alert_id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(product_id) ON UPDATE CASCADE,
  stock_at_trigger INT NOT NULL,
  threshold_at_trigger INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  complaint_id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(product_id) ON UPDATE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE,
  complaint_type TEXT NOT NULL CHECK (complaint_type IN ('damaged', 'faulty', 'wrong_item', 'other')),
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  handling_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN')),
  affected_table VARCHAR(80) NOT NULL,
  affected_record_id INT,
  changed_values JSONB,
  ip_address VARCHAR(45),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON stock_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON stock_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_alerts_product ON alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(affected_table);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(logged_at);
CREATE INDEX IF NOT EXISTS idx_complaints_product ON complaints(product_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_date ON complaints(created_at);

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW product_stock_view AS
SELECT
  p.product_id,
  p.sku,
  p.product_name,
  p.category_id,
  c.category_name,
  p.unit_of_measure,
  p.minimum_threshold,
  p.unit_cost,
  p.description,
  p.is_active,
  COALESCE(s.current_stock, 0) AS current_stock
FROM products p
JOIN categories c ON c.category_id = p.category_id
LEFT JOIN (
  SELECT
    product_id,
    COALESCE(SUM(CASE WHEN transaction_type = 'stock_in' THEN quantity ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN transaction_type = 'stock_out' THEN quantity ELSE 0 END), 0) AS current_stock
  FROM stock_transactions
  GROUP BY product_id
) s ON p.product_id = s.product_id;

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Atomic stock transaction with row-level locking
CREATE OR REPLACE FUNCTION create_stock_transaction(
  p_product_id INT,
  p_type TEXT,
  p_qty INT,
  p_cost DECIMAL,
  p_ref TEXT,
  p_notes TEXT,
  p_user_id UUID
) RETURNS INT AS $$
DECLARE
  v_current_stock INT;
  v_txn_id INT;
BEGIN
  -- Lock the product row to prevent concurrent stock modifications
  PERFORM 1 FROM products WHERE product_id = p_product_id FOR UPDATE;

  -- Calculate current stock for this product
  SELECT
    COALESCE(SUM(CASE WHEN transaction_type = 'stock_in' THEN quantity ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN transaction_type = 'stock_out' THEN quantity ELSE 0 END), 0)
  INTO v_current_stock
  FROM stock_transactions
  WHERE product_id = p_product_id;

  -- Guard: check sufficient stock for stock_out
  IF p_type = 'stock_out' AND v_current_stock < p_qty THEN
    RAISE EXCEPTION 'Insufficient stock. Available: % units.', v_current_stock;
  END IF;

  -- Insert the transaction
  INSERT INTO stock_transactions (product_id, transaction_type, quantity, unit_cost, reference_number, notes, user_id)
  VALUES (p_product_id, p_type, p_qty, p_cost, p_ref, p_notes, p_user_id)
  RETURNING transaction_id INTO v_txn_id;

  -- Insert audit log entry
  INSERT INTO audit_log (user_id, action_type, affected_table, affected_record_id, changed_values)
  VALUES (p_user_id, 'INSERT', 'stock_transactions', v_txn_id,
    jsonb_build_object('product_id', p_product_id, 'transaction_type', p_type, 'quantity', p_qty));

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql;

-- Alert threshold evaluator
CREATE OR REPLACE FUNCTION evaluate_alert(p_product_id INT)
RETURNS VOID AS $$
DECLARE
  v_current_stock INT;
  v_threshold INT;
  v_existing_id INT;
BEGIN
  -- Calculate current stock
  SELECT
    COALESCE(SUM(CASE WHEN transaction_type = 'stock_in' THEN quantity ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN transaction_type = 'stock_out' THEN quantity ELSE 0 END), 0)
  INTO v_current_stock
  FROM stock_transactions
  WHERE product_id = p_product_id;

  -- Get threshold
  SELECT minimum_threshold INTO v_threshold
  FROM products WHERE product_id = p_product_id;

  IF v_current_stock <= v_threshold THEN
    -- Check for existing active alert
    SELECT alert_id INTO v_existing_id
    FROM alerts
    WHERE product_id = p_product_id AND status = 'active'
    LIMIT 1;

    IF v_existing_id IS NULL THEN
      INSERT INTO alerts (product_id, stock_at_trigger, threshold_at_trigger)
      VALUES (p_product_id, v_current_stock, v_threshold);
    END IF;
  ELSE
    -- Resolve any active alerts
    UPDATE alerts
    SET status = 'resolved', resolved_at = NOW()
    WHERE product_id = p_product_id AND status = 'active';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trend data for analytics
CREATE OR REPLACE FUNCTION get_trend_data(p_days INT)
RETURNS TABLE(txn_date DATE, transaction_type TEXT, total BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(transaction_date) AS txn_date,
    st.transaction_type,
    SUM(st.quantity) AS total
  FROM stock_transactions st
  WHERE st.transaction_date >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(transaction_date), st.transaction_type
  ORDER BY txn_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Top products by transaction count
CREATE OR REPLACE FUNCTION get_top_products(p_limit INT DEFAULT 10)
RETURNS TABLE(product_name TEXT, sku TEXT, txn_count BIGINT, total_qty BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.product_name::TEXT,
    p.sku::TEXT,
    COUNT(*)::BIGINT AS txn_count,
    SUM(t.quantity)::BIGINT AS total_qty
  FROM stock_transactions t
  JOIN products p ON t.product_id = p.product_id
  GROUP BY t.product_id, p.product_name, p.sku
  ORDER BY txn_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO categories (category_name, description) VALUES
  ('Electronics', 'Devices, accessories, and related stock'),
  ('Office Supplies', 'Consumable office inventory'),
  ('Raw Materials', 'Materials used for production')
ON CONFLICT (category_name) DO UPDATE
  SET description = EXCLUDED.description;
