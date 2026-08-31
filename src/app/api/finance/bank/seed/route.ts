import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureBankAccount, journalBankTransaction } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export const STANDARD_ETHIOPIAN_BANKS = [
  { bankName: 'Commercial Bank of Ethiopia', accountNo: '1000100100', accountName: 'Samaria Trading PLC - CBE Main', branch: 'Addis Ababa Main', balance: 500000 },
  { bankName: 'Cooperative Bank of Oromia', accountNo: '1020200200', accountName: 'Samaria Trading PLC - Coop', branch: 'Finfinne Branch', balance: 250000 },
  { bankName: 'Awash Bank', accountNo: '0132003003', accountName: 'Samaria Trading PLC - Awash', branch: 'Bole Branch', balance: 350000 },
  { bankName: 'Bank of Abyssinia', accountNo: '1040400400', accountName: 'Samaria Trading PLC - BOA', branch: 'Meskel Square', balance: 200000 },
  { bankName: 'Dashen Bank', accountNo: '5050500500', accountName: 'Samaria Trading PLC - Dashen', branch: 'Kazanchis Branch', balance: 150000 },
  { bankName: 'Hibret Bank', accountNo: '6060600600', accountName: 'Samaria Trading PLC - Hibret', branch: 'Head Office', balance: 100000 },
  { bankName: 'Nib International Bank', accountNo: '7070700700', accountName: 'Samaria Trading PLC - NIB', branch: 'Arat Kilo', balance: 100000 },
  { bankName: 'Telebirr', accountNo: '0911000000', accountName: 'Samaria Trading PLC - Merchant', branch: 'Ethio Telecom', balance: 50000 },
];

export async function POST(request: NextRequest) {
  try {
    const results = [];

    for (const b of STANDARD_ETHIOPIAN_BANKS) {
      let bank = await prisma.bankAccount.findFirst({
        where: {
          OR: [
            { accountNo: b.accountNo },
            { bankName: { equals: b.bankName, mode: 'insensitive' } },
          ],
        },
      });

      if (!bank) {
        bank = await prisma.bankAccount.create({
          data: {
            bankName: b.bankName,
            accountNo: b.accountNo,
            accountName: b.accountName,
            branch: b.branch,
            currency: 'ETB',
            balance: b.balance,
            status: 'Active',
          },
        });

        // Create opening transaction & journal entry
        if (b.balance > 0) {
          const initTxn = await prisma.bankTransaction.create({
            data: {
              bankAccountId: bank.id,
              type: 'deposit',
              amount: b.balance,
              refNo: 'INIT-' + bank.accountNo,
              description: 'Initial Opening Balance',
              refModule: 'INITIAL_BALANCE',
              reconStatus: 'Reconciled',
            },
          });

          try {
            await journalBankTransaction(initTxn);
          } catch (jErr) {
            console.warn('Auto journal for bank seed failed:', jErr);
          }
        }
      }

      // Link child account in Chart of Accounts
      try {
        await ensureBankAccount(bank);
      } catch (coaErr) {
        console.warn(`Could not link COA for ${bank.bankName}:`, coaErr);
      }

      results.push(bank);
    }

    return NextResponse.json({
      success: true,
      message: `Configured ${results.length} Ethiopian Bank Accounts in System and Chart of Accounts`,
      data: results,
    });
  } catch (error: any) {
    console.error('Error seeding bank accounts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
