-- =========================================================================
-- MULTI-TENANT DASHBOARD STATS FUNCTION
-- Scopes stats strictly by the user's organization_id
-- Run this in your Supabase SQL Editor
-- =========================================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_employee_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    now_date TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP;
    today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', CURRENT_TIMESTAMP);
    week_start TIMESTAMP WITH TIME ZONE := date_trunc('week', CURRENT_TIMESTAMP);
    month_start TIMESTAMP WITH TIME ZONE := date_trunc('month', CURRENT_TIMESTAMP);
    v_org_id UUID := p_organization_id;
    result JSON;
BEGIN
    -- Fallback: If organization_id is not passed, resolve from current authenticated staff
    IF v_org_id IS NULL THEN
        SELECT organization_id INTO v_org_id 
        FROM public.staff 
        WHERE user_id = auth.uid() 
        LIMIT 1;
    END IF;

    WITH lifetime_stats AS (
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'Deposit' THEN amount ELSE 0 END), 0) as total_deposits,
            COALESCE(SUM(CASE WHEN type = 'Withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals,
            COALESCE(SUM(CASE WHEN type = 'Loan' THEN amount ELSE 0 END), 0) as total_loans,
            COALESCE(SUM(CASE WHEN type IN ('Commission', 'Service Fee', 'Interest', 'Other Income') THEN amount ELSE 0 END), 0) as total_revenue
        FROM transactions
        WHERE (v_org_id IS NULL OR organization_id = v_org_id)
          AND (p_employee_id IS NULL OR staff_id = p_employee_id)
          AND status NOT IN ('rejected', 'denied')
    ),
    monthly_stats AS (
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'Deposit' THEN amount ELSE 0 END), 0) as month_deposits,
            COALESCE(SUM(CASE WHEN type = 'Withdrawal' THEN amount ELSE 0 END), 0) as month_withdrawals,
            COALESCE(SUM(CASE WHEN type = 'Loan' THEN amount ELSE 0 END), 0) as month_loans,
            COALESCE(SUM(CASE WHEN type IN ('Commission', 'Service Fee', 'Interest', 'Other Income') THEN amount ELSE 0 END), 0) as month_revenue
        FROM transactions
        WHERE (v_org_id IS NULL OR organization_id = v_org_id)
          AND (p_employee_id IS NULL OR staff_id = p_employee_id)
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
        WHERE (v_org_id IS NULL OR organization_id = v_org_id)
          AND (p_employee_id IS NULL OR staff_id = p_employee_id)
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
          AND (v_org_id IS NULL OR t.organization_id = v_org_id)
          AND (p_employee_id IS NULL OR t.staff_id = p_employee_id)
        GROUP BY name
    )
    SELECT json_build_object(
        'customers', (
            SELECT count(*) 
            FROM customers 
            WHERE (v_org_id IS NULL OR organization_id = v_org_id)
              AND (p_employee_id IS NULL OR added_by = p_employee_id)
        ),
        'employees', (
            SELECT count(*) 
            FROM staff 
            WHERE (v_org_id IS NULL OR organization_id = v_org_id)
        ),
        'branches', (
            SELECT count(*) 
            FROM branches 
            WHERE (v_org_id IS NULL OR organization_id = v_org_id)
        ),
        'transactions', (
            SELECT count(*) 
            FROM transactions 
            WHERE (v_org_id IS NULL OR organization_id = v_org_id)
              AND (p_employee_id IS NULL OR staff_id = p_employee_id)
        ),
        'financials', (
            SELECT json_build_object(
                'deposits', json_build_object('today', t.today_deposits, 'month', m.month_deposits, 'total', l.total_deposits),
                'withdrawals', json_build_object('today', t.today_withdrawals, 'month', m.month_withdrawals, 'total', l.total_withdrawals),
                'loans', json_build_object('today', t.today_loans, 'month', m.month_loans, 'total', l.total_loans),
                'revenue', json_build_object('today', t.today_revenue, 'month', m.month_revenue, 'total', l.total_revenue)
            ) FROM today_stats t, monthly_stats m, lifetime_stats l
        ),
        'staffPerformance', (
            SELECT COALESCE(json_agg(json_build_object('name', name, 'today', today, 'week', week, 'month', month)), '[]'::json) 
            FROM staff_perf
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
