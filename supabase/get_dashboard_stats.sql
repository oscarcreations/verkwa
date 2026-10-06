-- Optimized function to fetch all dashboard stats in one call
-- Execute this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_employee_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    now_date TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP;
    today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', CURRENT_TIMESTAMP);
    week_start TIMESTAMP WITH TIME ZONE := date_trunc('week', CURRENT_TIMESTAMP);
    month_start TIMESTAMP WITH TIME ZONE := date_trunc('month', CURRENT_TIMESTAMP);
    result JSON;
BEGIN
    WITH lifetime_stats AS (
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'Deposit' THEN amount ELSE 0 END), 0) as total_deposits,
            COALESCE(SUM(CASE WHEN type = 'Withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals,
            COALESCE(SUM(CASE WHEN type = 'Loan' THEN amount ELSE 0 END), 0) as total_loans,
            COALESCE(SUM(CASE WHEN type IN ('Commission', 'Service Fee', 'Interest', 'Other Income') THEN amount ELSE 0 END), 0) as total_revenue
        FROM transactions
        WHERE (p_employee_id IS NULL OR staff_id = p_employee_id)
          AND status NOT IN ('rejected', 'denied')
    ),
    monthly_stats AS (
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'Deposit' THEN amount ELSE 0 END), 0) as month_deposits,
            COALESCE(SUM(CASE WHEN type = 'Withdrawal' THEN amount ELSE 0 END), 0) as month_withdrawals,
            COALESCE(SUM(CASE WHEN type = 'Loan' THEN amount ELSE 0 END), 0) as month_loans,
            COALESCE(SUM(CASE WHEN type IN ('Commission', 'Service Fee', 'Interest', 'Other Income') THEN amount ELSE 0 END), 0) as month_revenue
        FROM transactions
        WHERE (p_employee_id IS NULL OR staff_id = p_employee_id)
          AND status NOT IN ('rejected', 'denied')
          AND created_at >= month_start
    ),
    today_stats AS (
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'Deposit' THEN amount ELSE 0 END), 0) as today_deposits,
            COALESCE(SUM(CASE WHEN type = 'Withdrawal' THEN amount ELSE 0 END), 0) as today_withdrawals,
            COALESCE(SUM(CASE WHEN type = 'Loan' THEN amount ELSE 0 END), 0) as today_loans,
            COALESCE(SUM(CASE WHEN type IN ('Commission', 'Service Fee', 'Interest', 'Other Income') THEN amount ELSE 0 END), 0) as today_revenue
        FROM transactions
        WHERE (p_employee_id IS NULL OR staff_id = p_employee_id)
          AND status NOT IN ('rejected', 'denied')
          AND created_at >= today_start
    ),
    staff_perf AS (
        SELECT 
            e.first_name || ' ' || e.last_name as name,
            COALESCE(SUM(CASE WHEN t.created_at >= today_start THEN t.amount ELSE 0 END), 0) as today,
            COALESCE(SUM(CASE WHEN t.created_at >= week_start THEN t.amount ELSE 0 END), 0) as week,
            COALESCE(SUM(CASE WHEN t.created_at >= month_start THEN t.amount ELSE 0 END), 0) as month
        FROM transactions t
        JOIN staff e ON t.staff_id = e.id
        WHERE t.status NOT IN ('rejected', 'denied')
          AND (p_employee_id IS NULL OR t.staff_id = p_employee_id)
        GROUP BY name
    )
    SELECT json_build_object(
        'customers', (SELECT count(*) FROM customers WHERE (p_employee_id IS NULL OR added_by = p_employee_id)),
        'employees', (SELECT count(*) FROM staff),
        'branches', (SELECT count(*) FROM branches),
        'transactions', (SELECT count(*) FROM transactions WHERE (p_employee_id IS NULL OR staff_id = p_employee_id)),
        'financials', (
            SELECT json_build_object(
                'deposits', json_build_object('today', t.today_deposits, 'month', m.month_deposits, 'total', l.total_deposits),
                'withdrawals', json_build_object('today', t.today_withdrawals, 'month', m.month_withdrawals, 'total', l.total_withdrawals),
                'loans', json_build_object('today', t.today_loans, 'month', m.month_loans, 'total', l.total_loans),
                'revenue', json_build_object('today', t.today_revenue, 'month', m.month_revenue, 'total', l.total_revenue)
            ) FROM today_stats t, monthly_stats m, lifetime_stats l
        ),
        'staffPerformance', (SELECT COALESCE(json_agg(json_build_object('name', name, 'today', today, 'week', week, 'month', month)), '[]'::json) FROM staff_perf)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Specialized function for transaction ledger aggregates
CREATE OR REPLACE FUNCTION get_transaction_aggregates(
    p_type TEXT DEFAULT NULL, 
    p_employee_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- For Loans, we need extra logic for 'payable' vs 'paid'
    IF p_type = 'Loan' OR p_type = 'Loan Payment' THEN
        SELECT json_build_object(
            'total_amount', COALESCE(SUM(CASE WHEN type = p_type AND status NOT IN ('rejected', 'denied', 'failed') THEN amount ELSE 0 END), 0),
            'count', COUNT(*) FILTER (WHERE type = p_type),
            'payable', COALESCE(SUM(CASE WHEN type = 'Loan' AND status NOT IN ('rejected', 'denied', 'failed') THEN amount ELSE 0 END), 0),
            'paid', COALESCE(SUM(CASE WHEN type = 'Loan Payment' AND status NOT IN ('rejected', 'denied', 'failed') THEN amount ELSE 0 END), 0),
            'approved_count', COUNT(*) FILTER (WHERE type = p_type AND status IN ('approved', 'ok', 'completed', 'sent')),
            'rejected_count', COUNT(*) FILTER (WHERE type = p_type AND status IN ('rejected', 'denied', 'failed'))
        ) INTO result
        FROM transactions
        WHERE (p_employee_id IS NULL OR staff_id = p_employee_id)
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date);
    ELSE
        SELECT json_build_object(
            'total_amount', COALESCE(SUM(amount), 0),
            'count', COUNT(*),
            'approved_count', COUNT(*) FILTER (WHERE status IN ('approved', 'ok', 'completed', 'sent')),
            'rejected_count', COUNT(*) FILTER (WHERE status IN ('rejected', 'denied', 'failed'))
        ) INTO result
        FROM transactions
        WHERE (
            p_type IS NULL 
            OR (p_type = 'REVENUE' AND type IN ('Commission', 'Service Fee', 'Interest', 'Other Income'))
            OR type = p_type
          )
          AND (p_employee_id IS NULL OR staff_id = p_employee_id)
          AND status NOT IN ('rejected', 'denied', 'failed')
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date);
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Time-series aggregation for reports/charts
CREATE OR REPLACE FUNCTION get_daily_aggregates(p_days INTEGER DEFAULT 30, p_employee_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(t) INTO result
    FROM (
        SELECT 
            date_trunc('day', created_at)::date as day,
            COALESCE(SUM(CASE WHEN type = 'Deposit' THEN amount ELSE 0 END), 0) as deposit,
            COALESCE(SUM(CASE WHEN type = 'Withdrawal' THEN amount ELSE 0 END), 0) as withdrawal,
            COALESCE(SUM(CASE WHEN type = 'Loan' THEN amount ELSE 0 END), 0) as loan,
            COALESCE(SUM(CASE WHEN type IN ('Commission', 'Service Fee', 'Interest', 'Other Income') THEN amount ELSE 0 END), 0) as commission
        FROM transactions
        WHERE created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
          AND (p_employee_id IS NULL OR staff_id = p_employee_id)
          AND status NOT IN ('rejected', 'denied', 'failed')
        GROUP BY day
        ORDER BY day ASC
    ) t;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
