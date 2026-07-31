-- Fix Historical Bank Balance
-- Creates journal entries for ALL verified customer payments missing them
-- and updates the CBE bank account balance accordingly.
--
-- Run: docker exec -i samaria_db psql -U samaria -d samaria_erp < prisma/migrations/fix_historical_bank_balance.sql

DO $$
DECLARE
    v_bank_account_id TEXT;
    v_ar_account_id TEXT;
    v_bank_acct_id TEXT;
    v_payment RECORD;
    v_voucher_seq INT;
    v_voucher_no TEXT;
    v_total_fixed NUMERIC := 0;
    v_count INT := 0;
BEGIN
    -- Get chart of account IDs
    SELECT id INTO v_bank_account_id FROM chart_of_accounts WHERE "accountCode" = '1020' LIMIT 1;
    SELECT id INTO v_ar_account_id FROM chart_of_accounts WHERE "accountCode" = '1030' LIMIT 1;

    IF v_bank_account_id IS NULL THEN
        RAISE NOTICE 'Bank account (1020) not found in chart_of_accounts. Skipping.';
        RETURN;
    END IF;

    IF v_ar_account_id IS NULL THEN
        RAISE NOTICE 'Accounts Receivable account (1030) not found in chart_of_accounts. Skipping.';
        RETURN;
    END IF;

    -- Get bank account ID for balance update
    SELECT id INTO v_bank_acct_id FROM bank_accounts WHERE "accountNo" = '1000639115554' LIMIT 1;

    -- Get the current max voucher sequence number
    SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace("voucherNo", '[^0-9]', '', 'g'), '') AS INT)), 0)
    INTO v_voucher_seq
    FROM journal_entries;

    RAISE NOTICE 'Starting voucher sequence from: %', v_voucher_seq;
    RAISE NOTICE 'Bank account (1020) ID: %', v_bank_account_id;
    RAISE NOTICE 'AR account (1030) ID: %', v_ar_account_id;
    RAISE NOTICE 'CBE bank account ID: %', v_bank_acct_id;

    -- Loop through verified customer payments that don't have journal entries yet
    FOR v_payment IN
        SELECT cp.id, cp."receiptNo", cp.amount, cp."paymentDate"
        FROM customer_payments cp
        WHERE cp.status = 'Verified'
        AND NOT EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je."refModule" = 'CUSTOMER_PAYMENT' AND je."refId" = cp.id
        )
        ORDER BY cp."paymentDate" ASC
    LOOP
        v_voucher_seq := v_voucher_seq + 1;
        v_voucher_no := 'JV-' || LPAD(v_voucher_seq::TEXT, 7, '0');

        -- Create debit entry (Bank) — NO createdAt column in journal_entries
        INSERT INTO journal_entries (
            id, "voucherNo", "accountId", debit, credit, description,
            "entryDate", "refModule", "refId", "postedBy"
        ) VALUES (
            gen_random_uuid()::TEXT, v_voucher_no, v_bank_account_id,
            v_payment.amount, 0,
            'Historical fix: Customer payment ' || COALESCE(v_payment."receiptNo", 'N/A'),
            COALESCE(v_payment."paymentDate", NOW()),
            'CUSTOMER_PAYMENT', v_payment.id, 'system'
        );

        v_voucher_seq := v_voucher_seq + 1;
        v_voucher_no := 'JV-' || LPAD(v_voucher_seq::TEXT, 7, '0');

        -- Create credit entry (Accounts Receivable)
        INSERT INTO journal_entries (
            id, "voucherNo", "accountId", debit, credit, description,
            "entryDate", "refModule", "refId", "postedBy"
        ) VALUES (
            gen_random_uuid()::TEXT, v_voucher_no, v_ar_account_id,
            0, v_payment.amount,
            'Historical fix: Customer payment ' || COALESCE(v_payment."receiptNo", 'N/A'),
            COALESCE(v_payment."paymentDate", NOW()),
            'CUSTOMER_PAYMENT', v_payment.id, 'system'
        );

        v_total_fixed := v_total_fixed + v_payment.amount;
        v_count := v_count + 1;

        RAISE NOTICE 'Fixed payment % (%) — ETB %', v_payment."receiptNo", v_payment.id, v_payment.amount;
    END LOOP;

    -- Update bank account balance with total of all fixed payments
    IF v_bank_acct_id IS NOT NULL AND v_total_fixed > 0 THEN
        UPDATE bank_accounts SET balance = balance + v_total_fixed WHERE id = v_bank_acct_id;
        RAISE NOTICE '-------------------------------------------';
        RAISE NOTICE 'Updated CBE bank balance by ETB %', v_total_fixed;
    END IF;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'DONE: Fixed % verified payments, total ETB %', v_count, v_total_fixed;
    RAISE NOTICE '===========================================';
END $$;

-- Verification queries
SELECT 'Bank Balance (1020) from journal entries' as metric,
       SUM(debit) - SUM(credit) as balance
FROM journal_entries je
JOIN chart_of_accounts coa ON je."accountId" = coa.id
WHERE coa."accountCode" = '1020';

SELECT 'CBE Bank Account stored balance' as metric, balance
FROM bank_accounts WHERE "accountNo" = '1000639115554';

SELECT 'Total verified customer payments' as metric,
       COUNT(*) as count, SUM(amount) as total
FROM customer_payments WHERE status = 'Verified';

SELECT 'Journal entries for customer payments' as metric,
       COUNT(*) as count
FROM journal_entries WHERE "refModule" = 'CUSTOMER_PAYMENT';
