-- Function to get transaction aggregates with optional staff isolation
CREATE OR REPLACE FUNCTION get_transaction_aggregates(
    p_type TEXT DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_amount', COALESCE(SUM(amount), 0),
        'count', COUNT(*),
        'approved_count', COUNT(*) FILTER (WHERE status = 'approved' OR status = 'sent'),
        'rejected_count', COUNT(*) FILTER (WHERE status = 'rejected' OR status = 'failed' OR status = 'denied'),
        'payable', COALESCE(SUM(amount) FILTER (WHERE type = 'Deposit'), 0),
        'paid', COALESCE(SUM(amount) FILTER (WHERE type = 'Withdrawal'), 0)
    ) INTO result
    FROM transactions t
    LEFT JOIN customers c ON t.customer_id = c.id
    WHERE (p_type IS NULL OR t.type = p_type)
      AND (p_employee_id IS NULL OR c.added_by = p_employee_id)
      AND t.status != 'rejected' 
      AND t.status != 'failed' 
      AND t.status != 'denied';

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
