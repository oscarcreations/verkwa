-- =========================================================================
-- MULTI-TENANT 30-DAY DAILY AGGREGATES FUNCTION
-- Filters all daily transaction sums by organization_id & optional employee_id
-- =========================================================================

CREATE OR REPLACE FUNCTION get_daily_aggregates(
    p_days INTEGER DEFAULT 30,
    p_employee_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    day TEXT,
    deposit NUMERIC,
    withdrawal NUMERIC,
    loan NUMERIC,
    commission NUMERIC
) AS $$
DECLARE
    v_org_id UUID := p_organization_id;
BEGIN
    -- Fallback: If organization_id is not passed, resolve from current authenticated staff
    IF v_org_id IS NULL THEN
        SELECT organization_id INTO v_org_id 
        FROM public.staff 
        WHERE user_id = auth.uid() 
        LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT 
        to_char(t.created_at, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN t.type = 'Deposit' THEN t.amount ELSE 0 END), 0) AS deposit,
        COALESCE(SUM(CASE WHEN t.type = 'Withdrawal' THEN t.amount ELSE 0 END), 0) AS withdrawal,
        COALESCE(SUM(CASE WHEN t.type = 'Loan' THEN t.amount ELSE 0 END), 0) AS loan,
        COALESCE(SUM(CASE WHEN t.type IN ('Commission', 'Service Fee', 'Interest', 'Other Income') THEN t.amount ELSE 0 END), 0) AS commission
    FROM transactions t
    WHERE (v_org_id IS NULL OR t.organization_id = v_org_id)
      AND (p_employee_id IS NULL OR t.staff_id = p_employee_id)
      AND t.created_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
      AND t.status NOT IN ('rejected', 'denied', 'failed')
    GROUP BY to_char(t.created_at, 'YYYY-MM-DD')
    ORDER BY day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
