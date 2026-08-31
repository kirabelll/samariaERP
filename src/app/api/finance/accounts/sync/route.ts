import { NextRequest, NextResponse } from 'next/server';
import { syncAllSubledgerAccounts } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const result = await syncAllSubledgerAccounts();
    return NextResponse.json({
      success: true,
      message: `Successfully linked ${result.syncedCustomers} customers, ${result.syncedSuppliers} suppliers, and ${result.syncedBanks} bank accounts to the Chart of Accounts.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error syncing subledger accounts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const result = await syncAllSubledgerAccounts();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error checking subledger sync status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
