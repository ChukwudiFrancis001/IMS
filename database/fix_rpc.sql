-- FIX 1: Fix create_stock_transaction RPC (FOR UPDATE incompatible with aggregate)
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
  PERFORM 1 FROM products WHERE product_id = p_product_id FOR UPDATE;

  SELECT
    COALESCE(SUM(CASE WHEN transaction_type = 'stock_in' THEN quantity ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN transaction_type = 'stock_out' THEN quantity ELSE 0 END), 0)
  INTO v_current_stock
  FROM stock_transactions
  WHERE product_id = p_product_id;

  IF p_type = 'stock_out' AND v_current_stock < p_qty THEN
    RAISE EXCEPTION 'Insufficient stock. Available: % units.', v_current_stock;
  END IF;

  INSERT INTO stock_transactions (product_id, transaction_type, quantity, unit_cost, reference_number, notes, user_id)
  VALUES (p_product_id, p_type, p_qty, p_cost, p_ref, p_notes, p_user_id)
  RETURNING transaction_id INTO v_txn_id;

  INSERT INTO audit_log (user_id, action_type, affected_table, affected_record_id, changed_values)
  VALUES (p_user_id, 'INSERT', 'stock_transactions', v_txn_id,
    jsonb_build_object('product_id', p_product_id, 'transaction_type', p_type, 'quantity', p_qty));

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql;

-- FIX 2: Add missing badge CSS classes via inline style workaround (not DB)
